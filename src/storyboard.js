// The storyboard — design intent for all eight scenes, from the Mind Games storyboard.
//
// This is DESIGN INTENT, not data. It never supplies a figure to a live screen. Built
// scenes render it as a director's note beneath the real, live prop; unbuilt scenes
// render it INSTEAD of a prop, labelled so nobody mistakes a plan for an implementation.
//
// Deliberately omitted from the source storyboard: the "negotiated down from 7.00×"
// line, R. Vance as attestor, and the "2 prior restatements" count. None of those exist
// in fixtures/thornwick — the corpus has R. Sandoval and no 7.00× anywhere. A storyboard
// may describe a fixture that was never built; a page must not repeat it as fact.

export const STORYBOARD = {
  lane: {
    time: "0:00 – 0:12",
    shot: "Wide — you, not the screen. Laptop closed or ignored.",
    beat: "Curiosity. They expected a demo and got a problem.",
    said: "Everyone here is building memory today. I'm building it for the place where forgetting costs money. A private credit covenant lives twenty years. The officer who negotiated it is in the seat about three. So the loan outlives the person — and the reasons leave with them.",
    build: "A static title card. Not a route — a full-bleed panel in the same app shell so it doesn't look like slides.",
    mech: "Claims the empty lane before anyone can file you under 'another memory chatbot'.",
    check: "Renders full-screen at demo resolution; the judge-quote slot is a single obvious constant to edit.",
    who: ["all judges", "Parker · legibility"],
  },
  recall: {
    time: "0:12 – 0:40",
    shot: "Medium — screen fills the frame. Cursor traces each provenance line.",
    beat: "Recognition. Anyone who's inherited a job feels this.",
    said: "It's a quarter later. The officer who ran this deal has left. Instead of a cold dashboard, the agent hands the next person the reasons — what the covenant is, what this borrower has restated before, and who signed off last. Every line has a source.",
    build: "Deal Memory Card. Reads pre-warmed XTrace memory via the domain scope; renders value + provenance per row.",
    mech: "Provenance per row is what separates recall from a chatbot answer. The status reads COMPLIANT — the trap Scene 4 springs.",
    check: "Every row renders a source line; no row is hardcoded in the component.",
    who: ["Mazumdar · US Bank", "Parker"],
  },
  drift: {
    time: "0:40 – 1:00",
    shot: "Insert — tight on the two field names, old above new.",
    beat: "The first small alarm. Something is being hidden.",
    said: "Q3 arrives and the borrower has quietly renamed a line item. EBITDA is now 'adjusted EBITDA'. A normal pipeline shrugs — it can't find the field it wants, falls back to the last number it saw, and stays green. This one notices, because it remembers what the fields were called last quarter. And it writes the fix down, so it never solves this twice.",
    build: "fingerprint(fields) + detectDrift(prior, now). Compares the sorted field map, then writes the learned mapping to procedural memory.",
    mech: "Detection — deciding a field was renamed rather than added. Value-only comparison provably misses it.",
    check: "Assert the two paths diverge: value-only stays PASS while the fingerprint path flags drift. Both on screen at once.",
    who: ["Jiao · mechanism", "Orlando · reliability"],
  },
  flip: {
    time: "1:00 – 1:25",
    shot: "Close — the two numbers fill the frame. Hold it. Let it sit.",
    beat: "The turn. This is the moment they'll describe to someone else later.",
    said: "Now the restatement lands. Add-backs disallowed. Earnings drop, debt doesn't move. And here's the part retrieval can't do. It's not just that a number changed — the conclusion that depended on that number is now false. The certificate said compliant. It isn't. So the system re-derives the verdict. A breach nobody filed.",
    build: "assess(facts, covenant) plus the propagation pass that re-derives every value downstream of a revised fact.",
    mech: "Propagation — the derived verdict is re-derived, not swapped. The anti-RAG proof made visible.",
    check: "assert flip === true: the certificate says COMPLIANT and assess() returns BREACH on the same period.",
    who: ["Jiao · propagation", "Zi Zhang · domain", "Parker"],
  },
  chain: {
    time: "1:25 – 1:45",
    shot: "Medium — the whole chain visible at once, struck-through nodes above live ones.",
    beat: "Trust. This is the scene that says 'these people have done regulated work'.",
    said: "It doesn't forget the old number. It retracts it — and keeps the pointer to what replaced it, and when. So I can still ask what we believed in April, and why. In a regulated business that audit trail isn't a nice-to-have. It's the product.",
    build: "Revision-chain view over GET /v1/memories/{id}/revisions (HTTP only — not in the SDK; already exported as getRevisions in src/xtrace.js).",
    mech: "Non-monotonic belief update with retraction and lineage. Retrieval is monotonic append.",
    check: "A query as-of a past date returns only facts active at that time; superseded facts return marked, not hidden.",
    who: ["Jiao · the mechanism", "Mazumdar · audit"],
    blocked:
      "Needs a supersession chain in the corpus. Probed 25 Jul: 100 domain memories, ZERO multi-node chains — the restatement was ingested as new facts rather than as a supersession of the originals, so getRevisions() would render an empty chain. Fix is a canonical re-ingest (same sentence, new value), not a UI change.",
  },
  ablation: {
    time: "1:45 – 2:05",
    shot: "Medium — the table, then push in on the two score tiles.",
    beat: "Proof. The room stops wondering whether the memory does anything.",
    said: "I want to show you the ablation, because you should ask for it. Same five questions, same model, run twice — once with memory, once without. It's a small eval: n equals five. And the failures aren't slower answers. They're wrong ones. Without memory it cannot tell you this quarter was previously certified compliant — it never saw the certificate.",
    build: "An eval harness that runs the five-question bank twice against the same model, memory injected or not, and renders the diff.",
    mech: "Accuracy delta, not cost or latency. Jiao grades correctness — efficiency is not his axis.",
    check: "Both runs happen live from one button; scores are counted from the run, never hardcoded.",
    who: ["Jiao · decides it"],
  },
  gate: {
    time: "2:05 – 2:20",
    shot: "Medium — the red DENIED state, held, before the green attest.",
    beat: "Respect. The restraint is the flex.",
    said: "It found the breach. It is not allowed to file it. A covenant determination needs a human's signature, and the agent doesn't hold that authority. So it escalates — with the whole lineage attached. And when the officer signs, that decision is remembered too, so nobody gets asked the same question twice.",
    build: "attest() gate: assess() returns a proposed action plus blocked_on_human; a separate call commits to a local synthetic register.",
    mech: "Deny-by-default. Also where ambiguous supersession routes — volunteer that limit here.",
    check: "assert zero writes fire before attest; the register is byte-identical until the button is pressed.",
    who: ["Jiao · limits", "Mazumdar · governance"],
  },
  openbox: {
    time: "Q&A",
    shot: "Over-the-shoulder — a judge typing, not you.",
    beat: "Dominance, quietly. You're inviting the test everyone else fears.",
    said: "Type anything you want about this deal.",
    build: "Free-text recall over pre-warmed memory plus a frozen offline replay of the whole question bank, labelled REPLAY when cached.",
    mech: "Turns the biggest risk (live recall queries) into the strongest beat. The styled 'not in memory' state is the credibility move.",
    check: "Kill the wifi in rehearsal and run the bank again — it must still answer from replay, visibly labelled.",
    who: ["Jiao", "Mazumdar", "Zi Zhang"],
  },
};

export const getStoryboard = (id) => STORYBOARD[id] || null;
