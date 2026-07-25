// ACCEPTANCE CHECK — Scene 3 "The Drift".
// The property: the two paths PROVABLY diverge. Value-only stays green on a stale number
// while the field-map path catches the rename and reports the truth. Run: npm run check:drift
import { runDrift, detectDrift, fingerprint, naiveRead, fingerprintRead } from "./src/drift.js";

let fail = 0;
const ok = (cond, msg) => { console.log(`${cond ? "PASS" : "FAIL"}  ${msg}`); if (!cond) fail++; };

const d = runDrift();

// 1 · The detection is on the field map, not the values.
ok(JSON.stringify(fingerprint({ b: 2, a: 1 })) === JSON.stringify(["a", "b"]), "fingerprint is the sorted field names, values excluded");
ok(fingerprint({ a: 1 }).length === 1 && !fingerprint({ a: 1 }).includes(1), "fingerprint carries no values at all");

// 2 · The rename is detected.
ok(d.smart.drift.drifted === true, "drift detected between the two filings");
ok(d.smart.drift.removed.includes("ebitda"), "`ebitda` is seen to have left");
ok(d.smart.drift.added.includes("adjusted_ebitda"), "`adjusted_ebitda` is seen to have arrived");
ok(d.smart.learned && d.smart.learned.from === "ebitda" && d.smart.learned.to === "adjusted_ebitda",
  `the rename is learned: ${d.smart.learned?.from} -> ${d.smart.learned?.to}`);

// 3 · THE CHECK. Same filing, same covenant, two paths, opposite verdicts.
ok(d.naive.stale === true, "the value-only path fell back to a stale number");
ok(d.naive.ebitda !== d.smart.ebitda, `the two paths used different earnings (${d.naive.ebitda} vs ${d.smart.ebitda})`);
ok(d.naive.verdict === "COMPLIANT", `value-only reports ${d.naive.ratio}x ${d.naive.verdict} — it stays green`);
ok(d.smart.verdict === "BREACH", `field-map reports ${d.smart.ratio}x ${d.smart.verdict} — it catches it`);
ok(d.diverged === true, "the two paths provably diverge on the same input");

// 4 · No drift must NOT be reported as drift.
const same = detectDrift({ a: 1, b: 2 }, { a: 9, b: 8 });
ok(same.drifted === false, "identical field maps with different values report no drift");

// 5 · The mapping is written down, so it is never re-derived.
ok(typeof d.lesson === "string" && d.lesson.includes("adjusted_ebitda"), "the learned mapping is expressed as a rule for memory");

console.log(fail ? `\n${fail} CHECK(S) FAILED` : "\nSCENE 3 ACCEPTANCE: ALL CHECKS PASS");
process.exit(fail ? 1 : 0);
