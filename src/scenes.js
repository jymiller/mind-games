// Scene registry. Scene 1 is built; 2-8 are declared so they drop in as sections
// without a rewrite — add a `render()` and flip `built: true`.
//
// Every scene MUST declare its honesty labels. Labels are product UI, not disclaimers.
import { getFlip } from "./deal.js";

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const x2 = (n) => Number(n).toFixed(2);

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
  {
    id: "flip",
    n: 4,
    title: "The Flip",
    labels: ["SYNTHETIC DATA", "LIVE RECOMPUTE"],
    built: true,
    render: async () => {
      const f = await getFlip();
      const prov = f.provenance
        .map((p) => `<li><span class="pscore">${x2(p.score ?? 0)}</span><span class="ptext">${esc(p.text)}</span>
             <span class="pmeta">${esc(p.type || "fact")} &middot; ${esc(p.conv_id || "")}</span></li>`)
        .join("");
      const drivers = f.drivers
        .map((d) => `<tr><td>${esc(d.label)}</td><td class="numcell">&minus;&pound;${d.amount.toFixed(1)}m</td></tr>`)
        .join("");
      return `
      <section class="card">
        <div class="eyebrow">Scene 4 &middot; The Flip &mdash; ${esc(f.deal)} &middot; ${esc(f.restated.period)}</div>
        <h1 class="flip-h">Same quarter. Same covenant. Opposite verdict.</h1>
        ${f.note ? `<p class="todo-note">${esc(f.note)}</p>` : ""}

        <div class="flipgrid">
          <div class="panel green">
            <div class="num">${x2(f.certificate.ratio)}&times;</div>
            <div class="verdict">Compliant</div>
            <div class="calc">${x2(f.certificate.netDebt)} &divide; ${x2(f.certificate.ebitda)} &nbsp;vs cap ${x2(f.threshold)}&times;</div>
            <div class="pcap">as the borrower certified it</div>
          </div>
          <div class="arrow">&rarr;</div>
          <div class="panel red">
            <div class="num">${x2(f.restated.ratio)}&times;</div>
            <div class="verdict">Breach</div>
            <div class="calc">${x2(f.restated.netDebt)} &divide; ${x2(f.restated.ebitda)} &nbsp;vs cap ${x2(f.threshold)}&times;</div>
            <div class="pcap">re-derived on what memory knows now</div>
          </div>
        </div>

        <p class="sub">
          Nothing was overwritten. <em>One</em> <code>assess()</code> ran twice &mdash; same function, same
          period, same net debt of &pound;${x2(f.restated.netDebt)}m. Only the EBITDA changed, because the
          audit revised it after the certificate was signed. The conclusion is <em>re-derived</em>, and a
          quarter that closed green is now a covenant breach.
        </p>

        <div class="twocol">
          <div>
            <div class="minihead">Why EBITDA moved &mdash; &pound;${x2(f.certificate.ebitda)}m &rarr; &pound;${x2(f.restated.ebitda)}m</div>
            <table class="dtable">${drivers}
              <tr class="total"><td>Total removed</td><td class="numcell">&minus;&pound;${(f.removed ?? 0).toFixed(1)}m</td></tr>
              <tr><td>Total Net Debt</td><td class="numcell">${f.netDebtUnmoved ? "unchanged" : "changed"}</td></tr>
            </table>
          </div>
          <div>
            <div class="minihead">Independent cross-check</div>
            <p class="xcheck">We computed <b>${x2(f.restated.ratio)}&times;</b> from the revised inputs.
            Memory separately stores the restated ratio as
            <b>${f.corroboration.memoryRatio === null ? "&mdash;" : x2(f.corroboration.memoryRatio) + "&times;"}</b>.
            ${f.corroboration.memoryRatio === f.restated.ratio ? "They agree &mdash; the number was re-derived, not copied." : "They differ &mdash; shown as-is rather than reconciled."}</p>
            <p class="xcheck">Certificate's own printed ratio: <b>${x2(f.certificate.claimedRatio)}&times;</b>,
            signed off <span class="dim">${esc(f.certificate.source)}</span>.</p>
          </div>
        </div>

        <div class="prov">
          <div class="minihead">Provenance &mdash; every revised figure above, as recalled from memory</div>
          <ul class="provlist">${prov}</ul>
        </div>
      </section>`;
    },
  },
  { id: "chain",    n: 5, title: "The Chain",    labels: ["SYNTHETIC DATA", "LIVE LINEAGE"],  built: false },
  { id: "ablation", n: 6, title: "The Ablation", labels: ["SYNTHETIC DATA", "LIVE EVAL"],     built: false },
  { id: "gate",     n: 7, title: "The Gate",     labels: ["SYNTHETIC REGISTER"],              built: false },
  { id: "openbox",  n: 8, title: "The Open Box", labels: ["SYNTHETIC DATA", "REPLAY"],        built: false },
];

// Edit this one constant at 10:30 with the judge's posted problem statement.
export const JUDGE_SENTENCE = null;

export const getScene = (id) => SCENES.find((s) => s.id === id) || null;
