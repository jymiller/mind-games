// Exp 4 — the money shot. A fix learned in "Q3" recalled for free before a tool
// call in "Q4" via the un-metered /trigger hook (Beat 2). trigger IS in the SDK;
// /usage is raw (to prove the metered counter doesn't move).
// Run: npm run exp4
import { requireClient, client, ingestWait, hd, PASS, FAIL, LOOK } from "./_lib.js";
import { getUsage } from "../src/xtrace-http.js";
requireClient();

const user_id = "exp4-user";
const agent_id = "exp4-agent";

hd("Exp 4 — un-metered /trigger procedural hook");

// 1) Store a procedural lesson (Q3). agentic:true encourages procedural extraction.
await ingestWait({
  messages: [
    { role: "user", content: "Lesson for parsing Lender X quarterly CSVs: the EBITDA_adj column moved to position 7 — remap it before computing coverage." },
    { role: "assistant", content: "Noted: when parsing Lender X CSVs, remap EBITDA_adj from column 7." },
  ],
  user_id,
  agent_id,
  conv_id: "exp4-q3",
  agentic: true,
});

// 2) Meter reading BEFORE the trigger call.
let before;
try { before = await getUsage(); console.log(`  usage before: ${JSON.stringify(before).slice(0, 200)}`); }
catch (e) { LOOK(`/v1/usage not reachable: ${e.message} (verify path)`); }

// 3) Q4: before running the parse tool, fire the trigger hook (exact-match on identifiers).
let hits = [];
try {
  const res = await client.memories.trigger({
    action: { tool: "parse_lender_csv", args: { lender: "Lender X", quarter: "Q4" } },
    task: "parse Q4 Lender X financials",
    include: ["lesson", "procedure"],
    user_id,
    agent_id,
  });
  hits = res.data ?? [];
  console.log(`  /trigger returned ${hits.length} directive row(s):`);
  hits.forEach((m) => console.log(`    [${m.type}] ${(m.text || "").slice(0, 80)}`));
  hits.length ? PASS("trigger recalled the Q3 lesson before the tool ran (no search)") : FAIL("trigger returned nothing — check directive storage / trigger entities / phrasing");
} catch (e) {
  FAIL(`trigger call failed: ${e.message}`);
}

// 4) Meter reading AFTER — should be unchanged.
try {
  const after = await getUsage();
  console.log(`  usage after:  ${JSON.stringify(after).slice(0, 200)}`);
  LOOK("compare before/after: the metered request counter should be UNCHANGED across the trigger call");
} catch { /* already noted */ }
