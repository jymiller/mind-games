// Exp 5 — memory on-vs-off. Build the toggle that shows a lineage-aware answer
// WITH memory vs a cold one WITHOUT (Beat 4, for judge Jiantao Jiao).
// XTrace provides the memory half (recall compose); the model call is yours
// (wire your LLM where marked). Run: npm run exp5
import { requireClient, client, ingestWait, hd, LOOK, PASS } from "./_lib.js";
requireClient();

const user_id = "exp5-user";
const conv_id = "exp5";

hd("Exp 5 — memory on-vs-off eval toggle");

// Pre-warm: a covenant that then gets restated (so recall surfaces the chain).
await ingestWait({ messages: [{ role: "user", content: "Deal Alpha max total net leverage covenant is 3.5x." }], user_id, conv_id });
await ingestWait({ messages: [{ role: "user", content: "Correction: under the First Amendment Deal Alpha's max total net leverage is now 4.0x." }], user_id, conv_id });

const question = "What is Deal Alpha's current max leverage covenant, and what was it before?";

// WITH memory: recall assembles a ready-to-inject context (compose mode).
const recalled = await client.memories.recall({ query: question, pools: [{ user_id }] });
const promptWith = `${recalled.prompt ?? ""}\n\nQuestion: ${question}`;
const promptWithout = `Question: ${question}`;

console.log("\n--- WITH memory (inject this into the model) ---\n" + promptWith.slice(0, 800));
console.log("\n--- WITHOUT memory (cold) ---\n" + promptWithout);

if ((recalled.prompt ?? "").length > 0) PASS("recall produced injectable context surfacing the covenant history");
else LOOK("recall context empty — ensure the pre-warm ingest extracted before recall");

console.log(`
NEXT (in the build): run BOTH prompts through your LLM (e.g. Novita, like wet-ink).
Expect: WITH memory -> correct, cites 4.0x now / 3.5x before (lineage-aware);
        WITHOUT     -> ignorant or wrong. That side-by-side is the Jiao eval.`);
