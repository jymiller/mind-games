// Creates a real supersession chain in the domain corpus, so Scene 5 has lineage to render.
//
// Why this is needed: the original corpus was ingested document-by-document, which produced
// the certified figure and the restated figure as two SEPARATE active facts. That reads fine
// but it is not a revision chain — GET /v1/memories/{id}/revisions returns a single node.
//
// The recipe that fires supersession: ingest the SAME canonical sentence with a NEW VALUE.
// Amendment-style narrative ("under the amendment it is increased to...") reads as a new
// fact and does not supersede.
//
//   node scripts/build-chain.mjs           # ingest both sides, then show the chain
//   node scripts/build-chain.mjs --verify  # only show the chain that exists now
import { ingest, listMemories, getRevisions, search, deleteMemory, DOMAIN_SCOPE } from "../src/xtrace.js";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// One canonical sentence, two values. The wording either side of the number is identical —
// that is what lets the platform recognise the second as a revision of the first.
const CANON = (value) =>
  `Thornwick Logistics Holdings Limited's LTM Adjusted EBITDA for the twelve months ended 31 March 2026 is ${value}.`;

const STEPS = [
  { conv_id: "thornwick-chain-01-certified", value: "£34.0m",
    assistant: "Recorded: Thornwick LTM Adjusted EBITDA to 31 March 2026 is £34.0m, as certified." },
  { conv_id: "thornwick-chain-02-restated", value: "£29.0m",
    assistant: "Recorded: Thornwick LTM Adjusted EBITDA to 31 March 2026 is £29.0m, restated by the FY2025 audit." },
];

// Order is everything: the OLD value must be extracted and visible BEFORE the new value is
// ingested, or there is nothing for the platform to supersede and you just get two active
// facts. Extraction is slow and lumpy, so wait on the VALUE, not merely on the conv_id.
async function settleValue(value, maxMs = 150000) {
  const deadline = Date.now() + maxMs;
  while (Date.now() < deadline) {
    await sleep(3000);
    const rows = await listMemories({ ...DOMAIN_SCOPE, limit: 200 });
    const hit = (rows.data ?? []).filter(
      (m) => /LTM Adjusted EBITDA for the twelve months ended/i.test(m.text || "") && (m.text || "").includes(value),
    );
    if (hit.length) return hit;
  }
  return [];
}

async function purgeChain() {
  const rows = await listMemories({ ...DOMAIN_SCOPE, limit: 200 });
  const doomed = (rows.data ?? []).filter((m) => /thornwick-chain/.test(m.conv_id || ""));
  for (const m of doomed) {
    await deleteMemory(m.id);
    console.log(`purged ${m.id} :: ${(m.text || "").slice(0, 70)}`);
  }
  if (doomed.length) await sleep(3000);
}

async function seed() {
  await purgeChain();
  for (const s of STEPS) {
    const body = {
      ...DOMAIN_SCOPE,
      conv_id: s.conv_id,
      messages: [
        { role: "user", content: CANON(s.value) },
        { role: "assistant", content: s.assistant },
      ],
    };
    if (!body.user_id || !body.app_id) throw new Error("unscoped write blocked");
    process.stdout.write(`ingest ${s.conv_id} (${s.value}) ... `);
    const job = await ingest(body);
    console.log(`accepted (job ${job.id ?? job.job_id ?? "?"})`);
    if (job?.result?.memories_superseded_by) {
      console.log("  memories_superseded_by:", JSON.stringify(job.result.memories_superseded_by));
    }
    const rows = await settleValue(s.value);
    if (!rows.length) throw new Error(`${s.value} never became visible — aborting rather than ingesting the next value out of order`);
    console.log(`  settled: ${s.value} is visible (${rows.length} row(s))`);
  }
}

async function showChain() {
  const r = await search({ ...DOMAIN_SCOPE, query: CANON("£29.0m"), limit: 8, mode: "retrieve" });
  const rows = r?.data ?? [];
  const target =
    rows.find((m) => /LTM Adjusted EBITDA for the twelve months ended 31 March 2026/i.test(m.text || "")) || rows[0];
  if (!target) {
    console.log("\nno matching memory found");
    return 0;
  }
  console.log(`\nwalking revisions of ${target.id}\n  "${target.text}"`);
  const chain = await getRevisions(target.id);
  const nodes = chain?.data ?? [];
  console.log(`\nCHAIN LENGTH: ${nodes.length}`);
  for (const n of nodes) {
    const d = n.details ?? n;
    console.log(`  [${d.status ?? "?"}] ${n.text ?? d.text}`);
    if (d.supersedes) console.log(`     supersedes: ${d.supersedes}`);
  }
  return nodes.length;
}

if (!process.argv.includes("--verify")) await seed();
const n = await showChain();
console.log(n > 1 ? "\nSUPERSESSION FIRED - Scene 5 has lineage to render." : "\nNo multi-node chain yet.");
