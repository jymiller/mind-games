// ACCEPTANCE CHECK — Scene 6 "The Ablation".
// The scores must be COMPUTED FROM THE RUN. The property that proves it: change an
// expected answer and the score must move. Run: npm run check:ablation
// (Pure — no network. The live 5/5 vs 0/5 run is the other half, and it runs on the page.)
import { QUESTIONS, grade, scoreArm } from "./src/ablation.js";

let fail = 0;
const ok = (cond, msg) => { console.log(`${cond ? "PASS" : "FAIL"}  ${msg}`); if (!cond) fail++; };

// 1 · The grader is a pure function of (answer, expectation).
const q2 = QUESTIONS.find((q) => q.id === "q2");
const good = "No — on the restated EBITDA the Total Net Leverage at 31 March 2026 was 7.59x against a 6.50x maximum, so it is not compliant.";
const bad = "Yes, Thornwick remains comfortably within its leverage covenant.";
ok(grade(good, q2.expect).pass === true, "a correct q2 answer passes");
ok(grade(bad, q2.expect).pass === false, "a wrong q2 answer fails");
ok(grade("", q2.expect).pass === false, "an empty answer fails (the reasoning-model trap)");

// 2 · THE CHECK. Mutate the expectation; the same answer must now score differently.
const mutated = [{ label: "impossible", re: /9\.99x-not-in-any-answer/ }];
ok(grade(good, q2.expect).pass !== grade(good, mutated).pass,
  "changing an expected answer moves the verdict — the score is not hardcoded");

// 3 · Scores are counted from results, not asserted.
const arm = [{ pass: true }, { pass: false }, { pass: true }, { pass: true }, { pass: false }];
ok(scoreArm(arm) === 3, `scoreArm counts passes from the run (${scoreArm(arm)}/5)`);
ok(scoreArm([]) === 0, "an empty run scores 0, never a default");

// 4 · Both arms are graded by the SAME expectations — the arms differ only by memory.
ok(QUESTIONS.every((q) => Array.isArray(q.expect) && q.expect.length > 0), `all ${QUESTIONS.length} questions carry expectations`);
ok(QUESTIONS.length === 5, `n = ${QUESTIONS.length}`);

console.log(fail ? `\n${fail} CHECK(S) FAILED` : "\nSCENE 6 ACCEPTANCE: ALL CHECKS PASS");
process.exit(fail ? 1 : 0);
