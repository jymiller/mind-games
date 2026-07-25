// Exp 6 — quota & failure-mode recon. Learn the free-tier limits so a live demo
// never hits a 429. /usage is un-metered. Run: npm run exp6
import { requireClient, search, hd, PASS, LOOK } from "./_lib.js";
import { getUsage } from "../src/xtrace-http.js";
requireClient();

hd("Exp 6 — quota & failure-mode recon");

try {
  const usage = await getUsage();
  console.log("  /v1/usage ->");
  console.log(JSON.stringify(usage, null, 2));
  PASS("read usage/limits — note rate_limit_req_per_min, monthly caps, and reset window");
} catch (e) {
  LOOK(`/v1/usage failed: ${e.message} — confirm the path/base in docs.xtrace.ai`);
}

// Gentle burst to observe throttling behaviour (typed RateLimited error).
console.log("\n  firing 8 quick searches to probe throttling...");
let ok = 0, limited = 0;
for (let i = 0; i < 8; i++) {
  try { await search("Deal Alpha", { user_id: "exp0-user" }); ok++; }
  catch (e) { limited++; console.log(`    search ${i} -> ${e.message?.slice(0, 80)}`); }
}
console.log(`  ${ok} ok, ${limited} throttled`);
LOOK("confirm every demo beat reads PRE-WARMED data so Saturday needs zero live ingest");
