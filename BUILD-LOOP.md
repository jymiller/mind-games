# BUILD-LOOP — Deal Memory, 8 scenes as gated steps

**Clock: feature freeze 14:30 · reliability window 14:30–15:15 · SUBMIT 15:15 · demos 16:00.**
14:30 is earlier than instinct wants. That is the point.

## The rule

1. **Write the acceptance check before the code.** One check per step. If you can't state the check,
   you don't know what you're building yet.
2. **Max 3 fix attempts.** Three failed attempts on the same check → stop, write what you tried in
   `memory/BUILD-LOG.md`, and either cut the step or ask John. Do not attempt four.
3. **A step is done when its check passes and is committed to working tree.** Not when it looks right.
4. Every prop carries its honesty label: `SYNTHETIC` data · `LIVE` recompute · `PRERUN`/`REPLAY` cached.

## Build order

Scenes **2, 4, 6** are the demo. Build those three first — they are three separate props. Scenes
**3, 5, 7** are one screen each on the same data and are cheap once 2/4/6 exist. Scene **8** must be
pre-warmed before you walk on. Scene **1** is finished at 10:30 with a judge's own sentence.

---

### Step 0 · Unblock (do this first, ~10 min)
- Paste `NOVITA_API_KEY` into `.env` (missing right now — Scenes 6 and 8 are dead without it).
- `curl` the model list, pin `NOVITA_MODEL` in `.env` (see INFRASTRUCTURE.md §3).
- Pre-warm ingest: Thornwick in document order — agreement → Q4 cert → Q1 cert → restatement →
  amendment/waiver. Then Halveston. Ingest is ~18s each; start it and build while it runs.

**Check:** `npm run smoke` passes AND a search for the covenant returns the Thornwick row with score > 0.9.

---

### Step 1 · Scene 2 — The Recall (Deal Memory Card) ★ first
The card: covenant definition, *why* the threshold is 6.50× not 7.00×, prior-restatement count, last
attestor (R. Vance, who has since left), a provenance line under every row. Status reads **COMPLIANT
6.47×** here — that is the trap you spring in Step 2.

**Check:** every row renders a source line, and **no row is hardcoded in the component** — kill the
XTrace call and the card must go empty, not stale.

---

### Step 2 · Scene 4 — The Flip ★ the money shot
Restatement lands: £3.0m of add-backs disallowed → LTM EBITDA £34.0m → £29.0m, net debt £220.0m
unchanged → **6.47× COMPLIANT becomes 7.59× BREACH**. The verdict is **re-derived**, not swapped.

**Check:** `assert flip === true` — the certificate says COMPLIANT and `assess()` returns BREACH for
the same period, from the same code path, with no branch on a literal.

---

### Step 3 · Scene 6 — The Ablation ★ highest value (Jiao decides on this)
The same five questions, twice, same model, same prompts, `temperature: 0`, memory injected or not.
Score live: **memory ON 5/5 · memory OFF 2/5**, labelled `n = 5`. **Accuracy delta, not cost/latency.**

**Check:** both arms run live from one button and the scores are **computed from the run, never
hardcoded** — change an expected answer and the displayed score must move.

---

### Step 4 · Scene 5 — The Chain (lineage)
`getRevisions(id)` → retracted facts struck through with `supersedes` pointers, derived nodes marked
invalidated, plus an "as of" query returning the then-active view, labelled.

**Check:** a query as-of a past date returns only facts active at that time; superseded facts come
back **marked, not hidden**.

---

### Step 5 · Scene 7 — The Gate
Agent **proposes** the reservation-of-rights notice and is **DENIED**; a human credit officer attests;
only then does it commit to the local SYNTHETIC register. The attestation is itself remembered.

**Check:** **zero writes fire before attest** — assert the register file is byte-identical until the
button is pressed.

---

### Step 6 · Scene 3 — The Drift
Q3 filing renames `ebitda` → `adjusted_ebitda`. Caught by comparing the **field map** against the
remembered Q2 baseline, not the values. The learned mapping is written to procedural memory. The
naive value-only path runs beside it and stays green.

**Check:** the two paths provably diverge — value-only stays PASS while the fingerprint path flags
drift, and both are on screen at once.

---

### Step 7 · Scene 8 — The Open Box (pre-warm before you walk on)
Free-text recall over pre-warmed memory, backed by a frozen offline replay labelled `REPLAY` when
cached, plus a styled "that isn't in memory" state that never bluffs.

**Check:** **kill the wifi and run the question bank again** — it must still answer from replay,
visibly labelled.

---

### Step 8 · Scene 1 — The Lane (finish at 10:30)
Title card. One headline plus a slot for the judge's exact posted problem-statement sentence.

**Check:** renders full-screen at demo resolution and the judge-quote slot is a single obvious
constant to edit.

---

## 14:30 — FEATURE FREEZE

No new features. Reliability only:
- 3 clean golden runs end to end
- screen recording of a full run (your insurance if the laptop dies)
- one wifi-kill drill
- deploy to Render and **warm the URL**
- **15:15 SUBMIT** the repo link — make the repo public first. A dead link at judging is a silent zero.
- README's first screen: title card + architecture diagram + the ablation table.

## If you fall behind

Cut in this order: Scene 3 (Drift) → Scene 7 (Gate) → Scene 5 (Chain). **Never cut 2, 4 or 6.**
Scene 8 stays because it is pre-warmed, not built.
