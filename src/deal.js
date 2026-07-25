// Scene 4 "The Flip" — the propagation engine.
//
// The point: the VERDICT is re-derived, not swapped. One assess() runs twice — once on
// the figures the borrower certified, once on the figures memory has since revised — and
// the compliance conclusion changes out from under the certificate.
//
//   certificate (a filed document, SYNTHETIC fixture)  ->  220.0 / 34.0 = 6.47x  COMPLIANT
//   memory       (XTrace domain scope, LIVE)            ->  220.0 / 29.0 = 7.59x  BREACH
//
// assess() knows nothing about Thornwick, and nothing here branches on a literal ratio.
import { readFileSync } from "node:fs";
import { searchDomain } from "./xtrace.js";

const CERT_FILE = new URL("../fixtures/thornwick/03-compliance-certificates.md", import.meta.url);
const PERIOD = "Q1 2026 · Test Date 31 March 2026";

// --- the arithmetic ---------------------------------------------------------------
// A leverage covenant is a ceiling: ratio at or below the cap complies.
export function assess({ netDebt, ebitda, threshold }) {
  const ratio = Math.round((netDebt / ebitda) * 100) / 100;
  return { ratio, verdict: ratio <= threshold ? "COMPLIANT" : "BREACH" };
}

// --- side A · the claim ------------------------------------------------------------
// Parsed out of the filed certificate, never hand-typed. The Q1 2026 schedules are the
// last of the two certificates in the file, so the final match in each table is Q1's.
function readCertificate() {
  const md = readFileSync(CERT_FILE, "utf8");
  const last = (re) => { const m = [...md.matchAll(re)]; return m.length ? m[m.length - 1][1] : null; };
  const netDebt = Number(last(/\*\*Total Net Debt\*\*\s*\|\s*\*\*([\d.]+)\*\*/g));
  const ebitda = Number(last(/\*\*Adjusted EBITDA\*\*\s*\|\s*\*\*([\d.]+)\*\*/g));
  const claimedRatio = Number(last(/Total Net Leverage \(Cl\. 22\.1\)[^|]*\|[^|]*\|\s*\*\*([\d.]+)×\*\*/g));
  if (!netDebt || !ebitda) throw new Error("certificate parse failed");
  return { netDebt, ebitda, claimedRatio, source: "fixtures/thornwick/03-compliance-certificates.md" };
}

// --- side B · the revision (from memory) ------------------------------------------
// Each pull scans every returned row for its pattern, so it survives re-ranking, and
// carries the matching row back as provenance.
async function pull(query, re) {
  const r = await searchDomain(query, 8);
  for (const row of r?.data ?? []) {
    const m = (row.text || "").match(re);
    if (m) return { m, row: { text: row.text, conv_id: row.conv_id, score: row.score, type: row.type } };
  }
  return null;
}

async function pullRevision() {
  const [cap, ebitda, ratio, unmoved, drivers] = await Promise.all([
    pull("maximum Total Net Leverage covenant ratio permitted for test dates in 2026",
      /not to exceed ([\d.]+):1 for Test Dates on or before 2026-12-31/),
    pull("Thornwick restated LTM Adjusted EBITDA at 31 March 2026",
      /restated Adjusted EBITDA for the LTM to 31 March 2026 was £([\d.]+)m/),
    pull("Thornwick restated Total Net Leverage at 31 March 2026",
      /restated Total Net Leverage at 31 March 2026 was ([\d.]+)x/),
    pull("was Thornwick Total Net Debt affected by the restatement",
      /Total Net Debt was (unaffected) by the restatement/),
    pull("what did the Thornwick restatement remove from EBITDA",
      /removed £([\d.]+)m of EBITDA, mainly from a £([\d.]+)m disallowed synergy add-back and £([\d.]+)m of revenue recognised too early/),
  ]);
  if (!cap || !ebitda) throw new Error("memory did not return the covenant cap and the restated EBITDA");
  return {
    threshold: Number(cap.m[1]),
    restatedEbitda: Number(ebitda.m[1]),
    memoryRatio: ratio ? Number(ratio.m[1]) : null,
    netDebtUnmoved: Boolean(unmoved),
    drivers: drivers
      ? [
          { label: "Disallowed run-rate synergy add-back", amount: Number(drivers.m[2]) },
          { label: "Revenue recognised too early (IFRS 15)", amount: Number(drivers.m[3]) },
        ]
      : [],
    removed: drivers ? Number(drivers.m[1]) : null,
    provenance: [cap, ebitda, ratio, unmoved, drivers].filter(Boolean).map((x) => x.row),
  };
}

// Frozen fallback — the same five sentences, captured live 2026-07-25. Used only if the
// API is unreachable, and it forces the label to PRERUN so the screen never lies.
const FROZEN = {
  threshold: 6.5,
  restatedEbitda: 29.0,
  memoryRatio: 7.59,
  netDebtUnmoved: true,
  removed: 5.0,
  drivers: [
    { label: "Disallowed run-rate synergy add-back", amount: 3.0 },
    { label: "Revenue recognised too early (IFRS 15)", amount: 1.7 },
  ],
  provenance: [
    { text: "The Thornwick Logistics Senior Facilities Agreement requires Total Net Debt to Adjusted EBITDA not to exceed 6.50:1 for Test Dates on or before 2026-12-31.", conv_id: "thornwick-01-credit-agreement", score: 1, type: "fact" },
    { text: "Thornwick Logistics Holdings Limited's restated Adjusted EBITDA for the LTM to 31 March 2026 was £29.0m.", conv_id: "thornwick-04-restatement", score: 1, type: "fact" },
    { text: "Thornwick Logistics Holdings Limited's restated Total Net Leverage at 31 March 2026 was 7.59x against a required maximum of 6.50x.", conv_id: "thornwick-04-restatement", score: 0.995, type: "fact" },
    { text: "Thornwick Logistics Holdings Limited's Total Net Debt was unaffected by the restatement.", conv_id: "thornwick-04-restatement", score: 1, type: "fact" },
    { text: "Thornwick Logistics Holdings Limited's 31 March 2026 restatement removed £5.0m of EBITDA, mainly from a £3.0m disallowed synergy add-back and £1.7m of revenue recognised too early.", conv_id: "thornwick-04-restatement", score: 0.999, type: "fact" },
  ],
};

export async function getFlip() {
  const cert = readCertificate();
  let rev, label = "LIVE", note = null;
  try {
    rev = await pullRevision();
  } catch (e) {
    rev = FROZEN;
    label = "PRERUN";
    note = `memory unreachable (${e.message}) — showing the frozen 25 Jul capture`;
  }

  // ONE function, TWO sets of inputs. This is the whole demo.
  const before = assess({ netDebt: cert.netDebt, ebitda: cert.ebitda, threshold: rev.threshold });
  const after = assess({ netDebt: cert.netDebt, ebitda: rev.restatedEbitda, threshold: rev.threshold });

  return {
    label,
    note,
    deal: "Thornwick Logistics Holdings Limited",
    threshold: rev.threshold,
    certificate: { ...before, period: PERIOD, netDebt: cert.netDebt, ebitda: cert.ebitda, claimedRatio: cert.claimedRatio, source: cert.source },
    restated: { ...after, period: PERIOD, netDebt: cert.netDebt, ebitda: rev.restatedEbitda },
    flip: before.verdict === "COMPLIANT" && after.verdict === "BREACH",
    netDebtUnmoved: rev.netDebtUnmoved,
    removed: rev.removed,
    drivers: rev.drivers,
    corroboration: { memoryRatio: rev.memoryRatio },
    provenance: rev.provenance,
  };
}
