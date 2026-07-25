# Deal Memory

**Institutional memory for private credit.** A covenant lives 5–20 years. The officer who negotiated
it leaves in about 3 — and the *reasons* leave with them.

> **Live demo → https://deal-memory.onrender.com**
> *(free tier — it sleeps when idle; the first request after a quiet spell can take up to a minute to
> wake, so give it a moment)*
>
> The deployed build can lag this repo. `GET /api/scenes` returns the `built` flag for every scene
> straight from the registry the site renders from — that endpoint, not this README, is the authority
> on what is live right now. A scene that isn't built returns an explicit **"Not built yet."**
> placeholder rather than a mock or a screenshot standing in for a live effect.

Built for the **Mind Games AI Hackathon** (Sat 25 Jul 2026, Stanford · theme: *agents that remember*),
on the **XTrace Memory API**. An [Enid](https://enidpa.com) use case — covenant monitoring framed as a
memory problem: after the ink dries, the information is lost.

---

## The money-shot

Thornwick Logistics certified Q1 2026 leverage at **6.47×** against a **≤ 6.50×** covenant — compliant,
green, signed. Then the FY2025 audit disallowed **£3.0m** of synergy add-backs, reversed **£1.7m** of
early revenue, and reclassified **£0.3m** of transaction costs as recurring — **£5.0m** removed in all.
LTM EBITDA falls **£34.0m → £29.0m**. Net debt never moves.

**True leverage: 7.59× — a breach.** The certificate still says compliant.

```
certificate:  6.47×  COMPLIANT   ← what the borrower told the lender
recompute:    7.59×  BREACH      ← what is actually true
```

The certificate figures are parsed out of `fixtures/thornwick/03-compliance-certificates.md`, never
hand-typed. The revised EBITDA comes back from memory. Both go through the same `assess()` in
`src/deal.js`, which knows nothing about Thornwick and branches on no literal ratio.
`npm run check:flip` is the acceptance check — 13 assertions, and it runs from a clean clone.

## Why this isn't RAG

Retrieval only ever **adds**. Belief revision can **take away**. Three parts a vector store doesn't
have — and we are explicit about which of them we actually built:

| | | Status today |
|---|---|---|
| **Detection** | Deciding a restated figure *supersedes* the prior one, rather than landing as a second, conflicting fact. | **Not ours.** The restatement is a later document that declares what it supersedes, ingested after the certificates, and the app asks memory for the restated figures by name. Deciding supersession automatically is the open problem here, not a feature we claim. |
| **Lineage** | The prior fact isn't overwritten. XTrace keeps it and links revisions — readable through `GET /v1/memories/{id}/revisions` (`getRevisions`, `src/xtrace.js`). | **Platform capability, not on screen.** Scene 5 "The Chain" is the screen that would render it: not built. There is no *as-of* query in this build. |
| **Propagation** | Everything **derived** from a revised fact is **re-derived** — the ratio *and the compliance verdict*. | **Built — Scene 4.** One pure `assess()` runs twice over the same test date: once on the certified EBITDA, once on the EBITDA memory has since revised. Both the ratio and the verdict come back changed. |

Propagation is the proof. You can hand-wave a storage layer; you can't hand-wave a conclusion that
was re-derived rather than swapped — and `npm run check:flip` asserts exactly that, on the same code
path, for the same period.

## Does the memory change the outcome?

**Specified and wired, but no score is printed here — because the only number worth trusting is one
you triggered yourself.**

The harness is `src/ablation.js`: the same five questions, the same model, `temperature: 0`, run
twice. The memory-ON arm gets the context XTrace composed for that question injected; the memory-OFF
arm gets an identical prompt with nothing. The grader is a deliberately dumb regex check per
question — auditable, and identical for both arms. `n = 5`.

Scene 6 renders **empty on purpose**: two arms reading `not run`, and a button. Every number on that
screen arrives from 10 live model calls made when you press it. Nothing is cached, and a failed run
shows the failure rather than a stale score.

`npm run check:ablation` asserts the property that makes the result trustworthy — mutate an expected
answer and the verdict must move, so the score cannot be hardcoded. It is pure: 8 assertions, no
network, no API key.

The claim we are willing to make *without* a run is structural, not statistical: without memory the
system cannot tell you this quarter was *previously certified compliant*, because it never saw the
certificate. That is an argument from the corpus, and we are not going to report it as a measurement.

## The gate — designed, not built

The control we intended: the agent finds the breach and **is not allowed to file it.** A covenant
determination needs a human credit officer's attestation; the agent doesn't hold that authority, so
it escalates with the full lineage attached — and the attestation would itself be written to memory,
so nobody is asked the same question twice. Ambiguous supersession would route here rather than be
auto-resolved.

**None of it is implemented.** There is no attestation register and no escalation path in this repo.
Scene 7 is `built: false` in `src/scenes.js` and renders a placeholder that says so. An empty seat
beats a mock.

## Honesty labels

Every scene declares its labels in `src/scenes.js` and carries them in the page chrome — they're
product UI, not disclaimers. What actually renders:

- **`SYNTHETIC DATA` / `SYNTHETIC REGISTER`** — invented data. On every scene.
- **`LIVE …`** (`LIVE RECOMPUTE`, `LIVE RECALL`, `LIVE EVAL`, `LIVE LINEAGE`) — that effect fires for
  real against the API when the scene runs.
- **`REPLAY`** — genuinely executed earlier, shown as a receipt.
- **`PRERUN`** — a frozen capture standing in for a live call. If XTrace is unreachable, Scene 4 falls
  back to a frozen 25 Jul capture, says so in the body text, and reports `"label":"PRERUN"` on
  `/api/flip`.

One rough edge, named rather than hidden: at time of writing the label strip renders a scene's
*declared* labels even above a "Not built yet." placeholder. Those labels are a declaration of what
the scene does once it runs, not a claim that something just fired. `GET /api/scenes` returns the
same `labels` and `built` pair, so you can check the two against each other.

**All deal data is SYNTHETIC.** Thornwick, Halveston, Ardenmoor — every entity, person and figure is
invented. No real borrower, no Enid IP. Nothing real fires on stage.

## How XTrace is used

The corpus is ingested as conversations and XTrace extracts from them — we do not assert a memory
type at write time. What the recall and the flip actually run on is extracted **semantic** facts,
each carried back to the screen with its own provenance row and score.

**Episodic** (each quarter's review as an episode), **artifact** (the compliance certificates as
versioned artifacts) and **procedural** (a recompute rule that fires on a restatement) are the
natural next mappings for covenant monitoring, and they are the ones that would compound over the
life of the loan. They are not wired in this build — procedural in particular is a separate channel,
answering to a trigger rather than to search.

Two stores, deliberately kept apart so the build process can't influence how the application reasons:

| | Store | Scope |
|---|---|---|
| **Domain** — what the app reasons over | XTrace **Memory API** | `user_id=deal-memory`, `app_id=deal-memory-domain` |
| **Dev** — how we built it | a **MemHub** brain (a different product) | XTrace axes `user_id=mg-build`, `app_id=mind-games-build`, `namespace=repo:mind-games` are reserved for build notes and never read by the app |

`searchDomain()` in `src/xtrace.js` hardcodes the domain scope, so a caller can't accidentally issue
an unscoped search — closing the one path by which anything written under the dev scope could reach
covenant recall.

## What's built, and what isn't

| Scene | Status |
|---|---|
| **1 The Lane** | built — static title card |
| **4 The Flip** | built — recomputes live against XTrace; falls back to a frozen 25 Jul capture labelled `PRERUN` if the API is unreachable |
| **6 The Ablation** | built — renders empty; the scores arrive only from the live run you trigger |
| 2 The Recall · 3 The Drift · 5 The Chain · 7 The Gate · 8 The Open Box | **not built** — each renders an explicit "Not built yet." placeholder |

Two things described above are design, not shipped code: the **as-of query** in the Lineage row
(Scene 5) and **the gate** (Scene 7). Supersession is carried by the ordering of the corpus, not
detected by us. The re-derivation in Scene 4 is real and verifiable offline.

`GET /api/scenes` is generated from the same registry the site renders from — check this table
against it, and against the deployed instance, which may be a build behind.

## Run it

```bash
cp .env.example .env      # XTRACE_API_KEY for scene 4; NOVITA_API_KEY + NOVITA_MODEL for scene 6
npm install
npm start                 # binds process.env.PORT on 0.0.0.0
```

Two checks you can run without a browser:

```bash
npm run check:flip        # 13 assertions — works with no API key (falls back to PRERUN)
npm run check:ablation    # 8 assertions — pure, no network, no key
```

`server.js` is zero-dependency Node core; the one runtime dependency in `package.json` is the XTrace
memory client. The arithmetic is `src/deal.js`, the scenes are `src/scenes.js`, the eval is
`src/ablation.js`, and the synthetic corpus is in `fixtures/thornwick/` and `fixtures/halveston/`.

The corpus was ingested into the XTrace domain scope in document order — credit agreement, then the
certificates, then the restatement, then the amendment and waiver — because later facts must
supersede earlier ones. Each document is ingested alongside a plain-language summary turn so that
extraction lands the figures. The XTrace store is pre-loaded; the ingest script sits with private
build notes and is not part of this repo.

## Team

**MILBIRD** — John Miller, solo build. Mind Games AI Hackathon, Stanford, 25 Jul 2026.
Repo: `github.com/jymiller/mind-games`