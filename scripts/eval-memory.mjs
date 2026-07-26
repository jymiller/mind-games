// FORMAL EVALUATION — can the memory return the value the system of record currently holds?
//
//   npm run eval
//
// PROTOCOL (see EVAL.md; changing any of this invalidates comparison with earlier runs)
//
//   Population   every measurement the database has synced to memory (memory_sync).
//   Probe        one search per measurement, in the eval scope only, phrased from the
//                measurement's own identity — never from the stored sentence, so the probe
//                cannot smuggle the answer in.
//   Expected     the value the database holds NOW.
//   Superseded   every earlier value the database held for that same measurement.
//   Scoring      deterministic string matching on the value. No model judges this, so the
//                same corpus scores the same way twice.
//
//   correct        expected value present, no superseded value present
//   stale          a superseded value present, expected absent
//   contradictory  both present — memory is holding two answers to one question
//   not_stored     the fact never reached memory at all (ingest-side loss)
//   wrong          the fact IS in memory, but the probe returned something else
//   absent         no rows came back at all
//
// not_stored and wrong are separated deliberately. They look identical from the outside and
// have completely different causes: one is a retention failure at write time, the other a
// retrieval failure at read time. Collapsing them would hide which half is broken.
//
// 'contradictory' is the interesting outcome and the reason the eval exists: a memory that
// cannot retire a fact will answer a question two ways and let the reader pick.
import { execSync } from "node:child_process";
import { q, one, close } from "../src/db.js";
import { searchScope, listMemories, EVAL_SCOPE } from "../src/xtrace.js";

const MODE = "compose";

const gitCommit = () => {
  try { return execSync("git rev-parse --short HEAD", { encoding: "utf8" }).trim(); }
  catch { return null; }
};

// A number can be written several ways; all of them count as the same value.
function valuePatterns(value) {
  const pats = [];
  const num = value.match(/^-?\d+(?:\.\d+)?$/) ? Number(value) : null;
  if (num !== null) {
    const one = num.toFixed(1), two = num.toFixed(2), plain = String(num);
    for (const v of new Set([one, two, plain, String(Math.round(num))])) {
      pats.push(new RegExp(`(?<![\\d.])${v.replace(".", "\\.")}(?![\\d])`));
    }
  } else {
    // e.g. '7.59 BREACH' — both halves must appear
    const parts = value.split(/\s+/).filter(Boolean);
    pats.push(new RegExp(parts.map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("[\\s\\S]{0,80}"), "i"));
  }
  return pats;
}
const contains = (text, value) => valuePatterns(value).some((re) => re.test(text));

// The question is built from the measurement's identity, never from the sentence stored in
// memory. Otherwise the probe would be handing memory the answer.
function questionFor(factKey, legalName) {
  const [, kind, when] = factKey.split(":");
  switch (kind) {
    case "ebitda":
      return `What is ${legalName}'s Adjusted EBITDA for the Test Date ${when}?`;
    case "certified_ebitda":
      return `What Adjusted EBITDA did ${legalName} certify for the Test Date ${when}?`;
    case "net_debt":
      return `What was ${legalName}'s Total Net Debt at the Test Date ${when}?`;
    case "verdict":
      return `What is ${legalName}'s Total Net Leverage at the Test Date ${when}, and is it compliant?`;
    case "leverage_cap":
      return `What Total Net Leverage limit applies to ${legalName} for Test Dates from ${when}?`;
    default:
      return `What does the record show for ${legalName}, ${kind}, ${when}?`;
  }
}

const NAMES = Object.fromEntries((await q(`select id, legal_name from borrower`)).map((b) => [b.id, b.legal_name]));

// One listing of the whole eval corpus, so each probe can tell 'never stored' from
// 'stored but not returned' without another API call per fact.
let corpusText = "";
try {
  const all = await listMemories({ ...EVAL_SCOPE, limit: 200 });
  corpusText = (all.data ?? []).map((m) => m.text || "").join("\n");
} catch (e) {
  console.log("warning: could not list the eval corpus, so not_stored cannot be distinguished:", e.message);
}

