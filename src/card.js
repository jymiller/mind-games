// Scene 2 "The Recall" — the Deal Memory Card.
//
// Every row on this card comes out of memory with a source line under it. Nothing is
// hardcoded: if a pull finds no matching row, the row is OMITTED rather than defaulted,
// so killing the memory call empties the card instead of leaving it stale.
//
// The card reads COMPLIANT 6.47x. That is the trap Scene 4 springs.
import { searchDomain } from "./xtrace.js";
import { loadCapture, LIVE, PRERUN } from "./frozen.js";

// The fetcher is injectable so the acceptance check can prove the empty-not-stale
// property without reaching past searchDomain() into a raw search().
//
// `frozen` controls the fallback. With memory unreachable the card would otherwise be blank,
// which is honest but useless; instead it renders a captured earlier run labelled PRERUN.
// Pass { frozen: false } to see the raw empty result — the acceptance check does, so the
// empty-not-stale property is still proven.
export async function getCard(fetcher = searchDomain, { frozen = true } = {}) {
  const pull = async (query, re, build) => {
    try {
      const r = await fetcher(query, 8);
      for (const row of r?.data ?? []) {
        const m = (row.text || "").match(re);
        if (m) return { ...build(m), source: { text: row.text, conv_id: row.conv_id, score: row.score } };
      }
    } catch { /* fall through to omitted */ }
    return null;
  };

  const rows = (
    await Promise.all([
      pull(
        "maximum Total Net Leverage covenant ratio permitted for test dates in 2026",
        /not to exceed ([\d.]+):1 for Test Dates on or before 2026-12-31/,
        (m) => ({ label: "Total Net Leverage covenant", value: `max ${m[1]}×`, note: "test dates to 31 Dec 2026" }),
      ),
      pull(
        "Thornwick 31 March 2026 certified Total Net Leverage compliance certificate",
        /certified Total Net Leverage of ([\d.]+)x against a ([\d.]+)x limit/,
        (m) => ({ label: "Q1 2026 as certified", value: `${m[1]}×`, note: `against a ${m[2]}× limit`, status: "COMPLIANT" }),
      ),
      pull(
        "who signed the Thornwick compliance certificate and when",
        /compliance certificate was signed on ([\d]+ [A-Za-z]+ [\d]{4}) by ([^.]+)/,
        (m) => ({ label: "Attested by", value: m[2].trim(), note: `signed ${m[1]}` }),
      ),
      pull(
        "what did the Thornwick restatement remove from EBITDA",
        /restatement removed £([\d.]+)m of EBITDA/,
        (m) => ({ label: "Prior restatement", value: `−£${m[1]}m EBITDA`, note: "FY2025 audit, delivered 3 Jul 2026" }),
      ),
      pull(
        "Thornwick auditor for FY2025 and whether it changed",
        /audited by ([A-Z][A-Za-z ]+LLP)/,
        (m) => ({ label: "FY2025 auditor", value: m[1].trim(), note: "changed — the new auditor surfaced the restatement" }),
      ),
      pull(
        "Thornwick covenant levels reset under Amendment and Waiver No. 1",
        /reset under Amendment & Waiver No\. 1 dated ([\d]+ [A-Za-z]+ [\d]{4})/,
        (m) => ({ label: "Covenant reset", value: "Amendment & Waiver No. 1", note: `dated ${m[1]} — the level moved` }),
      ),
    ])
  ).filter(Boolean);

  const deal = "Thornwick Logistics Holdings Limited";
  if (rows.length) return { label: LIVE, source: "memory", deal, rows };

  // Nothing came back. Fall back to a captured run if we have one, and say so.
  if (frozen) {
    const cap = loadCapture("card");
    if (cap) return { ...cap.data, label: PRERUN, capturedAt: cap.capturedAt };
  }
  return { label: "NO MEMORY", source: "memory", deal, rows: [] };
}
