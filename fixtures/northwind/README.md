# Synthetic deal package — "Northwind Aggregates" (SYNTHETIC)

> **⚠ SYNTHETIC — FICTIONAL ENTITIES, FOR DEMO / TESTING ONLY.**
> Northwind Aggregates, Meridian Equity Partners, Blackford Credit Partners, Halloran LLP, and
> Brandt Regional Advisors are invented. No real deal, borrower, lender, or firm is depicted.
> Numbers are constructed to exercise the Deal Memory covenant-monitoring demo. Swap in Enid's
> real (sanitized) documents when they land.

A complete private-credit deal set built to the spec: a credit agreement with numeric covenants
and an EBITDA definition, an amendment that changes the terms, two compliance certificates, and a
restatement that flips a previously-compliant quarter into breach.

## The deal at a glance

| | |
| --- | --- |
| Borrower | Northwind Aggregates, Inc. (building materials) |
| Sponsor | Meridian Equity Partners |
| Lender / Admin Agent | Blackford Credit Partners LLC |
| Facility | $300.0M Senior Secured Term Loan B (closed Mar 15, 2025) |
| Leverage covenant | Total Net Leverage ≤ **6.50x** (FY2025; steps to 6.00x in 2026) |
| Interest coverage | ICR ≥ **2.00x** |
| EBITDA definition | includes pro-forma synergy add-backs, originally capped at **25%** |
| Equity cure | up to 2 per fiscal year, 5 over the life |
| Original auditor | Halloran LLP (national) |

## The story the numbers tell (the answer key)

| Event | EBITDA | Net Debt | Leverage | Verdict |
| --- | --- | --- | --- | --- |
| **Q2 2025** as originally certified (auditor Halloran) | $50.0M *(incl. $7.0M synergies)* | $295.0M | **5.90x** | ✅ COMPLIANT |
| **First Amendment** (Sep 30 2025) | +$25M incremental TL · synergy cap 25% → **15%** + auditor attestation required | | | |
| **Auditor change** | Halloran LLP → **Brandt Regional Advisors** (Aug 2025) | | | |
| **Q3 2025** current period (auditor Brandt) | $47.5M | $302.0M | **6.36x** | ✅ compliant *on its face* |
| **Q2 2025 RESTATED** (synergies disallowed) | **$43.0M** | $295.0M | **6.86x** | 🔴 **RETROACTIVE BREACH** |

**The whole demo in one line:** a quarter everyone signed off as compliant (Q2, 5.90x) becomes a
breach (6.86x) once the $7.0M synergy add-backs are disallowed and EBITDA is restated $50.0M → $43.0M
— caught only because the agent *remembered* Q2 and re-checked it when the auditor changed.

## How each document maps to the demo beats

| Beat | Mechanism | Powered by |
| --- | --- | --- |
| **1 · Handoff** | groups / shared memory | agreement ingested by officer A, read by officer B |
| **2 · Tripwire** | `trigger` on `auditor_change` | the Q3 cert's auditor switch fires the "re-examine prior add-backs" playbook |
| **3 · Retro-breach** | `supersedes` chain | Q2 EBITDA `$50.0M` superseded by `$43.0M` → Q2 leverage recomputes → COMPLIANT flips to BREACH |
| **4 · Memory on/off** | `recall` vs cold | with memory, Q2's hidden breach surfaces; without, Q3 reads green and the agent moves on |
| Fallback · Capacity ledger | cross-session count | equity cures: 2/year allowed, Q2 cert shows 1 used — a later request can be rejected |

## Feeding these to XTrace (per the proven recipes)

Raw document text extracts *many* facts, but the two hero beats need canonical phrasings:

- **Supersession (Beat 3)** — ingest the restated value as the *same canonical fact*:
  1. `"Northwind Aggregates' Q2 2025 Consolidated EBITDA is $50.0M."`
  2. `"Northwind Aggregates' Q2 2025 Consolidated EBITDA is $43.0M."`  → old superseded, chain forms.
- **Covenant fact** — `"Northwind Aggregates' total net leverage covenant is 6.50x."`
- **Trigger directive (Beat 2)** — name the exact identifiers the action will carry:
  `"Rule for the review_cert tool on Northwind Aggregates: when the auditor changes, re-examine prior-period synergy add-backs and recompute leverage on the disallowed basis."`
  then `trigger({ action: { tool: "review_cert", args: { deal: "Northwind Aggregates", event: "auditor_change" } } })`.
- Ingest documents themselves with `extract_artifacts: true` to populate the **artifact** type (cert / agreement as versioned documents), and always `{ wait: true }` — pre-warm.

## Files

- `01-credit-agreement.md` — the facility, covenants, EBITDA definition, equity cure, reporting.
- `02-first-amendment.md` — incremental loan + tightened EBITDA add-back rules.
- `03-compliance-certificate-Q2-2025.md` — original, COMPLIANT (auditor Halloran).
- `04-compliance-certificate-Q3-2025.md` — new auditor, restatement note, the retroactive breach.
