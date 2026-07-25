// Scene 5 "The Chain" — lineage, and an honest account of where it comes from.
//
// The storyboard wanted this driven by XTrace's own revision chain: old fact marked
// superseded, pointer to what replaced it. That is not what this corpus contains, and the
// page says so rather than implying otherwise.
//
// WHY (established by experiment, scripts/build-chain.mjs): supersession fires when the SAME
// canonical sentence is re-ingested with a NEW value. But the extractor will not store a
// fact whose value it already knows — every attempt to plant the "old" value was deduplicated
// against the certificate already in the corpus, on both borrowers. With no old node stored,
// nothing can supersede it, and GET /v1/memories/{id}/revisions returns a single node.
//
// So the lineage here is reconstructed from the DOCUMENTS — which is how the deal actually
// works — and every node carries the memory sentence it came from. The platform's own
// revision-chain result is queried live and reported as-is, however unimpressive.
import { searchDomain, getRevisions } from "./xtrace.js";
import { redact } from "./redact.js";

async function pull(query, re) {
  const r = await searchDomain(query, 8);
  for (const row of r?.data ?? []) {
    const m = (row.text || "").match(re);
    if (m) return { m, id: row.id, text: row.text, conv_id: row.conv_id, score: row.score };
  }
  return null;
}

export async function getChain() {
  const [certified, restatedRatio, restatedEbitda, driver, waiver] = await Promise.all([
    pull("Thornwick 31 March 2026 certified Total Net Leverage compliance certificate",
      /certified Total Net Leverage of ([\d.]+)x against a ([\d.]+)x limit/),
    pull("Thornwick restated Total Net Leverage at 31 March 2026",
      /restated Total Net Leverage at 31 March 2026 was ([\d.]+)x/),
    pull("Thornwick restated LTM Adjusted EBITDA at 31 March 2026",
      /restated Adjusted EBITDA for the LTM to 31 March 2026 was £([\d.]+)m/),
    pull("what did the Thornwick restatement remove from EBITDA",
      /removed £([\d.]+)m of EBITDA/),
    pull("Thornwick covenant breaches waived under Amendment and Waiver No. 1",
      /were subsequently waived and the covenant levels were reset under Amendment & Waiver No\. 1 dated ([^.]+)/),
  ]);

  const nodes = [];
  if (certified)
    nodes.push({ state: "superseded", when: "13 May 2026", headline: `Total Net Leverage ${certified.m[1]}× — COMPLIANT`,
      detail: `Certified by the borrower against a ${certified.m[2]}× limit.`, source: certified });
  if (driver)
    nodes.push({ state: "event", when: "3 July 2026", headline: `FY2025 audit removes £${driver.m[1]}m of EBITDA`,
      detail: "The audited accounts restate figures already certified to the lender.", source: driver });
  if (restatedEbitda)
    nodes.push({ state: "active", when: "3 July 2026", headline: `LTM Adjusted EBITDA restated to £${restatedEbitda.m[1]}m`,
      detail: "The input the compliance verdict depended on.", source: restatedEbitda });
  if (restatedRatio)
    nodes.push({ state: "active", when: "3 July 2026", headline: `Total Net Leverage ${restatedRatio.m[1]}× — BREACH`,
      detail: "Re-derived from the restated input. The certified verdict is now false.", source: restatedRatio });
  if (waiver)
    nodes.push({ state: "active", when: waiver.m[1].trim(), headline: "Breach waived, covenant levels reset",
      detail: "Amendment & Waiver No. 1 — the breach is resolved, not erased.", source: waiver });

  // Ask the platform for its own lineage on these memories and report exactly what it says.
  let platform = { checked: 0, maxNodes: 0, error: null };
  try {
    const ids = nodes.map((n) => n.source.id).filter(Boolean).slice(0, 4);
    let max = 0;
    for (const id of ids) {
      const chain = await getRevisions(id);
      max = Math.max(max, (chain?.data ?? []).length);
    }
    platform = { checked: ids.length, maxNodes: max, error: null };
  } catch (e) {
    platform = { checked: 0, maxNodes: 0, error: redact(e.message) };
  }

  return {
    label: nodes.length ? "LIVE LINEAGE" : "NO MEMORY",
    deal: "Thornwick Logistics Holdings Limited",
    nodes,
    platform,
    // Stated on the page. Not a footnote.
    caveat:
      "This lineage is reconstructed from the documents in memory, not from the platform's " +
      "revision chain. Re-ingesting a canonical fact to force supersession was tried on both " +
      "borrowers and failed: the extractor deduplicates a value it already holds, so no prior " +
      "node is ever stored for a later one to supersede.",
  };
}
