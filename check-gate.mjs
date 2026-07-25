// ACCEPTANCE CHECK — Scene 7 "The Gate".
// The property: ZERO writes fire before attest. The register must be byte-identical (or
// still absent) no matter how much the agent proposes. Run: npm run check:gate
import { readFileSync, existsSync, writeFileSync, rmSync } from "node:fs";
import { propose, register, attest, verifyChain, REGISTER_FILE } from "./src/gate.js";

let fail = 0;
const ok = (cond, msg) => { console.log(`${cond ? "PASS" : "FAIL"}  ${msg}`); if (!cond) fail++; };
const snapshot = () => (existsSync(REGISTER_FILE) ? readFileSync(REGISTER_FILE, "utf8") : "<absent>");

// Start from a known state so the check is repeatable.
if (existsSync(REGISTER_FILE)) rmSync(REGISTER_FILE);

// 1 · The agent proposes. Loudly. Repeatedly. Nothing is written.
const before = snapshot();
for (let i = 0; i < 25; i++) { propose(); register(); }
ok(snapshot() === before, "25 proposals + reads leave the register byte-identical (no writes fired)");
ok(propose().authority === "DENIED", "the proposal carries authority: DENIED");
ok(propose().blocked_on_human === true, "the proposal is explicitly blocked on a human");

// 2 · An attestation needs a named human.
let threw = false;
try { attest({ who: "  " }); } catch { threw = true; }
ok(threw, "an unnamed attestation is refused");
ok(snapshot() === before, "the refused attestation still wrote nothing");

// 3 · Only attest() commits.
const res = attest({ who: "R. Sandoval, Credit Officer", at: "2026-07-25T23:00:00.000Z" });
ok(snapshot() !== before, "after attest, the register has changed");
ok(res.committed.seq === 1 && res.committed.who.startsWith("R. Sandoval"), `entry 1 records who attested (${res.committed.who})`);
ok(res.chain.ok === true, "the chain verifies after one entry");

const second = attest({ who: "M. Okafor, Credit Committee", at: "2026-07-25T23:05:00.000Z" });
ok(second.committed.prev === res.committed.hash, "entry 2 carries entry 1's hash — the links are real");
ok(verifyChain().ok === true, "the chain verifies after two entries");

// 4 · Tamper detection: edit a committed entry and the chain must break at that point.
const entries = JSON.parse(readFileSync(REGISTER_FILE, "utf8"));
entries[0].who = "Someone Else Entirely";
writeFileSync(REGISTER_FILE, JSON.stringify(entries, null, 2) + "\n");
const tampered = verifyChain();
ok(tampered.ok === false && tampered.brokeAt === 1, `editing entry 1 breaks the chain at entry ${tampered.brokeAt} (${tampered.why})`);

// Leave a clean, valid register behind for the page to render.
rmSync(REGISTER_FILE);
attest({ who: "R. Sandoval, Credit Officer", at: "2026-07-25T23:00:00.000Z" });

console.log(fail ? `\n${fail} CHECK(S) FAILED` : "\nSCENE 7 ACCEPTANCE: ALL CHECKS PASS");
process.exit(fail ? 1 : 0);
