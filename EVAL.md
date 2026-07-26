# A formal evaluation of memory under revision

This measures one narrow, falsifiable thing:

> When the system of record corrects a figure, does the memory return the corrected value —
> or does it still return the old one, or both?

It exists because the claim this project makes ("memory that can revise a belief, not just
accumulate") is either true and measurable or it is marketing. The numbers below are whatever
the run produced. Nothing here is hand-picked.

## Design

Postgres is the **source of truth**. Memory holds a **derived copy**. The evaluation is the gap
between them.

That arrangement is what makes the evaluation possible at all. The database knows the current
value of every measurement *and* every value it previously held, so "correct", "stale" and
"contradictory" are decidable without a human or a model judging anything.

```
Postgres (truth)  ──sync──▶  memory (copy)  ──probe──▶  answer  ──compare──▶  verdict
     │                                                                            ▲
     └──────────────── current value + every superseded value ────────────────────┘
```

## Protocol

Changing any of this invalidates comparison with earlier runs.

| | |
|---|---|
| **Population** | Every measurement synced from the database (`memory_sync`, status `live`). Currently 26. |
| **Scope** | `user_id: deal-memory`, `app_id: deal-memory-eval` — a corpus derived entirely from Postgres and rebuildable from scratch. Deliberately **not** the hand-built demo corpus, which carries a day of ad-hoc history. |
| **Probe** | One search per measurement. The question is generated from the measurement's *identity* (`thornwick:ebitda:2026-03-31`), never from the sentence stored in memory — otherwise the probe hands memory the answer. |
| **Search mode** | `compose`, limit 6. |
| **Expected** | The value the database holds now. |
| **Superseded** | Every earlier value the database held for that same measurement. |
| **Scoring** | Deterministic string matching on the value, tolerant of format (`29`, `29.0`, `GBP 29.0m`). No model judges the result, so the same corpus scores the same way twice. |

### Verdicts

| Verdict | Meaning |
|---|---|
| `correct` | Expected value present, no superseded value present. |
| `stale` | A superseded value present, expected absent. Memory is answering with a retired figure. |
| `contradictory` | **Both** present. Memory holds two answers to one question and lets the reader choose. |
| `not_stored` | The fact never reached memory at all — a write-side loss. |
| `wrong` | The fact *is* in memory, but the probe returned a different row — a read-side failure. |
| `absent` | No rows returned at all. |

`not_stored` and `wrong` are separated on purpose. From the outside they look identical and
their causes are opposite: one is retention, one is retrieval. Collapsing them hides which half
is broken. Run 1 predates the split, which is why its 9 failures are unclassified.

## Reproducing a run

```bash
npm run db:seed         # schema + the fixture corpus, in Postgres
npm run memory:sync     # push the source of truth into the eval scope
npm run eval            # probe every measurement, write results to eval_run / eval_result
```

Every run is stored with its git commit, scope, search mode and counts, so a later number can
be argued against an earlier one.

## Results

| Run | Commit | Probes | Correct | Stale | Contradictory | Not stored | Wrong | Absent |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| 1 | `aa9c2a1` | 26 | 17 (65%) | 0 | 0 | *(not split)* | 9 | 0 |
| 2 | `aa9c2a1` | 26 | 16 (62%) | 0 | 0 | 7 (27%) | 3 (12%) | 0 |
| 3 | `aa9c2a1` | 26 | 17 (65%) | 0 | 0 | 6 (23%) | 3 (12%) | 0 |

Run 3 was taken **after** a revision was introduced (below).

## Findings

**1. Revision works, when the writer controls fact identity.** Between runs 2 and 3 a real
correction was applied in Postgres — a further £4.0m disallowed at the 30 June 2026 test date —
changing two measurements:

```
thornwick:ebitda:2026-06-30    34.0            ->  30.0
thornwick:verdict:2026-06-30   6.47 COMPLIANT  ->  7.33 BREACH
```

Both came back **`correct`** in run 3. Memory returned the new figures and did not return the
retired ones. Across all three runs: **zero stale, zero contradictory.**

This matters because it contradicts what the hackathon build concluded. Four attempts to force
a revision chain failed then, and it looked like a platform limitation. It was not. The problem
was that nothing owned the *identity* of a measurement, so there was no old value on record to
retire. Once `fact_key` names the measurement and the value is allowed to change under it,
revision behaves.

**2. The real failure is individuation at write time, not revision.** 23–27% of facts never
reach memory. They are not random:

```
halveston:certified_ebitda:2024-06-30
thornwick:certified_ebitda:2025-12-31
thornwick:certified_ebitda:2026-03-31
thornwick:certified_ebitda:2026-06-30
thornwick:ebitda:2025-12-31
thornwick:ebitda:2026-03-31
```

Every one is an earnings figure, and the corpus contains several earnings figures whose values
coincide (34.0 appears at two test dates; 29.5 at two more). The extractor appears to treat
"EBITDA is 34.0" as a fact it already holds and drops the duplicate — losing *which quarter it
belonged to*. The date is not part of the fact's identity.

**3. The same root cause shows up again at read time.** A further 12% are stored but return a
different row: all three are net debt, where 220.0 appears at two test dates. Written, but not
distinguishable when asked for by date.

So one mechanism — dates not participating in fact identity — accounts for every failure in the
run, at both ends of the pipeline.

**4. Retrieval is not deterministic.** One measurement flipped between runs 1 and 2 on an
unchanged corpus. Single runs should not be quoted to the percentage point.

## Limitations

Stated plainly, because a 26-probe evaluation is small.

- **n = 26**, one corpus, two borrowers, five test dates. Directional, not conclusive.
- **The corpus is synthetic** and was written to tell a story, which is exactly why values
  coincide across quarters. Real filings would collide differently — possibly less, possibly
  more.
- **Scoring is substring-based.** A correct answer phrased in a way the patterns miss would
  score wrong. It is conservative in that direction, never generous.
- **`not_stored` is inferred** by listing the corpus and looking for the sentence, so an
  extraction that reworded a fact heavily could be misfiled as never stored.
- **One search mode.** `retrieve` was not measured here; earlier work found it ranked these
  answers materially worse than `compose`.
- **Revision was tested twice, not systematically.** Two measurements, one direction
  (down), one at a time. It has not been tested under concurrent revisions or a value that
  reverts to a figure it previously held — which would be the harder case, since a reverted
  value is indistinguishable from a duplicate under finding 2.

## What would move the numbers

- Make dates part of the sentence's subject rather than a modifier, and re-measure retention —
  the cheapest test of finding 2.
- Sync each measurement into its own conversation and compare.
- Grow the corpus so no two measurements share a value, then re-run: if retention goes to 100%,
  finding 2 is confirmed as value-collision dedup.
