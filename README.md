# mind-games (private, WIP)

Entry for the **Mind Games AI Hackathon** — Sat July 25, 2026, Stanford (one day,
~5 hrs on-site; prebuilding encouraged). Theme: **agents that remember**, built on the
**XTrace Memory API**. An [Enid](https://enidpa.com) use case — covenant monitoring as a
memory problem ("after the ink dries, the information is lost").

## Setup

```
cp .env.example .env      # paste XTRACE_API_KEY (xtk_...) and XTRACE_ORG_ID
npm install
npm run smoke             # ingests + searches one memory to verify the key
```

XTrace's four memory types map onto covenant monitoring: **Semantic** (covenant terms),
**Episodic** (each quarter's events), **Artifact** (the compliance certs), **Procedural**
(how to recompute / handle a restatement) — compounding over the life of the loan.
