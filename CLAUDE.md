# mind-games — "Deal Memory"

Build repo for the Mind Games AI Hackathon (Sat 2026-07-25, Stanford; agent-memory theme, presented
by XTrace). Solo builder: John. **Feature freeze 14:30 · submit 15:15 · demos 16:00.**

## Connect to the shared build brain FIRST

You have MemHub tools (`mcp__plugin_memhub_memhub__*`). Before anything else, connect to the
cross-session build brain so you inherit what earlier sessions already learned:

- Brain: **"Mind Games — Deal Memory build"** · `agent_brain_id: 581ff76b-abb4-4b66-ac1b-a910916968c0`
  (find it with `list_agent_brains` if the id has changed).
- `search_memory(agent_brain_id=…, query="gotchas and corrections")` before you debug anything —
  it holds a day of paid-for corrections (two separate XTrace products; the Claude integration is the
  **MemHub plugin**, not `claude mcp add xtrace`; the SDK throws `orgId is required`; `/v1/usage`
  counters lag so verify with search; MiniMax TTS returns HTTP 200 with an error in the *body*).
- **Write back.** On a notable decision or a costly gotcha, call `add_memory(agent_brain_id=…,
  conversation_id="mind-games-2026-07-25", …)` — what you decided, why, what you rejected.

**Two memories, kept apart on purpose** (John's explicit requirement — the build must not influence
how the application thinks):

| | Store | Scope |
|---|---|---|
| **Domain** (the app reasons over this) | XTrace **Memory API** | `user_id=deal-memory`, `app_id=deal-memory-domain` — read via `searchDomain()` in `src/xtrace.js` |
| **Dev** (how we build) | **MemHub** brain above | a different product entirely |

Never write build notes into the domain scope, and never let the application query MemHub. An
**unscoped** domain search is the contamination vector — `searchDomain()` hardcodes the scope so a
caller can't issue one.

## Start here, in this order

1. **[`HANDOFF.md`](HANDOFF.md)** — where everything lives, the proven XTrace recipes, ground rules.
2. **[`INFRASTRUCTURE.md`](INFRASTRUCTURE.md)** — the stack, verified ground truth, exact call shapes,
   the XTrace domain-vs-dev memory split, and the DECISION NEEDED list.
3. **[`BUILD-LOOP.md`](BUILD-LOOP.md)** — the 8 scenes as gated build steps with one acceptance check
   each. Build order is 2 → 4 → 6 first.
4. **[`memory/`](memory/README.md)** — cross-session build memory. Read `STRATEGY.md` and
   `RESOURCES.md`; append to `BUILD-LOG.md` when you decide something.
5. **[`DEPLOY.md`](DEPLOY.md)** — **LIVE at https://deal-memory.onrender.com** (verified 200 on `/`
   and `/healthz`). Repo is public; autoDeploy is on, so a push to `main` redeploys. Free tier spins
   down when idle — the first hit after a quiet spell takes ~20s, so **warm it before demoing.**

`npm start` runs the web service (`server.js`, zero-dep, binds `process.env.PORT` on `0.0.0.0`).
Scenes live in `src/scenes.js` — Scene 1 is built; 2–8 are declared and drop in without a rewrite.

## Non-negotiables

- **ENID is the use case, not an integration.** No Enid code, data, or IP in this repo.
- **All fixtures are SYNTHETIC.** Thornwick, Halveston, Ardenmoor, every person and figure is
  invented. `fixtures/thornwick/` is canonical.
- **Honesty labels are product UI, not disclaimers.** Every effect on screen carries `LIVE`,
  `PRERUN`/`REPLAY`, or `SYNTHETIC`. Nothing real fires on stage.
- **Never commit `.env`.** It is gitignored; keep it that way.
- **Never commit or push without John's explicit confirmation.** No exceptions, no `--no-verify`.
- Zero-dep Node core (the XTrace SDK is the one dependency). Minimum complexity.
- **Verify visuals before shipping** — headless render (`prep/shot.mjs`) then read the PNG.

## Build loop discipline

Write the acceptance check before the code. **Max 3 fix attempts** on a failing check, then stop and
escalate rather than thrash. Append the decision to `memory/BUILD-LOG.md`.

## Repo shape

`src/` XTrace client — `xtrace.js` is **raw HTTP** (the SDK is unusable: it demands an `orgId` we no
longer have) exporting `searchDomain`, `ingest`, `search`, `listMemories`, `getRevisions`;
`xtrace-http.js` is now just a deprecation re-export ·
`fixtures/` synthetic deal corpus · `experiments/` the Jul-22 de-risking harness (exp0–exp6, all
proven live) · `memory/` cross-session build memory · `prep/` prep artifacts + headless screenshotter.
