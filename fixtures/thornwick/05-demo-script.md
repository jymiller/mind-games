> **FICTIONAL — created for demonstration.** All entities, persons and figures
> are invented. Contains no confidential or non-public information.

# How to run the memory demo — Thornwick Logistics

The whole demo is one contrast: **a stateless reader sees each document fresh; a
system with memory remembers what the earlier certificate claimed and catches
that it is no longer true.** Everything below is built to make that difference
visible in about five prompts.

## Setup

Ingest the documents into your memory service **in this order** (order matters —
the point is that later facts revise earlier ones the system has already stored):

| # | Ingest | Establishes in memory |
|---|---|---|
| 1 | `01-credit-agreement-excerpt.md` | The covenant terms: leverage ≤ 6.50×, ICR ≥ 2.00×, the EBITDA add-back rules |
| 2 | `03` — **Q4 2025** certificate | Baseline: Q4 compliant, leverage 6.35×, ICR 2.10× |
| 3 | `03` — **Q1 2026** certificate | Q1 certified **compliant**, leverage **6.47×**, ICR 2.06× — thin headroom |
| — | *(pause and ask — see Q1 below)* | |
| 4 | `04-restatement-extract.md` | FY2025 audit: Q1 LTM Adjusted EBITDA restated **£34.0m → £29.0m** |
| 5 | `02-amendment-and-waiver.md` | Waiver of the breach; leverage reset **6.50× → 7.25×** |

## The five questions (and the answers that prove memory)

**Q1 — after step 3, before the restatement:**
> "Is Thornwick compliant with its leverage covenant for Q1 2026?"

*Expected:* **Yes — 6.47× against a 6.50× limit, compliant** (but note the thin
headroom). This is the baseline both a stateless and a memory system get right.

**Q2 — the money question, after step 4 (the restatement):**
> "Given the FY2025 restatement, is Q1 2026 still compliant?"

*Expected (the flip):* **No.** Q1 2026 was *previously certified* compliant at
6.47×, but on the restated EBITDA of £29.0m the leverage is **7.59× — a breach**
(and ICR falls to 1.76×, also a breach). *A memory system produces this by
recalling the Q1 certificate it stored in step 3 and reconciling it against the
restatement. A stateless reader of document 04 alone cannot say "previously
certified compliant" — it never saw the certificate.*

**Q3 — the driver:**
> "What caused the Q1 2026 covenant breach?"

*Expected:* An **EBITDA restatement, not a change in debt** — £5.0m removed,
mostly a **£3.0m run-rate-synergy add-back that did not qualify**, plus £1.7m of
revenue recognised too early. Net Debt (£220.0m) never moved.

**Q4 — the amendment (the "term changed" beat), after step 5:**
> "What is Thornwick's leverage covenant level, and what happened to the breach?"

*Expected:* The level **is now 7.25× — it was 6.50×** (Amendment & Waiver No. 1,
28 Aug 2026), and the Q4 2025 / Q1 2026 breaches were **waived** as part of that
amendment. *Memory should hold both the old and the new level and know which
applies when.*

**Q5 — the tripwire (nice-to-have):**
> "Who audits Thornwick, and has anything about the audit changed?"

*Expected:* FY2025 was audited by **Marbury Tolland LLP**, a **change** from
Larkfield Downe LLP (FY2024) — and the new auditor is what surfaced the
restatement. *"Auditor changed → re-scrutinise the prior add-backs" is a playbook
a memory system can pre-arm from this single fact.*

## What "good" looks like

A memory-capable system, asked Q2, should do three things a fresh-context reader
cannot:

1. **Recall the superseded claim** — "Q1 was *certified* compliant at 6.47×."
2. **Apply the later fact to the earlier one** — restated EBITDA → 7.59× breach.
3. **Explain the delta over time** — the term was 6.50×, the EBITDA was £34.0m;
   both were later revised, and the revision is what breaks compliance.

If the demo answers Q2 with only "document 04 shows a breach," the memory layer
is not doing its job — it is re-reading, not remembering. The Thornwick pack is
built so that difference is unmissable.
