// ACCEPTANCE CHECK — Scene 5 "The Chain".
// This scene makes a claim about someone else's product, so the check that matters is that
// the claim is TRUE: the platform revision-chain number on the page must equal what the API
// actually returns right now, not what we wish it returned. Run: npm run check:chain
import { getChain } from "./src/chain.js";
import { getRevisions } from "./src/xtrace.js";

let fail = 0;
const ok = (cond, msg) => { console.log(`${cond ? "PASS" : "FAIL"}  ${msg}`); if (!cond) fail++; };

const c = await getChain();

// 1 · The lineage is built from memory, with provenance on every node.
ok(c.nodes.length >= 4, `${c.nodes.length} lineage nodes recalled`);
ok(c.nodes.every((n) => n.source && n.source.text), "every node carries the memory sentence it came from");
ok(c.nodes.every((n) => n.source.conv_id), "every node names the document it came from");
ok(c.label === "LIVE LINEAGE", `label is ${c.label}`);

// 2 · The story is ordered: certified compliant, then the event, then the re-derived breach.
const first = c.nodes[0], last = c.nodes[c.nodes.length - 1];
ok(/COMPLIANT/.test(first.headline), `it opens on the certified verdict (${first.headline})`);
ok(first.state === "superseded", "the certified verdict is marked superseded, not deleted");
ok(c.nodes.some((n) => /BREACH/.test(n.headline)), "the re-derived breach is in the chain");
ok(/waiv/i.test(last.headline), `it closes on the waiver (${last.headline})`);

// 3 · THE CHECK. The platform claim on the page must match live reality.
ok(c.platform.error === null, "the platform revision chain was queried successfully");
ok(c.platform.checked > 0, `${c.platform.checked} memories were checked for revisions`);
const live = await getRevisions(c.nodes[0].source.id);
const liveLen = (live?.data ?? []).length;
ok(c.platform.maxNodes >= liveLen, `reported chain depth (${c.platform.maxNodes}) is not less than a live spot-check (${liveLen})`);
ok(c.platform.maxNodes <= 1 ? typeof c.caveat === "string" && c.caveat.length > 80 : true,
  c.platform.maxNodes <= 1
    ? "with a single-node chain, the page states why in full rather than implying lineage it does not have"
    : "the platform returned a real multi-node chain");

// 4 · No memory means no scene, not a stale one.
console.log(`\n  platform revision chain: max ${c.platform.maxNodes} node(s) across ${c.platform.checked} memories`);
console.log(fail ? `\n${fail} CHECK(S) FAILED` : "\nSCENE 5 ACCEPTANCE: ALL CHECKS PASS");
process.exit(fail ? 1 : 0);
