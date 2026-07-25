# XTrace experiment plan (Thursday July 24) — build recommendations

Recommendations for the Deal Memory build. Visual version (published artifact):
https://claude.ai/code/artifact/7fc79a6f-97f3-4a01-aa93-83dc673e073b
Source research lives in hackathon-prep `docs/2026-07-25-mind-games/` (event strategy).

## Verdict (short)

Build on **XTrace**, not Cognee — not close for this build. The hero mechanic (a restated
financial **supersedes** the old fact *with lineage*) is a native XTrace primitive and is
**structurally impossible in Cognee** (Cognee's extraction is stateless — contradictions
accumulate, they don't supersede). XTrace gives `SUPERSEDED` status + a `supersedes` pointer +
a walkable revision chain for free, plus a typed retraction-vs-supersession distinction no
competitor exposes, plus the un-metered `/trigger` hook = the money-shot beat. Cognee wins on
retrieval breadth and self-hosting (the better *production* data-residency answer — worth one
sentence to judges), but that's not what this demo needs.

## Two gotchas to resolve before building anything

1. **`/revisions` and `/usage` are HTTP-only** — not in the `@xtraceai/memory` SDK. (Correction:
   `trigger` and `groups.*` ARE in the SDK — call them directly.) The lineage chain (`/revisions`)
   is the on-screen hero beat, so it needs a raw-`fetch` wrapper — **built:** `src/xtrace-http.js`
   (reuses the key/orgId; base `https://api.production.xtrace.ai`, headers `Authorization: Bearer
   $XTRACE_API_KEY` + `x-org-id: $XTRACE_ORG_ID`).
2. **The "personal gate" may hide covenant facts.** XTrace classifies "finances" as personal and
   can **fail closed** — silently refusing to group-tag a covenant, so a second officer scoped to
   the deal team retrieves nothing. Invisible until it happens live. Exp 3 confirms + finds the
   workaround.

## Thursday experiments (~3.5 hrs) — each teaches XTrace AND de-risks a demo beat

Run in order; script each in this repo so Saturday needs zero live ingest. Pass criteria are the
greenlight gates.

**Exp 0 · Latency/consistency calibration (~20m).** `ingest` one covenant with `{wait:true}`
(time it) and once async (`jobs.pollUntilDone`); `search` immediately vs after job.
**Pass:** post-extraction search >0.9; measured latency; confirmed naive ingest-then-query misses → must pre-warm.

**Exp 1 · CRITICAL — supersession on a restated financial (~45m).** Ingest "Q2 EBITDA is $4.2M",
then "restated to $3.8M in the amended financials"; check the `memories_superseded_by` map; hit
`GET /v1/memories/{old}/revisions`. Repeat with legal phrasing (leverage 3.5x → "First Amendment
increases to 4.0x"), on defaults and `agentic:true`.
**Pass:** numeric restatement → old `SUPERSEDED`, new `supersedes=old_id`, clean chain. Record
which phrasing triggers the legal case for the demo script. **This is the greenlight gate.**

**Exp 2 · Typed change — retraction vs supersession (~30m).** Ingest "DSCR covenant waived for
Q3, no replacement"; read status; compare to Exp 1.
**Pass:** one belief ACTIVE→SUPERSEDED, one ACTIVE→RETRACTED, both on screen.

**Exp 3 · CRITICAL — officer handoff + personal-gate hazard (~40m).** `groups.create`
"deal-alpha-team"; ingest covenants as `officer-jane` with `group_ids`; **inspect returned
`group_ids`** (may be empty!). If empty, `PATCH` group ids or test a prompted group. Then
`search`/`recall` as `officer-bob` scoped to the group.
**Pass:** officer-bob retrieves covenants he never ingested, via a method that survives the gate.

**Exp 4 · Money shot — un-metered `/trigger` (~40m).** Store a `lesson` ("Lender X's EBITDA_adj
moved to column 7 — remap") with trigger entities; read `/v1/usage`; POST `/trigger` with
`action={tool:'parse_lender_csv', args:{lender:'Lender X'}}`; read `/v1/usage` again.
**Pass:** trigger returns the Q3 lesson via exact-match, metered counter unchanged.

**Exp 5 · Memory on-vs-off eval toggle (~30m).** Wrap one covenant question in a toggle: path A
injects `recall` compose-mode context (surfacing the SUPERSEDED→ACTIVE chain); path B runs cold.
**Pass:** deterministic — correct lineage-aware answer WITH memory, wrong/ignorant WITHOUT. (For judge Jiao.)

**Exp 6 · Quota recon (~20m).** `GET /v1/usage` for `rate_limit_req_per_min` + monthly caps +
reset; small burst to observe throttling; confirm all demo data pre-ingested.
**Pass:** known caps + headroom; every beat reads pre-warmed data.

## Greenlight

Build the belief-revision demo only if Exp 1, 3, 4, 5 all pass and every beat reads from
pre-warmed data with quota headroom. **Fallback if Exp 1 fails on both numeric AND legal
phrasing:** don't greenlight auto-supersession — write the `supersedes` links explicitly via the
API, reframe as "curated lineage," decide Friday. (Cognee would be strictly worse at this too.)
