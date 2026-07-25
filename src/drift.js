// Scene 3 "The Drift" — catching a renamed field by remembering last quarter's field map.
//
// Two REAL code paths run over the same two filings:
//
//   naiveRead()      looks for the field it wants. It isn't there. It falls back to the last
//                    value it saw and reports a healthy ratio. It stays green, confidently.
//   fingerprintRead() compares the SHAPE of this filing against the remembered shape of the
//                    last one, notices `ebitda` left and `adjusted_ebitda` arrived, and uses
//                    the real number.
//
// The detection is on the field map, not the values — which is the whole point. A value-only
// comparison cannot distinguish "renamed" from "absent", and absent looks like nothing wrong.
import { readFileSync } from "node:fs";
import { assess } from "./deal.js";

const FILE = new URL("../fixtures/thornwick/06-quarterly-field-maps.json", import.meta.url);

export function loadFilings() {
  return JSON.parse(readFileSync(FILE, "utf8"));
}

// The shape of a submission: its field names, sorted. Values deliberately excluded.
export const fingerprint = (fields) => Object.keys(fields).sort();

// A field that vanished and a field that appeared, in one step, is a rename.
export function detectDrift(priorFields, nowFields) {
  const before = fingerprint(priorFields);
  const after = fingerprint(nowFields);
  const removed = before.filter((k) => !after.includes(k));
  const added = after.filter((k) => !before.includes(k));
  const renames = removed.length === added.length
    ? removed.map((from, i) => ({ from, to: added[i] }))
    : [];
  return { before, after, removed, added, renames, drifted: removed.length > 0 || added.length > 0 };
}

// PATH A — value-only. Wants `ebitda`; can't find it; uses the last number it knew.
export function naiveRead(prior, now, cap) {
  const ebitda = now.fields.ebitda ?? prior.fields.ebitda; // the fallback that hides the problem
  const stale = now.fields.ebitda === undefined;
  const { ratio, verdict } = assess({ netDebt: now.fields.total_net_debt, ebitda, threshold: cap });
  return { path: "value-only", ebitda, stale, ratio, verdict, saw: "no field named `ebitda` in this filing" };
}

// PATH B — remembers the shape of last quarter and maps the renamed field across.
export function fingerprintRead(prior, now, cap) {
  const drift = detectDrift(prior.fields, now.fields);
  const rename = drift.renames.find((r) => r.from === "ebitda");
  const key = rename ? rename.to : "ebitda";
  const ebitda = now.fields[key];
  const { ratio, verdict } = assess({ netDebt: now.fields.total_net_debt, ebitda, threshold: cap });
  return { path: "field-map", ebitda, drift, usedField: key, ratio, verdict, learned: rename || null };
}

export function runDrift() {
  const f = loadFilings();
  const cap = f.covenant.max_total_net_leverage;
  const naive = naiveRead(f.q2, f.q3, cap);
  const smart = fingerprintRead(f.q2, f.q3, cap);
  return {
    label: "SYNTHETIC DATA",
    cap,
    q2: f.q2,
    q3: f.q3,
    naive,
    smart,
    diverged: naive.verdict !== smart.verdict,
    // What gets written back to memory so the mapping is never re-derived.
    lesson: smart.learned
      ? `For Thornwick filings: the covenant earnings line was renamed \`${smart.learned.from}\` -> \`${smart.learned.to}\` at the ${f.q3.test_date} Test Date. Read \`${smart.learned.to}\` for periods on or after that date.`
      : null,
  };
}
