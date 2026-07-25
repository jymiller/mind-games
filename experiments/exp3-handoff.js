// Exp 3 — CRITICAL. Officer handoff via group scope + the PERSONAL-GATE hazard.
// XTrace may classify "finances" as personal and silently refuse to group-tag a
// covenant, so a second officer retrieves nothing. Confirm + find the workaround.
// Run: npm run exp3
import { requireClient, client, ingestWait, firstCreatedId, search, showMemory, hd, PASS, FAIL, LOOK } from "./_lib.js";
import { updateMemoryGroups } from "../src/xtrace-http.js";
requireClient();

hd("Exp 3 — officer handoff + personal gate");

// 1) A shared deal-team group.
let grpId;
try {
  const grp = await client.groups.create({ name: "deal-alpha-team" });
  grpId = grp.id ?? grp.grp_id;
  console.log(`  group created: ${grpId}`);
} catch (e) {
  // may already exist; list and reuse
  const groups = await client.groups.list();
  grpId = groups.find((g) => g.name === "deal-alpha-team")?.id;
  console.log(`  reusing existing group: ${grpId} (${e.message})`);
}

// 2) Officer Jane ingests a covenant tagged to the team.
const job = await ingestWait({
  messages: [{ role: "user", content: "Deal Alpha senior facility: max total net leverage covenant 3.5x; ICR floor 1.40x." }],
  user_id: "deal-alpha",
  agent_id: "officer-jane",
  conv_id: "exp3",
  group_ids: [grpId],
});
console.log(`  ignored_group_ids: ${JSON.stringify(job.result?.ignored_group_ids ?? [])}`);
const memId = firstCreatedId(job);

// 3) THE HAZARD: did the personal gate strip the group tag?
let tagged = false;
if (memId) {
  const m = await client.memories.get(memId);
  showMemory(m, "ingested covenant");
  tagged = (m.group_ids ?? []).includes(grpId);
  if (tagged) PASS("covenant kept its group tag — personal gate did NOT strip it");
  else {
    LOOK("personal gate STRIPPED the group tag (finances=personal). Trying the re-tag workaround...");
    try {
      await updateMemoryGroups(memId, [grpId]);
      const m2 = await client.memories.get(memId);
      tagged = (m2.group_ids ?? []).includes(grpId);
      tagged ? PASS("re-tag via PATCH worked — workaround confirmed") : FAIL("re-tag did not stick — need another path (prompted group?)");
    } catch (e) {
      FAIL(`re-tag failed: ${e.message} — verify the PATCH path in docs`);
    }
  }
}

// 4) Officer Bob (never ingested this) retrieves via group scope.
const bob = await search("Deal Alpha covenants", { group_ids: [grpId] });
console.log(`  officer-bob (group scope) retrieved ${bob.length} row(s)`);
bob.forEach((m) => showMemory(m, "  -> "));
if (bob.length > 0) PASS("a second officer retrieved covenants he never ingested — handoff works");
else FAIL("group-scoped retrieval empty — the memory outlives the officer ONLY if this passes");
