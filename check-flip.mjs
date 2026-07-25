// ACCEPTANCE CHECK — Scene 4 "The Flip".
// The certificate says COMPLIANT. assess() must return BREACH for the SAME period,
// from the SAME code path, with no branch on a literal. Run: npm run check:flip
import { getFlip, assess } from "./src/deal.js";

let fail = 0;
const ok = (cond, msg) => { console.log(`${cond ? "PASS" : "FAIL"}  ${msg}`); if (!cond) fail++; };

// 1 · assess() is pure arithmetic + one comparison, and it does not know about Thornwick.
ok(assess({ netDebt: 100, ebitda: 50, threshold: 6.5 }).verdict === "COMPLIANT", "assess() 2.00x under a 6.50x cap is COMPLIANT");
ok(assess({ netDebt: 100, ebitda: 10, threshold: 6.5 }).verdict === "BREACH", "assess() 10.00x over a 6.50x cap is BREACH");
ok(assess({ netDebt: 65, ebitda: 10, threshold: 6.5 }).verdict === "COMPLIANT", "assess() exactly at the cap is COMPLIANT (<=)");

const f = await getFlip();

// 2 · THE CHECK. Same period, same function, opposite verdicts.
ok(f.certificate.verdict === "COMPLIANT", `certificate verdict is COMPLIANT (${f.certificate.ratio}x)`);
ok(f.restated.verdict === "BREACH", `re-derived verdict is BREACH (${f.restated.ratio}x)`);
ok(f.certificate.period === f.restated.period, `same period on both sides (${f.restated.period})`);
ok(f.flip === true, "flip === true");

// 3 · The verdict is RE-DERIVED, not swapped: our ratio is computed from inputs, and it
//     independently agrees with the restated ratio memory stored separately.
ok(f.restated.ratio === assess({ netDebt: f.restated.netDebt, ebitda: f.restated.ebitda, threshold: f.threshold }).ratio,
  "restated ratio is recomputed from netDebt/ebitda, not read from memory");
ok(f.corroboration.memoryRatio === f.restated.ratio,
  `our re-derived ${f.restated.ratio}x matches memory's independently stored ${f.corroboration.memoryRatio}x`);

// 4 · Net debt did not move. The break is entirely the EBITDA revision.
ok(f.certificate.netDebt === f.restated.netDebt, `net debt unchanged at ${f.restated.netDebt}`);
ok(f.restated.ebitda < f.certificate.ebitda, `EBITDA revised down ${f.certificate.ebitda} -> ${f.restated.ebitda}`);

// 5 · The revised facts came from memory, with provenance.
ok(f.provenance.length >= 2, `${f.provenance.length} provenance rows carried`);
ok(["LIVE", "PRERUN"].includes(f.label), `honesty label present: ${f.label}`);

console.log(fail ? `\n${fail} CHECK(S) FAILED` : "\nSCENE 4 ACCEPTANCE: ALL CHECKS PASS");
process.exit(fail ? 1 : 0);
