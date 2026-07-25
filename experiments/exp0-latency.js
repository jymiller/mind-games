// Exp 0 — latency & consistency. Teaches: async write model, wait:true vs poll,
// and that a naive ingest-then-query MISSES (=> pre-warm demo data).
// Run: npm run exp0
import { requireClient, client, ingestWait, search, hd, PASS, LOOK, sleep } from "./_lib.js";
requireClient();

const user_id = "exp0-user";
const msg = { role: "user", content: "Deal Alpha senior facility carries a max total net leverage covenant of 3.5x." };

hd("Exp 0 — latency & consistency");

// (a) async ingest, search IMMEDIATELY -> expect a miss
const jobAsync = await client.memories.ingest({ messages: [msg], user_id, conv_id: "exp0-async" });
const immediate = await search("Deal Alpha leverage covenant", { user_id });
console.log(`  async ingest -> ${jobAsync.status}; immediate search hits: ${immediate.length}`);
if (immediate.length === 0) PASS("naive ingest-then-query missed (extraction is async) — you MUST pre-warm");
else LOOK("immediate search returned rows — extraction was fast this time; still pre-warm for the demo");

// (b) wait:true, timed
const t0 = Date.now();
const jobWait = await ingestWait({ messages: [msg], user_id, conv_id: "exp0-wait" });
const ms = Date.now() - t0;
console.log(`  ingest {wait:true} -> ${jobWait.status} in ${ms}ms, created ${jobWait.result?.memories_created?.length ?? "?"}`);

// (c) confirm searchable
await sleep(1500);
const hits = await search("Deal Alpha leverage covenant", { user_id });
console.log(`  search after extraction -> ${hits.length} hit(s), top score ${hits[0]?.score ?? "n/a"}`);
if ((hits[0]?.score ?? 0) > 0.9) PASS("fact searchable, score > 0.9");
else LOOK("re-run; extraction/index may still be settling");
LOOK(`design note: budget ~${ms}ms for wait:true extraction`);
