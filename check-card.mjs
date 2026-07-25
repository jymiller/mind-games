// ACCEPTANCE CHECK — Scene 2 "The Recall".
// The property that matters: no row is hardcoded in the component. Kill the memory call
// and the card must go EMPTY, not stale. Run: npm run check:card
import { getCard } from "./src/card.js";

let fail = 0;
const ok = (cond, msg) => { console.log(`${cond ? "PASS" : "FAIL"}  ${msg}`); if (!cond) fail++; };

// 1 · Live: the card fills from memory, and every row carries a source.
const live = await getCard();
ok(live.rows.length >= 4, `${live.rows.length} rows recalled from memory`);
ok(live.rows.every((r) => r.source && r.source.text), "every row carries a source line");
ok(live.rows.every((r) => r.source.conv_id), "every source names the conversation it came from");
ok(live.label === "LIVE RECALL", `label is ${live.label}`);

const certified = live.rows.find((r) => r.status === "COMPLIANT");
ok(Boolean(certified), `the card reads COMPLIANT ${certified ? certified.value : "?"} — the trap Scene 4 springs`);

// 2 · THE CHECK. With memory returning nothing, the card is empty rather than stale.
const dead = await getCard(async () => ({ data: [] }));
ok(dead.rows.length === 0, "memory returning nothing empties the card (no stale defaults)");
ok(dead.label === "NO MEMORY", `label degrades honestly to ${dead.label}`);

// 3 · Same, when the call throws outright.
const thrown = await getCard(async () => { throw new Error("network down"); });
ok(thrown.rows.length === 0, "a failing memory call empties the card too");

console.log(fail ? `\n${fail} CHECK(S) FAILED` : "\nSCENE 2 ACCEPTANCE: ALL CHECKS PASS");
process.exit(fail ? 1 : 0);
