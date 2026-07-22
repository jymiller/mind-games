// Verifies the XTrace API key works: ingest one memory, then search it back.
// Run: npm run smoke   (after pasting your key/org into .env)
import { loadEnv, makeClient } from "./src/xtrace.js";

const env = loadEnv();
const client = makeClient(env);
if (!client) {
  console.log("⚠  No XTrace credentials found.");
  console.log("   cp .env.example .env  then paste XTRACE_API_KEY (xtk_...) and XTRACE_ORG_ID.");
  console.log("   Get them at https://docs.xtrace.ai");
  process.exit(0);
}

const user_id = "enid-demo";
const conv_id = "nra-1-setup";
try {
  console.log("→ ingest…");
  await client.memories.ingest({
    messages: [
      { role: "user", content: "Deal NRA-1 has an interest cover covenant with a 1.40x floor." },
      { role: "assistant", content: "Recorded: NRA-1 ICR covenant floor = 1.40x." },
    ],
    user_id,
    conv_id,
  });
  console.log("→ search…");
  const results = await client.memories.search({
    query: "what is NRA-1's covenant floor?",
    user_id,
    limit: 5,
  });
  console.log("✓ XTrace is live. Search returned:");
  console.dir(results, { depth: 4 });
} catch (e) {
  console.error("✗ XTrace call failed:", e?.message || e);
  console.error("  Check the key/org, and verify method names against https://docs.xtrace.ai");
  process.exit(1);
}
