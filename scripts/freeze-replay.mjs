// Captures live answers for the Scene 8 question bank and freezes them to disk.
//
// The point of the replay is that it is CAPTURED, not composed: every frozen answer was
// produced by a real live run against real recalled memory. Re-run this whenever the corpus
// changes. Rate limit is 30 req/min, so the bank is paced.
//
//   node scripts/freeze-replay.mjs
import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname } from "node:path";
import { ask, SUGGESTED } from "../src/openbox.js";

const OUT = new URL("../fixtures/replay/openbox.json", import.meta.url);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const norm = (q) => String(q).toLowerCase().replace(/[^a-z0-9 ]/g, "").replace(/\s+/g, " ").trim();

const answers = {};
for (const q of SUGGESTED) {
  process.stdout.write(`asking: ${q} ... `);
  const r = await ask(q, { allowLive: true });
  console.log(r.state);
  // Only freeze answers that were genuinely produced live. A not-in-memory result needs no
  // freezing — that state is computed, not recalled.
  if (r.state === "live") {
    answers[norm(q)] = { question: q, answer: r.answer, sources: r.sources };
  }
  await sleep(2500);
}

const dir = dirname(new URL(OUT).pathname);
if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
const payload = { captured: new Date().toISOString(), note: "Captured from live runs by scripts/freeze-replay.mjs. Not hand-written.", answers };
writeFileSync(OUT, JSON.stringify(payload, null, 2) + "\n");
console.log(`\nfroze ${Object.keys(answers).length} answer(s) -> fixtures/replay/openbox.json`);