// Population: current values, plus whatever they replaced.
const population = await q(`
  select ms.fact_key,
         ms.value_text as expected,
         left(ms.fact_text, 46) as fact_text_head,
         (select string_agg(old.value_text, ' | ')
            from memory_sync old
           where old.fact_key = ms.fact_key and old.status = 'superseded') as superseded
  from memory_sync ms
  where ms.status = 'live'
  order by ms.fact_key
`);

const corpus = await one(`select count(*)::int as n from memory_sync where status = 'live'`);
const run = await one(
  `insert into eval_run (git_commit, scope, search_mode, corpus_facts, notes)
   values ($1,$2,$3,$4,$5) returning id, started_at`,
  [gitCommit(), `${EVAL_SCOPE.user_id}/${EVAL_SCOPE.app_id}`, MODE, corpus.n,
   "basic retention/staleness probe, one search per measurement"],
);

console.log(`eval run ${run.id} · ${population.length} probe(s) · scope ${EVAL_SCOPE.app_id} · mode ${MODE}\n`);

const tally = { correct: 0, stale: 0, contradictory: 0, not_stored: 0, wrong: 0, absent: 0 };

for (const p of population) {
  const borrower = p.fact_key.split(":")[0];
  const question = questionFor(p.fact_key, NAMES[borrower] || borrower);

  let rows = [], context = "", err = null;
  try {
    const r = await searchScope(EVAL_SCOPE, question, 6, MODE);
    rows = r?.data ?? [];
    context = (r?.context || "") + "\n" + rows.map((m) => m.text || "").join("\n");
  } catch (e) {
    err = String(e.message).slice(0, 120);
  }

  const hasExpected = contains(context, p.expected);
  const olds = (p.superseded || "").split(" | ").filter(Boolean);
  const hasOld = olds.some((o) => contains(context, o));

  // Is the sentence in the corpus at all? Distinguishes a write failure from a read failure.
  const storedAtAll = corpusText ? corpusText.includes(p.fact_text_head) : true;

  let verdict;
  if (err || !rows.length) verdict = "absent";
  else if (hasExpected && hasOld) verdict = "contradictory";
  else if (hasExpected) verdict = "correct";
  else if (hasOld) verdict = "stale";
  else if (!storedAtAll) verdict = "not_stored";
  else verdict = "wrong";
  tally[verdict]++;

  await q(
    `insert into eval_result (run_id, fact_key, question, expected, superseded, verdict,
                              top_score, rows_returned, answer_excerpt)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    [run.id, p.fact_key, question, p.expected, p.superseded, verdict,
     rows[0]?.score ?? null, rows.length, (rows[0]?.text || err || "").slice(0, 300)],
  );

  const mark = { correct: "ok", stale: "STALE", contradictory: "BOTH", absent: "none",
                 not_stored: "NOTKEPT", wrong: "MISREAD" }[verdict];
  console.log(`${mark.padEnd(6)} ${p.fact_key.padEnd(42)} want ${String(p.expected).padEnd(14)}${p.superseded ? "was " + p.superseded : ""}`);
  await new Promise((r) => setTimeout(r, 250));
}

const memRows = null; // recorded by sync; not re-fetched here to keep the run deterministic
await q(
  `update eval_run set finished_at = now(), probes = $2, correct = $3, stale = $4,
      contradictory = $5, absent = $6, wrong = $7, memory_rows = $8 where id = $1`,
  [run.id, population.length, tally.correct, tally.stale, tally.contradictory, tally.absent,
   tally.wrong + tally.not_stored, memRows],
);

const pct = (n) => (population.length ? ((n / population.length) * 100).toFixed(0) + "%" : "—");
console.log(`\n=== RUN ${run.id} =====================================`);
console.log(`  probes          ${population.length}`);
console.log(`  correct         ${tally.correct}  (${pct(tally.correct)})`);
console.log(`  stale           ${tally.stale}  (${pct(tally.stale)})`);
console.log(`  contradictory   ${tally.contradictory}  (${pct(tally.contradictory)})`);
console.log(`  not stored      ${tally.not_stored}  (${pct(tally.not_stored)})   never reached memory`);
console.log(`  misread         ${tally.wrong}  (${pct(tally.wrong)})   in memory, wrong row returned`);
console.log(`  absent          ${tally.absent}  (${pct(tally.absent)})`);
console.log(`=================================================`);

await close();
