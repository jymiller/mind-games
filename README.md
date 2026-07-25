# Deal Memory

**Institutional memory for private credit.**

A covenant runs 5 to 20 years. The officer who negotiated it is in the seat about three. So the loan
outlives the person — and the *reasons* leave with them.

> **Live demo → https://deal-memory.onrender.com**
> *(free tier: it sleeps when idle, so the first request can take a minute)*
>
> The deployed build can lag this repo. **`GET /api/scenes`** returns the `built` flag for every scene
> straight from the registry the site renders from. That endpoint, not this README, is the authority on
> what is live right now.

Built at the **Mind Games AI Hackathon** (Stanford, 25 Jul 2026 · theme: *agents that remember*) on the
**XTrace Memory API**. An [Enid](https://enidpa.com) use case — covenant monitoring framed as a memory
problem: after the ink dries, the information is lost.

---

## The flip

Thornwick Logistics certified Q1 2026 leverage at **6.47×** against a **≤ 6.50×** covenant. Compliant,
green, signed.

Then the FY2025 audit landed. £3.0m of synergy add-backs disallowed, £1.7m of revenue reversed, £0.3m
of transaction costs reclassified as recurring — **£5.0m gone**. LTM EBITDA falls £34.0m → £29.0m.
Net debt never moves.

```
certificate:  6.47×  COMPLIANT   ← what the borrower told the lender
recompute:    7.59×  BREACH      ← what is actually true
```

Same quarter. Same covenant. Opposite verdict. A breach nobody filed.

## Why that's hard

Retrieval only ever **adds**. Revision can **take away**. Three parts a vector store doesn't have —
and we're explicit about which of them we actually built:

| | | Status |
|---|---|---|
| **Detection** | Deciding a restated figure *supersedes* the prior one rather than landing as a second, conflicting fact. | **Not ours.** The restatement is a later document that declares what it supersedes, ingested after the certificates. Automatic supersession is the open problem here, not a feature we claim. |
| **Lineage** | The prior fact isn't overwritten. XTrace keeps it and links revisions (`getRevisions`, `src/xtrace.js`). | **Platform capability, not on screen.** Scene 5 would render it; not built. No as-of query in this build. |
| **Propagation** | Everything **derived** from a revised fact is **re-derived** — the ratio *and the verdict*. | **Built.** One pure `assess()` runs twice over the same period: once on the certified EBITDA, once on the revised one. Both the ratio and the verdict come back changed. |

Propagation is the proof. You can hand-wave a storage layer. You can't hand-wave a conclusion that
noticed its input died and went back and re-derived itself.

## What's built

| | Scene | Status |
|---|---|---|
| 1 | **The Lane** | built — title card |
| 2 | **The Recall** | built — the deal card, every row carrying its source |
| 4 | **The Flip** | built — recomputes live against XTrace; falls back to a frozen capture labelled `PRERUN` if the API is unreachable |
| 6 | **The Ablation** | built — renders empty; scores arrive only from the live run you trigger |
| 3 · 5 · 7 · 8 | The Drift · The Chain · The Gate · The Open Box | **not built** — each renders an explicit "Not built yet." placeholder |

An empty seat beats a mock. Check this table against `GET /api/scenes`, and against the deployed
instance, which may be a build behind.

## Verify it without trusting us

```bash
npm run check:flip        # 13 assertions — no API key needed (falls back to PRERUN)
npm run check:ablation    # 8 assertions — pure, no network, no key
```

`check:flip` asserts the thing that matters: the certificate says COMPLIANT and `assess()` returns
BREACH for the same period, from the same code path. `src/deal.js` knows nothing about Thornwick and
branches on no literal ratio. The certificate figures are parsed out of
`fixtures/thornwick/03-compliance-certificates.md`, never hand-typed.

## The ablation prints no score

`src/ablation.js` runs the same five questions twice against the same model at `temperature: 0` — one
arm with the context XTrace composed, one with nothing. The grader is a deliberately dumb per-question
regex, identical for both arms. `n = 5`.

**Scene 6 renders empty on purpose.** Two arms reading `not run`, and a button. Every number arrives
from 10 live model calls made when you press it. Nothing is cached; a failed run shows the failure
rather than a stale score. `npm run check:ablation` asserts you can't hardcode it — mutate an expected
answer and the verdict has to move.

We're not printing a score we didn't watch happen. That's the whole point of the project.

## Honesty labels

Every scene declares its labels in `src/scenes.js` and carries them in the page chrome. They're
product UI, not disclaimers.

- **`SYNTHETIC DATA`** — invented. On every scene.
- **`LIVE …`** (`LIVE RECOMPUTE`, `LIVE RECALL`, `LIVE EVAL`) — that effect fires for real when the
  scene runs.
- **`PRERUN`** — a frozen capture standing in for a live call. If XTrace is unreachable, Scene 4 falls
  back to a 25 Jul capture, says so in the body, and reports `"label":"PRERUN"` on `/api/flip`.

One rough edge, named rather than hidden: the label strip renders a scene's *declared* labels even
above a "Not built yet." placeholder. Those are a declaration of what the scene does once it runs, not
a claim that something just fired. `/api/scenes` returns `labels` and `built` together so you can check
one against the other.

**All deal data is SYNTHETIC.** Thornwick, Halveston, Ardenmoor — every entity, person and figure is
invented. No real borrower, no Enid IP. Nothing real fires on stage.

## Two stores, deliberately apart

So the build process can't influence how the application reasons:

| | Store | Scope |
|---|---|---|
| **Domain** — what the app reasons over | XTrace **Memory API** | `user_id=deal-memory`, `app_id=deal-memory-domain` |
| **Dev** — how we built it | a **MemHub** brain (a different product) | the app never queries it |

`searchDomain()` in `src/xtrace.js` hardcodes the domain scope, so a caller can't accidentally issue an
unscoped search — that's the one path by which a build note could reach covenant recall.

## Run it

```bash
cp .env.example .env      # XTRACE_API_KEY for scene 4; NOVITA_API_KEY + NOVITA_MODEL for scene 6
npm install
npm start                 # binds process.env.PORT on 0.0.0.0
```

`server.js` is zero-dependency Node core; the one runtime dependency is the XTrace memory client. The
arithmetic is `src/deal.js`, the scenes are `src/scenes.js`, the eval is `src/ablation.js`, and the
synthetic corpus is in `fixtures/thornwick/` and `fixtures/halveston/`.

The corpus was ingested into the XTrace domain scope in document order — credit agreement, then the
certificates, then the restatement, then the amendment and waiver — because later facts must supersede
earlier ones. The store is pre-loaded; the ingest script sits with private build notes and is not part
of this repo.

---

**MILBIRD** — John Miller, solo build. Mind Games AI Hackathon, Stanford, 25 Jul 2026.
