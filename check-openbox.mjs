// ACCEPTANCE CHECK — Scene 8 "The Open Box".
// The storyboard's check is "kill the wifi and run the bank again — it must still answer
// from replay, visibly labelled". We do exactly that: a child process is pointed at an
// unreachable memory API with no model key, which is what a dead network looks like from
// inside the app. Run: npm run check:openbox
import { execFileSync } from "node:child_process";
import { ask, SUGGESTED } from "./src/openbox.js";

let fail = 0;
const ok = (cond, msg) => { console.log(`${cond ? "PASS" : "FAIL"}  ${msg}`); if (!cond) fail++; };

// 1 · An empty question is not an error state.
ok((await ask("")).state === "empty", "an empty question returns the empty state");

// 2 · Out-of-scope questions are refused honestly rather than answered plausibly.
const apple = await ask("What is the share price of Apple?");
ok(apple.state === "not-in-memory", `an off-corpus question returns ${apple.state}`);
ok(apple.label === "NOT IN MEMORY", "it is labelled NOT IN MEMORY");
ok(Array.isArray(apple.coverage?.deals) && apple.coverage.deals.length > 0,
  `and it states what it does cover (${(apple.coverage?.deals || []).length} deal(s))`);
ok(!("answer" in apple), "it does not produce an answer at all");

// 3 · THE CHECK — network down. Unreachable memory API, no model key: still answers, labelled.
const offline = execFileSync(
  process.execPath,
  ["-e", `import("./src/openbox.js").then(async (m) => {
      const r = await m.ask(${JSON.stringify(SUGGESTED[1])});
      console.log(JSON.stringify({ state: r.state, label: r.label, hasAnswer: Boolean(r.answer), captured: r.captured }));
    })`],
  { cwd: process.cwd(), env: { ...process.env, XTRACE_BASE_URL: "http://127.0.0.1:9", NOVITA_API_KEY: "", NOVITA_MODEL: "" }, encoding: "utf8" },
).trim().split("\n").pop();
const off = JSON.parse(offline);
ok(off.state === "replay", `with the network down the answer comes from replay (state: ${off.state})`);
ok(off.label === "REPLAY", "and it is visibly labelled REPLAY, never presented as live");
ok(off.hasAnswer === true, "an answer is still produced offline");
ok(typeof off.captured === "string", `the replay states when it was captured (${off.captured})`);

// 4 · The frozen bank is captured output, not hand-written prose.
const bank = JSON.parse(
  execFileSync(process.execPath, ["-e", "console.log(require('fs').readFileSync('fixtures/replay/openbox.json','utf8'))"], { cwd: process.cwd(), encoding: "utf8" }),
);
ok(Object.keys(bank.answers).length >= 3, `${Object.keys(bank.answers).length} answers frozen`);
ok(/freeze-replay/.test(bank.note), "the bank records that it was captured from live runs");

console.log(fail ? `\n${fail} CHECK(S) FAILED` : "\nSCENE 8 ACCEPTANCE: ALL CHECKS PASS");
process.exit(fail ? 1 : 0);
