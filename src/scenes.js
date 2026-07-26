// Scene registry. Scene 1 is built; 2-8 are declared so they drop in as sections
// without a rewrite — add a `render()` and flip `built: true`.
//
// Every scene MUST declare its honesty labels. Labels are product UI, not disclaimers.
import { getFlip } from "./deal.js";
import { QUESTIONS } from "./ablation.js";
import { getCard } from "./card.js";
import { propose } from "./gate.js";
import { runDrift } from "./drift.js";
import { coverage, SUGGESTED } from "./openbox.js";
import { getChain } from "./chain.js";

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const x2 = (n) => Number(n).toFixed(2);

// A scene may return { html, labels } instead of a bare string when its honesty labels are
// only knowable at render time — LIVE vs PRERUN depends on whether the API answered THIS
// request. Declared labels are a promise; these are what actually happened.
const withLabels = (html, labels) => ({ html, labels });

export const SCENES = [
  {
    id: "lane",
    n: 1,
    title: "The Lane",
    // A title card computes nothing. It said LIVE RECOMPUTE from the original scaffold, which
    // was simply false — the label strip is meant to stop that, not perform it.
    labels: ["STATIC TITLE CARD"],
    source: "static",
    built: true,
    render: () => `
      <section class="card lane">
        <div class="eyebrow">deal-memory &middot; institutional memory for private credit</div>
        <h1>A 20-year loan outlives the loan officer.</h1>
        <p class="sub">The loan lasts twenty years. The banker who wrote it stays about three.
        The <em>reasons</em> leave with them.</p>
        <div class="oneliner">
          <p>A company promised its lender it would keep its debt under 6.50 times its yearly profit.
          It reported <b class="g">6.47&times;</b> &mdash; just inside &mdash; and signed to say so.</p>
          <p>Then the auditors cut the profit figure. The debt never moved. Same quarter, same promise:
          <b class="r">7.59&times;</b>. A broken promise nobody ever filed.</p>
          <p class="ol-tail">The system doesn't just update the number. It goes back and re-derives the
          verdict that depended on it.</p>
        </div>

        <p class="plain"><b>Jargon, once:</b> a <em>covenant</em> is a promise in the loan &mdash; keep this
        number under that number. Break it and the lender can act.</p>

        <blockquote id="judge-quote" class="quote">
          <span class="quote-label">Judge's question, 10:05 AM</span>
          &ldquo;<span id="judge-sentence">&lt;their exact sentence &mdash; edit JUDGE_SENTENCE in src/scenes.js at 10:30&gt;</span>&rdquo;
        </blockquote>

        <details class="dnote">
          <summary>If you're reading this without me &mdash; the three questions everyone asks</summary>
          <div class="sbgrid">
            <div class="sbrow"><div class="sbk">How is this<br>different from RAG?</div><div class="sbv">
              Retrieval only ever adds. This takes away. When a fact is revised, the conclusion built on it
              is re-derived &mdash; not swapped, not appended. Scene 4 shows a compliant quarter becoming a
              breach from the same code path.</div></div>
            <div class="sbrow"><div class="sbk">Is it actually<br>working?</div><div class="sbv">
              All eight scenes are built and run live &mdash; Scenes 2, 4, 5, 6 and 8 against the memory API,
              3 and 7 against local state. Every scene has an acceptance check written before its code:
              <code>npm run check</code> runs all seven. Two of them &mdash; 13 assertions and 8 &mdash;
              pass with no API key at all.</div></div>
            <div class="sbrow"><div class="sbk">What doesn't<br>work?</div><div class="sbv">
              Supersession is carried by the order documents were ingested, not detected automatically.
              Scene 5 says so on the page: its revision chain is reconstructed from documents, because the
              extractor deduplicates any fact whose value it already holds, so no prior node is ever stored
              for a later one to supersede. And one fact didn't survive extraction &mdash; asked about it,
              the memory answer refuses to guess rather than inventing a number.</div></div>
          </div>
        </details>
      </section>`,
  },
  {
    id: "recall",
    n: 2,
    title: "The Recall",
    labels: ["SYNTHETIC DATA", "LIVE RECALL"],
    source: "memory",
    built: true,
    render: async () => {
      const c = await getCard();
      if (!c.rows.length) {
        return `<section class="card"><div class="eyebrow">Scene 2 &middot; The Recall</div>
          <h1>Memory returned nothing.</h1>
          <p class="sub">This card is built entirely from recalled memory, so with the memory
          unavailable it renders empty rather than showing you a stale figure.</p></section>`;
      }
      const rows = c.rows
        .map(
          (r) => `<div class="crow">
            <div class="clabel">${esc(r.label)}</div>
            <div class="cval">${esc(r.value)}${r.status ? ` <span class="badge pass">${esc(r.status)}</span>` : ""}
              ${r.note ? `<span class="cnote">${esc(r.note)}</span>` : ""}</div>
            <div class="csrc"><span class="pscore">${Number(r.source.score ?? 0).toFixed(2)}</span>
              ${esc(r.source.text)} <span class="pmeta">${esc(r.source.conv_id)}</span></div>
          </div>`,
        )
        .join("");
      return withLabels(`
      <section class="card">
        <div class="eyebrow">Scene 2 &middot; The Recall &mdash; ${esc(c.deal)}</div>
        <h1 class="flip-h">What the file still knows, three staff changes later.</h1>
        <p class="plain"><b>The grey line under each row is the exact sentence it came from.</b>
        Switch memory off and this card goes blank, not stale. Note the last row: everything looks fine.</p>
        <div class="cardrows">${rows}</div>
      </section>`,
        ["SYNTHETIC DATA", c.label, `${c.rows.length} ROWS RECALLED`],
      );
    },
  },
  {
    id: "drift",
    n: 3,
    title: "The Drift",
    // Real recompute, but over a local fixture — this scene never touches the memory API.
    labels: ["SYNTHETIC DATA", "LIVE RECOMPUTE", "LOCAL FIXTURE"],
    source: "local",
    built: true,
    render: () => {
      const d = runDrift();
      const fieldList = (fields, other) =>
        Object.keys(fields)
          .map((k) => {
            const gone = !(k in other);
            return `<div class="fieldrow ${gone ? "changed" : ""}"><span class="fname">${esc(k)}</span>
              <span class="fval">${esc(String(fields[k]))}</span></div>`;
          })
          .join("");
      return `
      <section class="card">
        <div class="eyebrow">Scene 3 &middot; The Drift &mdash; ${esc(d.q2.label)} vs ${esc(d.q3.label)}</div>
        <h1 class="flip-h">The borrower renamed a line. Nothing else changed.</h1>
        <p class="plain"><b>The borrower renamed the profit line.</b> An ordinary system can't find the
        name it knows, quietly reuses last quarter's number, and stays green. This one remembers the
        old names, so it notices.</p>

        <div class="twocol">
          <div>
            <div class="minihead">${esc(d.q2.label)} &middot; remembered shape</div>
            <div class="fieldmap">${fieldList(d.q2.fields, d.q3.fields)}</div>
          </div>
          <div>
            <div class="minihead">${esc(d.q3.label)} &middot; what just arrived</div>
            <div class="fieldmap">${fieldList(d.q3.fields, d.q2.fields)}</div>
          </div>
        </div>
        <p class="xcheck" style="margin-top:14px">Caught on the names, not the numbers. Compare only
        numbers and &ldquo;renamed&rdquo; looks exactly like &ldquo;missing&rdquo;.</p>

        <div class="flipgrid" style="margin-top:22px">
          <div class="panel green">
            <div class="pcap" style="font-style:normal;margin:0 0 8px">An ordinary system</div>
            <div class="num">${x2(d.naive.ratio)}&times;</div>
            <div class="verdict">${esc(d.naive.verdict)}</div>
            <div class="calc">used &pound;${x2(d.naive.ebitda)}m &mdash; last quarter's number</div>
            <div class="pcap">${esc(d.naive.saw)}</div>
          </div>
          <div class="arrow">vs</div>
          <div class="panel red">
            <div class="pcap" style="font-style:normal;margin:0 0 8px">One that remembers last quarter</div>
            <div class="num">${x2(d.smart.ratio)}&times;</div>
            <div class="verdict">${esc(d.smart.verdict)}</div>
            <div class="calc">used &pound;${x2(d.smart.ebitda)}m &mdash; from <code>${esc(d.smart.usedField)}</code></div>
            <div class="pcap">cap for this Test Date is ${x2(d.cap)}&times;</div>
          </div>
        </div>

        <div class="proposal">
          <div class="minihead">Written down, so nobody has to work it out again</div>
          <p class="pbasis" style="margin:0">${esc(d.lesson)}</p>
        </div>
      </section>`;
    },
  },
  {
    id: "flip",
    n: 4,
    title: "The Flip",
    labels: ["SYNTHETIC DATA", "LIVE RECOMPUTE"],
    source: "memory",
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
      return withLabels(`
      <section class="card">
        <div class="eyebrow">Scene 4 &middot; The Flip &mdash; ${esc(f.deal)} &middot; ${esc(f.restated.period)}</div>
        <h1 class="flip-h">Same quarter. Same rule. Opposite answer.</h1>
        ${f.note ? `<p class="todo-note">${esc(f.note)}</p>` : ""}

        <div class="flipgrid">
          <div class="panel green">
            <div class="num">${x2(f.certificate.ratio)}&times;</div>
            <div class="verdict">Compliant</div>
            <div class="calc">${x2(f.certificate.netDebt)} &divide; ${x2(f.certificate.ebitda)} &nbsp;vs cap ${x2(f.threshold)}&times;</div>
            <div class="pcap">what the borrower reported, and signed</div>
          </div>
          <div class="arrow">&rarr;</div>
          <div class="panel red">
            <div class="num">${x2(f.restated.ratio)}&times;</div>
            <div class="verdict">Breach</div>
            <div class="calc">${x2(f.restated.netDebt)} &divide; ${x2(f.restated.ebitda)} &nbsp;vs cap ${x2(f.threshold)}&times;</div>
            <div class="pcap">worked out again, on the corrected profit</div>
          </div>
        </div>

        <p class="plain"><b>The limit was ${x2(f.threshold)}&times;. The borrower reported
        ${x2(f.certificate.ratio)}&times; and signed.</b> Auditors then cut
        &pound;${(f.removed ?? 0).toFixed(1)}m of profit. Debt never moved. Same quarter:
        ${x2(f.restated.ratio)}&times;.</p>

        <p class="sub">Same calculation, run twice. Only the profit changed &mdash; so the answer was
        worked out again, not edited.</p>

        <div class="twocol">
          <div>
            <div class="minihead">Why the profit figure moved &mdash; &pound;${x2(f.certificate.ebitda)}m &rarr; &pound;${x2(f.restated.ebitda)}m</div>
            <table class="dtable">${drivers}
              <tr class="total"><td>Total removed</td><td class="numcell">&minus;&pound;${(f.removed ?? 0).toFixed(1)}m</td></tr>
              <tr><td>Total Net Debt</td><td class="numcell">${f.netDebtUnmoved ? "unchanged" : "changed"}</td></tr>
            </table>
          </div>
          <div>
            <div class="minihead">Marking our own homework</div>
            <p class="xcheck">We divided debt by corrected profit and got
            <b>${x2(f.restated.ratio)}&times;</b>. Memory stores that figure separately as
            <b>${f.corroboration.memoryRatio === null ? "&mdash;" : x2(f.corroboration.memoryRatio) + "&times;"}</b>
            and we never read it.
            ${f.corroboration.memoryRatio === f.restated.ratio ? "They match &mdash; so it was genuinely recalculated." : "They differ; both shown as-is."}</p>
            <p class="xcheck">The borrower's own printed figure, <b>${x2(f.certificate.claimedRatio)}&times;</b>,
            is read from <span class="dim">${esc(f.certificate.source)}</span> &mdash; never typed here.</p>
          </div>
        </div>

        <div class="prov">
          <div class="minihead">Where each corrected number came from &mdash; the exact sentences recalled from memory</div>
          <ul class="provlist">${prov}</ul>
        </div>
      </section>`,
        // What actually happened on THIS request, not what the scene hopes to do.
        ["SYNTHETIC DATA", f.label === "LIVE" ? "LIVE RECOMPUTE" : "PRERUN — FROZEN 25 JUL CAPTURE"],
      );
    },
  },
  {
    id: "chain",
    n: 5,
    title: "The Chain",
    // Not LIVE LINEAGE: the nodes are recalled live, but the lineage between them is
    // reconstructed from documents, not read from the platform's revision chain.
    labels: ["SYNTHETIC DATA", "LIVE RECALL", "RECONSTRUCTED LINEAGE"],
    source: "memory",
    built: true,
    render: async () => {
      const c = await getChain();
      if (!c.nodes.length) {
        return `<section class="card"><div class="eyebrow">Scene 5 &middot; The Chain</div>
          <h1>Memory returned nothing.</h1>
          <p class="sub">This lineage is built entirely from recalled memory, so with memory
          unavailable it renders empty rather than showing a remembered shape of the truth.</p></section>`;
      }
      const nodes = c.nodes
        .map(
          (n) => `<div class="cnode ${esc(n.state)}">
            <div class="cwhen">${esc(n.when)}</div>
            <div class="chead">${esc(n.headline)}</div>
            <div class="cdetail">${esc(n.detail)}</div>
            <div class="csrc"><span class="pscore">${Number(n.source.score ?? 0).toFixed(2)}</span>
              <span>${esc(n.source.text)}<span class="pmeta">${esc(n.source.conv_id)}</span></span></div>
          </div>`,
        )
        .join("");
      return withLabels(`
      <section class="card">
        <div class="eyebrow">Scene 5 &middot; The Chain &mdash; ${esc(c.deal)}</div>
        <h1 class="flip-h">The old number doesn't disappear. It gets crossed out.</h1>
        <p class="plain"><b>Wrong numbers stay on the record, crossed out.</b> So you can still answer
        the question a regulator asks: what did you believe in May, and why?</p>

        <div class="chainwrap">${nodes}</div>

        <div class="blocked">
          <b>Being precise about this.</b> The timeline is built from the documents in memory, not from
          the memory platform's own revision chain. We queried that chain live for
          ${c.platform.checked} of these memories just now: deepest result
          <b>${c.platform.maxNodes} node${c.platform.maxNodes === 1 ? "" : "s"}</b>. Forcing a real one
          was tried on both borrowers and failed &mdash; the extractor drops any fact whose value it
          already holds, so no earlier version is ever stored to supersede.
        </div>
      </section>`,
        // The platform chain depth is measured, so it belongs in the label, not just the body.
        ["SYNTHETIC DATA", "LIVE RECALL", `RECONSTRUCTED LINEAGE — PLATFORM CHAIN: ${c.platform.maxNodes} NODE${c.platform.maxNodes === 1 ? "" : "S"}`],
      );
    },
  },
  {
    id: "ablation",
    n: 6,
    title: "The Ablation",
    labels: ["SYNTHETIC DATA", "LIVE EVAL"],
    source: "memory",
    built: true,
    render: () => {
      // Rendered EMPTY on purpose. Every number on this screen arrives from the button.
      const rows = QUESTIONS.map(
        (q, i) => `<tr id="row-${q.id}">
          <td class="qn">${i + 1}</td>
          <td class="qtext">${esc(q.q)}</td>
          <td class="cell" id="on-${q.id}"><span class="badge idle">&mdash;</span></td>
          <td class="cell" id="off-${q.id}"><span class="badge idle">&mdash;</span></td>
        </tr>`,
      ).join("");
      return `
      <section class="card">
        <div class="eyebrow">Scene 6 &middot; The Ablation &mdash; take one thing away and see what breaks</div>
        <h1 class="flip-h">Does the memory actually change the answer?</h1>
        <p class="sub">Five questions, asked twice &mdash; with the memory, then without.
        Nothing else changes.</p>

        <div class="board">
          <div class="armbox green">
            <div class="armlabel">With memory</div>
            <div class="armnum idle" id="score-on">not run</div>
            <div class="pcap">how many it got right</div>
          </div>
          <div class="armbox red">
            <div class="armlabel">Without memory</div>
            <div class="armnum idle" id="score-off">not run</div>
            <div class="pcap">how many it got right</div>
          </div>
          <div class="runwrap">
            <button class="runbtn" id="run-ablation">Run the test live</button>
            <div class="runstatus" id="run-status">Nothing has run yet. Press once and wait about ten seconds.</div>
          </div>
        </div>

        <p class="plain"><b>PASS means the answer contained the right figures.</b> Each answer is printed
        underneath, so you can check the marking yourself.</p>

        <table class="qtable">
          <thead><tr><th></th><th>Question</th><th class="cell">With</th><th class="cell">Without</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>

        <p class="sub" style="margin-top:24px">Accuracy, not speed. Every score is counted from the run
        you just watched.</p>
        <p class="xcheck">The company is invented, so without memory there is nothing to go on &mdash;
        which is the point being measured, not a claim that the model is weak.</p>
      </section>

      <script>
      (function () {
        var btn = document.getElementById("run-ablation");
        var status = document.getElementById("run-status");
        function badge(pass) {
          return '<span class="badge ' + (pass ? "pass" : "fail") + '">' + (pass ? "PASS" : "FAIL") + "</span>";
        }
        btn.addEventListener("click", async function () {
          btn.disabled = true;
          status.textContent = "running 10 live model calls, please wait…";
          var t0 = Date.now();
          try {
            var res = await fetch("/api/ablation");
            var d = await res.json();
            if (d.error) throw new Error(d.error);
            var onEl = document.getElementById("score-on"), offEl = document.getElementById("score-off");
            // An incomplete arm has no score. Showing 0/5 for calls that never ran would be
            // a lie in the one direction this whole demo cannot afford.
            function setScore(el, arm) {
              if (arm.complete) { el.textContent = arm.score + "/" + d.n; el.classList.remove("idle"); }
              else { el.textContent = "no result"; el.classList.add("idle"); }
            }
            setScore(onEl, d.on); setScore(offEl, d.off);
            if (!d.on.complete || !d.off.complete) {
              var why = d.rateLimited
                ? "rate limited by the model API (30 requests/min; one run is 10 calls). Wait a minute and run it again."
                : (d.on.errors + d.off.errors) + " of " + (d.n * 2) + " calls failed.";
              status.textContent = "run did not complete — " + why + " No score is shown, because these calls never returned an answer.";
              btn.disabled = false;
              return;
            }
            for (var i = 0; i < d.on.results.length; i++) {
              var on = d.on.results[i], off = d.off.results[i];
              document.getElementById("on-" + on.id).innerHTML = badge(on.pass);
              document.getElementById("off-" + off.id).innerHTML = badge(off.pass);
              var row = document.getElementById("row-" + on.id);
              if (row && !row.dataset.expanded) {
                row.dataset.expanded = "1";
                var tr = document.createElement("tr");
                tr.className = "answerrow";
                tr.innerHTML = '<td></td><td colspan="3"><b>ON:</b> ' + (on.answer || "") + "</td>";
                row.parentNode.insertBefore(tr, row.nextSibling);
              }
            }
            var secs = ((Date.now() - t0) / 1000).toFixed(1);
            status.innerHTML = "computed from this run &middot; " + d.model + " &middot; temperature " +
              d.temperature + " &middot; n=" + d.n + " &middot; " + secs + "s";
          } catch (e) {
            status.textContent = "run failed: " + e.message + " (nothing is shown rather than a cached score)";
          }
          // One run is 10 of the 30 calls/min the API allows. Hold the button down for a
          // beat so an eager second press cannot turn a good result into a rate limit.
          var left = 20;
          btn.disabled = true;
          var label = btn.textContent;
          btn.textContent = "Run again in " + left + "s";
          var iv = setInterval(function () {
            left -= 1;
            if (left <= 0) { clearInterval(iv); btn.disabled = false; btn.textContent = label; }
            else btn.textContent = "Run again in " + left + "s";
          }, 1000);
        });
      })();
      </script>`;
    },
  },
  {
    id: "gate",
    n: 7,
    title: "The Gate",
    labels: ["SYNTHETIC REGISTER", "LIVE ATTESTATION"],
    source: "local",
    built: true,
    render: () => {
      const p = propose();
      return `
      <section class="card">
        <div class="eyebrow">Scene 7 &middot; The Gate</div>
        <h1 class="flip-h">It found the breach. It is not allowed to file it.</h1>
        <p class="plain"><b>Calling a default is a legal act.</b> The software works it out, then stops.
        A named person signs, or nothing is recorded.</p>

        <div class="proposal">
          <div class="minihead">What the software wants to do</div>
          <p class="pact">${esc(p.action)}</p>
          <p class="pbasis">${esc(p.basis)}</p>
          <p class="pbasis"><em>Plainly:</em> a letter formally telling the borrower they are in default.</p>
          <div class="denied">${esc(p.authority)} &mdash; ${esc(p.reason)}</div>
        </div>

        <div class="attestrow">
          <input class="attestin" id="who" type="text" autocomplete="off"
                 placeholder="Name of the credit officer attesting" />
          <button class="runbtn" id="do-attest">Attest and commit</button>
        </div>
        <div class="runstatus" id="attest-status">Nothing has been written. The register is untouched until a name is entered and this is pressed.</div>

        <div class="prov">
          <div class="minihead">The register &mdash; append-only, hash-chained</div>
          <div id="register">loading&hellip;</div>
        </div>
      </section>

      <script>
      (function () {
        var out = document.getElementById("register");
        var status = document.getElementById("attest-status");
        function draw(r) {
          if (!r.entries.length) { out.innerHTML = '<p class="xcheck">Empty. Nothing has ever been committed.</p>'; return; }
          var html = r.entries.map(function (e) {
            return '<div class="regentry"><div class="regtop"><b>#' + e.seq + '</b> ' + e.who +
              '<span class="regat">' + e.at + '</span></div>' +
              '<div class="regact">' + e.action + '</div>' +
              '<div class="reghash">hash ' + e.hash.slice(0, 24) + '&hellip;<br>prev ' + e.prev.slice(0, 24) + '&hellip;</div></div>';
          }).join("");
          var v = r.verified.ok
            ? '<span class="badge pass">CHAIN VERIFIED &middot; ' + r.verified.links + ' link(s)</span>'
            : '<span class="badge fail">CHAIN BROKEN AT #' + r.verified.brokeAt + '</span>';
          out.innerHTML = html + '<div style="margin-top:12px">' + v + '</div>';
        }
        fetch("/api/register").then(function (r) { return r.json(); }).then(draw);
        document.getElementById("do-attest").addEventListener("click", async function () {
          var who = document.getElementById("who").value;
          if (!who.trim()) { status.textContent = "Enter a name first — an attestation without a person is not an attestation."; return; }
          status.textContent = "committing…";
          try {
            var res = await fetch("/api/attest", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ who: who }) });
            var d = await res.json();
            if (d.error) throw new Error(d.error);
            draw(d.register);
            status.textContent = "committed as entry #" + d.committed.seq + " — and the attestation is itself remembered.";
          } catch (e) { status.textContent = "refused: " + e.message; }
        });
      })();
      </script>`;
    },
  },
  {
    id: "openbox",
    n: 8,
    title: "The Open Box",
    labels: ["SYNTHETIC DATA", "LIVE RECALL", "REPLAY WHEN CACHED"],
    source: "memory",
    built: true,
    render: async () => {
      const cov = await coverage();
      const chips = SUGGESTED.map((q) => `<button class="qchip" data-q="${esc(q)}">${esc(q)}</button>`).join("");
      return `
      <section class="card">
        <div class="eyebrow">Scene 8 &middot; The Open Box</div>
        <h1 class="flip-h">Ask the deal anything.</h1>
        <p class="plain"><b>It answers from memory, or admits it doesn't know.</b> It never invents.
        Try the last chip &mdash; that one is deliberately outside what it was told.</p>

        <div class="attestrow">
          <input class="attestin" id="q" type="text" autocomplete="off"
                 placeholder="e.g. what happened to the covenant breach?" />
          <button class="runbtn" id="ask">Ask</button>
        </div>
        <div class="qchips">${chips}</div>
        <div class="runstatus" id="ask-status">Memory covers ${cov.deals.length} borrower(s)${cov.memories ? ` across ${cov.memories} memories` : ""}.</div>

        <div id="answer"></div>
      </section>

      <script>
      (function () {
        var box = document.getElementById("answer");
        var status = document.getElementById("ask-status");
        var input = document.getElementById("q");
        function esc(s){ return String(s).replace(/[&<>"]/g, function(c){ return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]; }); }
        function labelClass(l){ return l === "LIVE" ? "pass" : (l === "NOT IN MEMORY" ? "fail" : "idle"); }
        function draw(d) {
          if (d.state === "empty") { box.innerHTML = ""; status.textContent = "Type a question first."; return; }
          var head = '<div class="ansheadrow"><span class="badge ' + labelClass(d.label) + '">' + esc(d.label) + '</span>' +
            (d.captured ? '<span class="regat">captured ' + esc(d.captured) + '</span>' : "") + '</div>';
          if (d.state === "not-in-memory") {
            box.innerHTML = head + '<p class="notinmem">That is not in memory. It covers ' +
              (d.coverage.deals || []).map(esc).join(", ") + ' — nothing else was ingested, so there is nothing honest to say about it.</p>';
            status.textContent = "asked, and correctly refused";
            return;
          }
          if (d.state === "unavailable") {
            box.innerHTML = head + '<p class="notinmem">' + esc(d.why) + '</p>';
            status.textContent = "no answer available";
            return;
          }
          var src = (d.sources || []).map(function (s) {
            return '<li><span class="pscore">' + (s.score == null ? "—" : Number(s.score).toFixed(2)) + '</span>' +
              '<span class="ptext">' + esc(s.text) + '</span><span class="pmeta">' + esc(s.conv_id || "") + '</span></li>';
          }).join("");
          box.innerHTML = head + '<p class="ansbody">' + esc(d.answer) + '</p>' +
            (src ? '<div class="prov"><div class="minihead">Recalled from</div><ul class="provlist">' + src + '</ul></div>' : "");
          status.textContent = d.state === "replay"
            ? "the model was unreachable — this is a frozen answer, labelled"
            : "answered live from memory";
        }
        async function go(q) {
          input.value = q;
          status.textContent = "recalling…";
          box.innerHTML = "";
          try {
            var r = await fetch("/api/ask?q=" + encodeURIComponent(q));
            draw(await r.json());
          } catch (e) { status.textContent = "failed: " + e.message; }
        }
        document.getElementById("ask").addEventListener("click", function () { go(input.value); });
        input.addEventListener("keydown", function (e) { if (e.key === "Enter") go(input.value); });
        Array.prototype.forEach.call(document.querySelectorAll(".qchip"), function (b) {
          b.addEventListener("click", function () { go(b.getAttribute("data-q")); });
        });
      })();
      </script>`;
    },
  },
];

// Edit this one constant at 10:30 with the judge's posted problem statement.
export const JUDGE_SENTENCE = null;

export const getScene = (id) => SCENES.find((s) => s.id === id) || null;
