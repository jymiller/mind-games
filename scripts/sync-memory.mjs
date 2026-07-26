// Push the source of truth into memory, and detect revisions on the way.
//
//   npm run memory:sync            # sync anything new or changed
//   npm run memory:sync -- --reset # wipe the eval scope first, then sync from scratch
//
// The detector is a unique constraint, not a heuristic. Each fact carries a fact_key naming
// the MEASUREMENT and a value_text holding its VALUE. If a key already has a live row with a
// different value, the database has revised itself: the old row is marked superseded and the
// new value is ingested. No model call, no phrasing luck, no dependence on the extractor
// noticing — which is what defeated four attempts during the hackathon.
import { q, one, close, factsForSync } from "../src/db.js";
import { ingest, listMemories, deleteMemory, EVAL_SCOPE } from "../src/xtrace.js";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const reset = process.argv.includes("--reset");

async function purgeEvalScope() {
  const rows = await listMemories({ ...EVAL_SCOPE, limit: 300 });
  const doomed = rows.data ?? [];
  for (const m of doomed) await deleteMemory(m.id);
  await q(`truncate memory_sync restart identity`);
  console.log(`reset: removed ${doomed.length} memory row(s) and cleared memory_sync\n`);
}

async function ingestFact(f) {
  const body = {
    ...EVAL_SCOPE,
    conv_id: "sot:" + f.fact_key,
    messages: [
      { role: "user", content: f.fact_text },
      { role: "assistant", content: `Recorded from the system of record: ${f.fact_text}` },
    ],
  };
  if (!body.user_id || !body.app_id) throw new Error("unscoped write blocked");
  const job = await ingest(body);
  const created = job?.result?.memories_created ?? [];
  return created[0]?.id ?? null;
}

const facts = await factsForSync();
console.log(`source of truth holds ${facts.length} fact(s)\n`);
if (reset) await purgeEvalScope();

let added = 0, revised = 0, unchanged = 0, failed = 0;

for (const f of facts) {
  const live = await one(
    `select * from memory_sync where fact_key = $1 and status = 'live' order by id desc limit 1`,
    [f.fact_key],
  );

  if (live && live.value_text === f.value_text) { unchanged++; continue; }

  const isRevision = Boolean(live);
  let memId = null, error = null;
  try {
    memId = await ingestFact(f);
  } catch (e) {
    error = String(e.message).slice(0, 300);
    failed++;
  }

  const row = await one(
    `insert into memory_sync (fact_key, value_text, fact_text, source_table, source_id,
                              xtrace_memory_id, status, supersedes, error, synced_at)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9, now())
     on conflict (fact_key, value_text) do update
       set status = excluded.status, xtrace_memory_id = excluded.xtrace_memory_id,
           error = excluded.error, synced_at = now()
     returning id`,
    [f.fact_key, f.value_text, f.fact_text, f.source_table, f.source_id,
     memId, error ? "failed" : "live", live ? live.id : null, error],
  );

  if (isRevision && !error) {
    await q(`update memory_sync set status = 'superseded' where id = $1`, [live.id]);
    revised++;
    console.log(`REVISED  ${f.fact_key}`);
    console.log(`         ${live.value_text}  ->  ${f.value_text}   (sync row ${live.id} -> ${row.id})`);
  } else if (!error) {
    added++;
    console.log(`added    ${f.fact_key} = ${f.value_text}`);
  } else {
    console.log(`FAILED   ${f.fact_key}: ${error}`);
  }
  await sleep(400); // stay well inside the rate limit
}

console.log(`\nadded ${added} · revised ${revised} · unchanged ${unchanged} · failed ${failed}`);

// Extraction is asynchronous, so wait for the corpus to settle before anyone evaluates it.
if (added || revised) {
  process.stdout.write("waiting for extraction to settle ");
  let last = -1, stable = 0;
  for (let i = 0; i < 40 && stable < 3; i++) {
    await sleep(3000);
    // The API returns the occasional 502. A transient upstream blip is not a result, so it
    // is retried rather than allowed to end the run.
    let n;
    try {
      const rows = await listMemories({ ...EVAL_SCOPE, limit: 200 });
      n = (rows.data ?? []).length;
    } catch {
      process.stdout.write("!");
      continue;
    }
    stable = n === last ? stable + 1 : 0;
    last = n;
    process.stdout.write(".");
  }
  console.log(`\nmemory now holds ${last} row(s) in the eval scope`);
}

await close();
