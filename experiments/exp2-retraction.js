// Exp 2 — typed change. Can you produce a RETRACTED (waiver, no successor)
// distinct from a SUPERSEDED one? This is the "why not Cognee/Graphiti" answer.
// Run: npm run exp2
import { requireClient, ingestWait, firstCreatedId, client, showMemory, hd, PASS, LOOK } from "./_lib.js";
requireClient();

const user_id = "exp2-user";
const conv_id = "exp2";

hd("Exp 2 — retraction vs supersession");

// Establish a covenant, then waive it with NO replacement (contraction, not revision).
const jobA = await ingestWait({ messages: [{ role: "user", content: "Deal Alpha carries a DSCR covenant with a 1.20x floor." }], user_id, conv_id });
const aId = firstCreatedId(jobA);

const jobB = await ingestWait({ messages: [{ role: "user", content: "The DSCR covenant on Deal Alpha was waived entirely for Q3; there is no replacement threshold." }], user_id, conv_id });
console.log(`  waiver ingest -> superseded_by=${JSON.stringify(jobB.result?.memories_superseded_by ?? {})}`);

// Inspect the original's status now.
if (aId) {
  try {
    const m = await client.memories.get(aId);
    showMemory(m, "original DSCR fact");
    const status = m.details?.status ?? m.status;
    if (status === "RETRACTED" || status === "retracted") PASS("waiver produced ACTIVE -> RETRACTED (no successor)");
    else if (status === "SUPERSEDED" || status === "superseded") LOOK("landed as SUPERSEDED, not RETRACTED — the extractor treated the waiver as a replacement; try phrasing that has no new value");
    else LOOK(`status=${status} — inspect; may need explicit 'retract' phrasing or an API flag`);
  } catch (e) {
    LOOK(`could not fetch original: ${e.message}`);
  }
}
console.log("\nGoal: show one ACTIVE->SUPERSEDED (Exp 1) and one ACTIVE->RETRACTED on screen. If retraction won't auto-trigger, document the workaround.");
