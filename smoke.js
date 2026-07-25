// Verifies the XTrace key works and that the domain corpus is reachable.
// Run: npm run smoke   (after pasting XTRACE_API_KEY into .env)
//
// READ-ONLY on purpose: it searches, it never ingests. Nothing this script does can
// change the demo corpus. Note that /v1/usage counters lag badly and read 0 while
// memories are live, so search is the only trustworthy proof of ingestion.
import { loadEnv, searchDomain, DOMAIN_SCOPE } from "./src/xtrace.js";

const env = loadEnv();
if (!env.XTRACE_API_KEY) {
  console.log("⚠  No XTrace credentials found.");
  console.log("   cp .env.example .env  then paste XTRACE_API_KEY.");
  console.log("   (XTRACE_ORG_ID is no longer used — the REST API infers the org from the key.)");
  process.exit(0);
}

const CHECKS = [
  { q: "Thornwick maximum Total Net Leverage covenant threshold", want: /6\.50/ },
  { q: "Thornwick restated LTM Adjusted EBITDA at 31 March 2026", want: /29\.0/ },
  { q: "Thornwick restated Total Net Leverage at 31 March 2026", want: /7\.59/ },
];

let fail = 0;
console.log(`→ searching domain scope ${JSON.stringify(DOMAIN_SCOPE)}\n`);
for (const c of CHECKS) {
  try {
    const r = await searchDomain(c.q, 5);
    const rows = r?.data ?? [];
    const hit = rows.find((m) => c.want.test(m.text || ""));
    if (hit) {
      console.log(`✓ [${(hit.score ?? 0).toFixed(3)}] ${hit.text.slice(0, 96)}`);
    } else {
      fail++;
      console.log(`✗ no row matching ${c.want} for "${c.q}" (${rows.length} rows returned)`);
    }
  } catch (e) {
    fail++;
    console.log(`✗ ${c.q} — ${e.message}`);
  }
}

// The leak check: build/dev memory must never be reachable from the domain scope.
for (const term of ["render.yaml", "feature freeze"]) {
  const r = await searchDomain(term, 5).catch(() => null);
  const hits = (r?.data ?? []).filter((m) => (m.text || "").toLowerCase().includes(term));
  if (hits.length) { fail++; console.log(`✗ LEAK: "${term}" appears in the domain scope`); }
  else console.log(`✓ no "${term}" in the domain scope`);
}

console.log(fail ? `\n${fail} CHECK(S) FAILED` : "\nXTrace is live and the domain corpus is intact.");
process.exit(fail ? 1 : 0);
