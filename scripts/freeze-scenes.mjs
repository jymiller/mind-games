// Capture a real successful run of each network-dependent scene, so that when the APIs are
// down the pages still render something true and label it PRERUN.
//
//   node scripts/freeze-scenes.mjs            # capture all three
//   node scripts/freeze-scenes.mjs card chain # capture only those
//
// Captured, never composed: whatever the live call returned is what gets written. If a call
// fails, nothing is written for that scene — a capture of a failure is worse than no capture.
// Mind the model rate limit: the ablation is 10 calls, and the ceiling is 30/minute.
import { saveCapture, loadCapture } from "../src/frozen.js";
import { getCard } from "../src/card.js";
import { getChain } from "../src/chain.js";
import { runAblation } from "../src/ablation.js";

const WANT = process.argv.slice(2).filter((a) => !a.startsWith("-"));
const wanted = (name) => WANT.length === 0 || WANT.includes(name);

// Each capture declares what "good enough to freeze" means. A thin or empty result must not
// be frozen, or the fallback would enshrine a bad day.
const TARGETS = [
  {
    name: "card",
    run: () => getCard(undefined, { frozen: false }),
    ok: (d) => Array.isArray(d.rows) && d.rows.length >= 4,
    describe: (d) => `${d.rows.length} rows`,
  },
  {
    name: "chain",
    run: () => getChain({ frozen: false }),
    ok: (d) => Array.isArray(d.nodes) && d.nodes.length >= 4,
    describe: (d) => `${d.nodes.length} nodes, platform depth ${d.platform?.maxNodes}`,
  },
  {
    name: "ablation",
    run: () => runAblation({ frozen: false }),
    ok: (d) => d.on?.complete && d.off?.complete,
    describe: (d) => `memory on ${d.on.score}/${d.n}, off ${d.off.score}/${d.n}`,
  },
];

let wrote = 0, skipped = 0;
for (const t of TARGETS) {
  if (!wanted(t.name)) continue;
  process.stdout.write(`${t.name} … `);
  try {
    const data = await t.run();
    if (!t.ok(data)) {
      const had = loadCapture(t.name);
      console.log(`refused (${t.describe(data)}) — ${had ? "keeping the existing capture" : "no capture written"}`);
      skipped++;
      continue;
    }
    saveCapture(t.name, data);
    console.log(`captured (${t.describe(data)})`);
    wrote++;
  } catch (e) {
    console.log(`failed (${String(e.message).slice(0, 90)}) — no capture written`);
    skipped++;
  }
}

console.log(`\nwrote ${wrote} capture(s), skipped ${skipped}`);
if (wrote === 0 && skipped > 0) process.exitCode = 1;
