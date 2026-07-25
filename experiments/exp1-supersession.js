// Exp 1 — CRITICAL PATH. Does a restatement supersede the old fact WITH lineage?
// This is the greenlight gate for the whole belief-revision demo (Beat 3).
// Teaches: the belief-revision engine + the HTTP-only /revisions endpoint.
// Run: npm run exp1
import { requireClient, ingestWait, firstCreatedId, hd, PASS, FAIL, LOOK } from "./_lib.js";
import { getRevisions } from "../src/xtrace-http.js";
requireClient();

async function runCase(label, a, b, opts = {}) {
  hd(`Exp 1 — ${label}`);
  const user_id = `exp1-${label.replace(/\W+/g, "").toLowerCase()}`;
  const conv_id = "exp1";
  const jobA = await ingestWait({ messages: [{ role: "user", content: a }], user_id, conv_id, ...opts });
  const oldId = firstCreatedId(jobA);
  console.log(`  A ingested -> old_id=${oldId}`);

  const jobB = await ingestWait({ messages: [{ role: "user", content: b }], user_id, conv_id, ...opts });
  const supMap = jobB.result?.memories_superseded_by ?? {};
  console.log(`  B ingested -> memories_superseded_by=${JSON.stringify(supMap)}`);

  const superseded = oldId && (supMap[oldId] || Object.keys(supMap).length > 0);
  if (superseded) PASS("restatement produced a supersede mapping");
  else FAIL("no supersession detected — the extractor did not read B as a contradiction of A");

  if (oldId) {
    try {
      const chain = await getRevisions(oldId);
      const rows = chain.data ?? chain;
      console.log(`  /revisions chain (${Array.isArray(rows) ? rows.length : "?"} nodes, oldest->newest):`);
      (Array.isArray(rows) ? rows : []).forEach((r, i) =>
        console.log(`    ${i}. [${r.details?.status ?? r.status ?? "?"}] ${(r.text || "").slice(0, 60)} (id=${r.id})`),
      );
      if (Array.isArray(rows) && rows.length >= 2) PASS("walkable lineage chain returned — demo-able on screen");
      else LOOK("chain has <2 nodes — inspect; supersession may not have linked");
    } catch (e) {
      FAIL(`/revisions call failed: ${e.message} (check base URL / auth / path)`);
    }
  }
}

// Numeric restatement (should trigger). Then the harder legal-amendment phrasing.
await runCase("numeric", "Deal Alpha Q2 EBITDA is $4.2M.", "Correction: Deal Alpha Q2 EBITDA was restated to $3.8M in the amended financials.");
await runCase("legal-default", "Deal Alpha max total net leverage is 3.5x.", "Under the First Amendment, Deal Alpha's maximum total net leverage ratio is increased to 4.0x.");
await runCase("legal-agentic", "Deal Alpha max total net leverage is 3.5x.", "Under the First Amendment, Deal Alpha's maximum total net leverage ratio is increased to 4.0x.", { agentic: true });

console.log("\nGREENLIGHT: numeric must PASS. Record which legal variant (default vs agentic) supersedes — the demo script uses that phrasing.");
