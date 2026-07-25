# XTrace experiment harness — what's set up and how to run it

**Purpose:** a runnable, throwaway harness to *learn XTrace* and *de-risk every Deal Memory
demo beat* in a half day (Thursday July 24), before the real build. Each script exercises one
XTrace capability against the live API and prints a `✓ PASS` / `✗ FAIL` / `• INSPECT` verdict.
Full rationale + greenlight criteria: [`../docs/xtrace-experiment-plan.md`](../docs/xtrace-experiment-plan.md).

## Prereqs

`.env` already has `XTRACE_API_KEY` + `XTRACE_ORG_ID` (the `smoke` test passes). `npm install` done.

## What's in here

| Piece | What it is |
| --- | --- |
| `../src/xtrace.js` | SDK client (`MemoryClient`) + `.env` loader — used everywhere |
| `../src/xtrace-http.js` | **Raw-`fetch` wrapper** for the endpoints NOT in the SDK: `getRevisions` (lineage chain), `getUsage` (quota), `updateMemoryGroups` (personal-gate workaround). Note: `trigger` and `groups.*` ARE in the SDK, so they're called directly. |
| `_lib.js` | Shared helpers: `ingestWait` (ingest + wait for extraction), `search`, `firstCreatedId`, `showMemory`, PASS/FAIL/INSPECT printers |
| `exp0-latency.js` … `exp6-quota.js` | One experiment each (below) |

## Run

```
npm run exp0     # …through exp6, individually (recommended — read each result)
npm run experiments   # all in sequence
```

## The experiments (each maps to a demo beat)

| # | Script | Question / beat | Pass = |
| --- | --- | --- | --- |
| 0 | `exp0-latency` | async write model; does naive ingest-then-query miss? | search >0.9 post-extraction; confirmed you must pre-warm |
| 1 | `exp1-supersession` | **CRITICAL** — does a restatement supersede with lineage? (Beat 3) | numeric case → old `SUPERSEDED`, `/revisions` chain renders |
| 2 | `exp2-retraction` | retraction (waiver, no successor) vs supersession | one `SUPERSEDED` + one `RETRACTED` on screen |
| 3 | `exp3-handoff` | **CRITICAL** — officer handoff via group + personal-gate hazard (Beat 1) | a 2nd officer retrieves covenants he never ingested |
| 4 | `exp4-trigger` | un-metered `/trigger` recalls the Q3 fix in Q4 (Beat 2) | trigger returns the lesson; usage counter unchanged |
| 5 | `exp5-eval-toggle` | memory on-vs-off (Beat 4, for judge Jiao) | recall injects lineage-aware context (LLM call is a build TODO) |
| 6 | `exp6-quota` | free-tier limits, throttling | known caps + reset; every beat reads pre-warmed data |

## Already confirmed (harness verified July 22)

- The raw wrapper authenticates against `https://api.production.xtrace.ai` (`/v1/usage` returns).
- **Free-tier quota is generous → Exp 6 mostly resolved:** `rate_limit_req_per_min: 30`,
  monthly `messages_ingested: 10,000`, `searches: 5,000` (resets month-end). Demo-day 429 risk is
  low; still pre-warm so no beat waits on live extraction.

## Greenlight

Build the belief-revision demo only if **exp1, exp3, exp4, exp5 pass**. If **exp1 fails on both
numeric AND legal phrasing**, don't rely on auto-supersession — write `supersedes` links
explicitly via the API and reframe as "curated lineage," decide Friday.

## Known unknowns baked into the scripts (verify Thursday, flagged in-code)

- `xtrace-http.js` auth is `Authorization: Bearer` + `x-org-id` — if a raw call 401s, try `x-api-key`.
- `updateMemoryGroups` PATCH path is a **best guess** — verify against docs.xtrace.ai.
- `exp2` retraction and `exp4` directive/trigger-entity storage may need specific phrasing or an
  API flag — the scripts attempt the natural path and print what actually happened.
