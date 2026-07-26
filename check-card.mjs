// ACCEPTANCE CHECK — Scene 2 "The Recall".
//
// Two properties, and they pull in opposite directions on purpose:
//   1. No row is hardcoded. Kill the memory call with the fallback OFF and the card is EMPTY,
//      never stale — that is what proves the rows come from memory.
//   2. With the fallback ON, an outage shows a captured earlier run labelled PRERUN, so the
//      page is useful when everything is down — and it is never labelled LIVE.
// Run: npm run check:card
import { execFileSync } from "node:child_process";
import { getCard } from "./src/card.js";

let fail = 0;
const ok = (cond, msg) => { console.log(`${cond ? "PASS" : "FAIL"}  ${msg}`); if (!cond) fail++; };

// 1 · Live: the card fills from memory, and every row carries a source.
const live = await getCard();
ok(live.rows.length >= 4, `${live.rows.length} rows recalled from memory`);
ok(live.rows.every((r) => r.source && r.source.text), "every row carries a source line");
ok(live.rows.every((r) => r.source.conv_id), "every source names the conversation it came from");
ok(live.label === "LIVE", `label is ${live.label}`);

const certified = live.rows.find((r) => r.status === "COMPLIANT");
ok(Boolean(certified), `the card reads COMPLIANT ${certified ? certified.value : "?"} — the trap Scene 4 springs`);

// 2 · Fallback OFF — nothing from memory means an empty card, never a stale one.
const dead = await getCard(async () => ({ data: [] }), { frozen: false });
ok(dead.rows.length === 0, "with the fallback off, memory returning nothing empties the card");
ok(dead.label === "NO MEMORY", `label degrades honestly to ${dead.label}`);

const thrown = await getCard(async () => { throw new Error("network down"); }, { frozen: false });
ok(thrown.rows.length === 0, "a failing memory call empties the card too");

// 3 · Fallback ON — a captured run stands in, and says so.
const frozen = await getCard(async () => ({ data: [] }));
ok(frozen.label === "PRERUN", `with the fallback on, an outage renders ${frozen.label}`);
ok(frozen.label !== "LIVE", "a captured run is never labelled LIVE");
ok(frozen.rows.length >= 4, `the capture carries ${frozen.rows.length} real rows`);
ok(typeof frozen.capturedAt === "string", `and states when it was captured (${frozen.capturedAt})`);
ok(frozen.rows.every((r) => r.source && r.source.text), "captured rows keep their source lines");

// 4 · The same thing, for real: a child process pointed at an unreachable API.
const offline = execFileSync(
  process.execPath,
  ["-e", `import("./src/card.js").then(async (m) => {
      const c = await m.getCard();
      console.log(JSON.stringify({ label: c.label, rows: c.rows.length, capturedAt: c.capturedAt }));
    })`],
  { cwd: process.cwd(), env: { ...process.env, XTRACE_BASE_URL: "http://127.0.0.1:9" }, encoding: "utf8" },
).trim().split("\n").pop();
const off = JSON.parse(offline);
ok(off.label === "PRERUN", `with the API unreachable the card renders ${off.label}`);
ok(off.rows >= 4, `${off.rows} rows from the capture, so the page still works offline`);

console.log(fail ? `\n${fail} CHECK(S) FAILED` : "\nSCENE 2 ACCEPTANCE: ALL CHECKS PASS");
process.exit(fail ? 1 : 0);
