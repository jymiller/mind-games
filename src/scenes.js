// Scene registry. Scene 1 is built; 2-8 are declared so they drop in as sections
// without a rewrite — add a `render()` and flip `built: true`.
//
// Every scene MUST declare its honesty labels. Labels are product UI, not disclaimers.

export const SCENES = [
  {
    id: "lane",
    n: 1,
    title: "The Lane",
    labels: ["SYNTHETIC DATA", "LIVE RECOMPUTE"],
    built: true,
    render: () => `
      <section class="card lane">
        <div class="eyebrow">deal-memory &middot; institutional memory for private credit</div>
        <h1>A 20-year loan outlives the loan officer.</h1>
        <p class="sub">
          A private-credit covenant lives 5&ndash;20 years. The officer who negotiated it is in the
          seat about three. So the loan outlives the person &mdash; and the <em>reasons</em> leave
          with them.
        </p>
        <blockquote id="judge-quote" class="quote">
          <span class="quote-label">Judge's question, 10:05 AM</span>
          &ldquo;<span id="judge-sentence">&lt;their exact sentence &mdash; edit JUDGE_SENTENCE in src/scenes.js at 10:30&gt;</span>&rdquo;
        </blockquote>
      </section>`,
  },
  { id: "recall",   n: 2, title: "The Recall",   labels: ["SYNTHETIC DATA", "LIVE RECALL"],   built: false },
  { id: "drift",    n: 3, title: "The Drift",    labels: ["SYNTHETIC DATA", "LIVE"],          built: false },
  { id: "flip",     n: 4, title: "The Flip",     labels: ["SYNTHETIC DATA", "LIVE RECOMPUTE"],built: false },
  { id: "chain",    n: 5, title: "The Chain",    labels: ["SYNTHETIC DATA", "LIVE LINEAGE"],  built: false },
  { id: "ablation", n: 6, title: "The Ablation", labels: ["SYNTHETIC DATA", "LIVE EVAL"],     built: false },
  { id: "gate",     n: 7, title: "The Gate",     labels: ["SYNTHETIC REGISTER"],              built: false },
  { id: "openbox",  n: 8, title: "The Open Box", labels: ["SYNTHETIC DATA", "REPLAY"],        built: false },
];

// Edit this one constant at 10:30 with the judge's posted problem statement.
export const JUDGE_SENTENCE = null;

export const getScene = (id) => SCENES.find((s) => s.id === id) || null;
