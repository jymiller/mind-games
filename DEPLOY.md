# DEPLOY — getting a live URL

**Status: READY TO DEPLOY, BLOCKED ON ONE HUMAN STEP.**
Everything below is built and verified locally. Nothing has been committed, pushed, or deployed.

---

## The blocker, in one line

**Render deploys from GitHub, and the service code is not on GitHub yet.**

`github.com/jymiller/mind-games` `main` is at `08a50c6` ("Scaffold mind-games") — which has **no
`server.js` and no `start` script**. `server.js`, `render.yaml`, `src/scenes.js` and the `package.json`
`start` script are all **uncommitted working-tree changes**. Render cannot see them.

I cannot commit or push without John's explicit confirmation. **That is the only thing standing
between here and a live URL.**

## What is already done and verified

| Item | Status |
|---|---|
| `server.js` — zero-dep Node http, binds `process.env.PORT` on `0.0.0.0` | built |
| `GET /` → Scene 1 title card | **verified 200** locally |
| `GET /healthz` → `ok` | **verified 200** locally |
| `GET /api/scenes` → scene manifest JSON | **verified 200** locally |
| `GET /scene/:id` → scene, or an honest "not built yet" placeholder | **verified 200** locally |
| unknown route → 404 | **verified** |
| `package.json` `"start": "node server.js"` | added |
| `render.yaml` blueprint, all secrets `sync: false` | written |
| Render API key valid; owner `tea-d9him5vlk1mc73e2bm3g` ("John's workspace") | **verified 200** |

Local proof: `PORT=4599 node server.js` → `/` 4,317 bytes, title card renders
"A 20-year loan outlives the loan officer."

## Step 1 — John: approve the push (30 seconds)

```bash
cd ~/Downloads/source/mind-games
git add server.js src/scenes.js render.yaml package.json
git commit -m "Add deployable web service: Scene 1 title card + healthz + Render blueprint"
git push origin main
```

`.env` is gitignored (`.gitignore` now covers `.env*` with `!.env.example`) and is **not** in that
`git add`. Verify with `git status --short` before pushing — no `.env` should appear.

> Everything else (`INFRASTRUCTURE.md`, `BUILD-LOOP.md`, `memory/`, `fixtures/`, `experiments/`) is
> deliberately left uncommitted for John to review and stage separately.

## Step 2 — create the Render service

### Option A — dashboard (recommended, ~2 min)

1. render.com → **New** → **Blueprint**.
2. Connect the repo **`jymiller/mind-games`**. It is **private** — if it isn't listed, click
   *Configure account* on the GitHub connection and grant Render access to this repo specifically.
3. Render reads `render.yaml` and proposes one web service, **`deal-memory`**.
4. It will prompt for the four `sync: false` values. Paste from `.env`:
   - `XTRACE_API_KEY`
   - `XTRACE_ORG_ID`
   - `NOVITA_API_KEY`
   - `NOVITA_MODEL`
   The four `XTRACE_*_ID` / `NAMESPACE` scope names and `NODE_VERSION` are already in the blueprint —
   they are not secrets, leave them.
5. **Apply.** First build ~2 min. URL will be `https://deal-memory.onrender.com`
   (or `deal-memory-<hash>` if the name is taken).
6. Confirm: `curl -s -o /dev/null -w "%{http_code}\n" https://deal-memory.onrender.com/healthz` → `200`.

### Option B — API (once the push has landed, I can run this)

```bash
curl -sX POST https://api.render.com/v1/services \
  -H "Authorization: Bearer $RENDER_API_KEY" \
  -H "content-type: application/json" \
  -d '{"type":"web_service","name":"deal-memory","ownerId":"tea-d9him5vlk1mc73e2bm3g",
       "repo":"https://github.com/jymiller/mind-games","branch":"main","autoDeploy":"yes",
       "serviceDetails":{"env":"node","region":"oregon","plan":"free",
         "envSpecificDetails":{"buildCommand":"npm ci","startCommand":"npm start"},
         "healthCheckPath":"/healthz"}}'
```
Then set the four secrets via `PUT /v1/services/{id}/env-vars`. **Caveat:** the API path still needs
Render's GitHub app to already have access to this *private* repo. If it doesn't, the call fails and
you are back to Option A step 2 anyway — so **Option A is the faster route from a cold start.**

## Step 3 — before 15:15

- **Make the repo public** (battle plan: a dead link at judging is a silent zero).
- Warm the URL at 15:00 — free tier cold-starts ~50 s.
- **Demo from localhost**, not from Render. The Render URL is for the judges' link and the submission.

## Gotchas already handled

- Binds `process.env.PORT` and `0.0.0.0` — the two most common Render first-deploy failures.
- `healthCheckPath: /healthz` matches a real route that returns 200.
- `npm ci` works: `package-lock.json` is committed and in sync.
- Zero runtime deps beyond `@xtraceai/memory`, so the build is fast and can't break on a transitive.
- No secret value appears in `render.yaml`, `.env.example`, or any tracked file.

## Adding scenes later — no rewrite needed

`src/scenes.js` is a registry. Scenes 2–8 are already declared with their honesty labels and
`built: false`, and render an honest placeholder. To ship one: add a `render()` and flip
`built: true`. The strip, routing, labels and footer all pick it up automatically.
