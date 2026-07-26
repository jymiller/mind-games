// ACCEPTANCE CHECK — voice control.
// A microphone can't be automated here, so the check covers the part that decides what
// happens: heard phrase -> intent. Speech-to-text is the browser's job; this is ours.
// Run: npm run check:voice
import { parseCommand, resolveTarget, EXAMPLES } from "./src/voice.js";

let fail = 0;
const ok = (cond, msg) => { console.log(`${cond ? "PASS" : "FAIL"}  ${msg}`); if (!cond) fail++; };
const cmd = (s, opts) => parseCommand(s, opts);

// 1 · Navigation, however it's phrased.
ok(cmd("show me the flip").sceneId === "flip", "'show me the flip' -> flip");
ok(cmd("go to the money shot").sceneId === "flip", "'the money shot' -> flip");
ok(cmd("scene six").sceneId === "ablation", "'scene six' (spoken number) -> ablation");
ok(cmd("scene 6").sceneId === "ablation", "'scene 6' (digit) -> ablation");
ok(cmd("open the gate").sceneId === "gate", "'open the gate' -> gate");
ok(cmd("show me the history").sceneId === "chain", "'the history' -> chain");
ok(cmd("open box").sceneId === "openbox", "'open box' -> openbox, not the shorter 'box' alias colliding");

// 2 · Actions.
ok(cmd("run the test").intent === "run", "'run the test' -> run");
ok(cmd("run it", { currentScene: "ablation" }).sceneId === "ablation", "'run it' uses the page you're on");
ok(cmd("next").intent === "next", "'next' -> next");
ok(cmd("go back").intent === "prev", "'go back' -> prev");
ok(cmd("read it to me").intent === "speak", "'read it to me' -> speak");
ok(cmd("stop").intent === "stop", "'stop' -> stop");

// 3 · Questions reach the Open Box rather than being mistaken for navigation.
const q = cmd("what happened to the covenant breach?");
ok(q.intent === "ask", `a question is an ask, not a navigate (got ${q.intent})`);
ok(/covenant breach/.test(q.question), "the question text is carried through");
ok(cmd("ask who signed the last certificate").intent === "ask", "'ask ...' prefix -> ask");
// This one matters: "what happened to the covenant breach" contains no scene alias, but
// "is the chain verified" contains 'chain'. A question must still be a question.
ok(cmd("is the chain verified").intent === "ask", "a question containing a scene word is still a question");

// 4 · Nothing, and nonsense, are distinct from a wrong action.
ok(cmd("").intent === "empty", "silence -> empty");
ok(cmd("   ").intent === "empty", "whitespace -> empty");
ok(cmd("banana helicopter").intent === "unknown", "unrecognised speech -> unknown, never a guessed action");
ok(cmd("banana helicopter").heard === "banana helicopter", "and it reports what it thought it heard");

// 5 · Targets come from the scene registry, so the order can't drift out of sync.
ok(resolveTarget(cmd("show me the flip"), "lane") === "/scene/flip", "navigate resolves to a real route");
ok(resolveTarget(cmd("next"), "lane") === "/scene/recall", "next from lane -> recall");
ok(resolveTarget(cmd("go back"), "recall") === "/scene/lane", "prev from recall -> lane");
ok(resolveTarget(cmd("go back"), "lane") === null, "prev from the first scene goes nowhere");
ok(resolveTarget(cmd("next"), "openbox") === null, "next from the last scene goes nowhere");

// 6 · Every example phrase we show the user must actually work.
for (const e of EXAMPLES) {
  const r = cmd(e, { currentScene: "ablation" });
  ok(r.intent !== "unknown" && r.intent !== "empty", `example is understood: "${e}" -> ${r.intent}`);
}

console.log(fail ? `\n${fail} CHECK(S) FAILED` : "\nVOICE ACCEPTANCE: ALL CHECKS PASS");
process.exit(fail ? 1 : 0);
