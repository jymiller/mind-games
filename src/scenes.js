// Scene registry. Scene 1 is built; 2-8 are declared so they drop in as sections
// without a rewrite — add a `render()` and flip `built: true`.
//
// Every scene MUST declare its honesty labels. Labels are product UI, not disclaimers.
import { getFlip } from "./deal.js";
import { QUESTIONS } from "./ablation.js";
import { getCard } from "./card.js";
import { propose } from "./gate.js";
import { runDrift } from "./drift.js";

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
        <div class="oneliner">
          <p>A borrower certifies the quarter compliant. <b class="g">6.47&times;</b>, against a 6.50&times;
          limit. Signed. Then the audit restates earnings. Debt never moves.</p>
          <p>Same quarter, same covenant &mdash; <b class="r">7.59&times;</b>. A breach nobody filed.</p>
          <p class="ol-tail">The system doesn't just update the number. It goes back and re-derives the
          verdict that depended on it.</p>
        </div>

        <p class="plain"><b>If you don't work in finance:</b> a <em>covenant</em> is a promise written into
        a loan &mdash; keep this ratio below this number, or you're in default. Every quarter the borrower
        files a certificate saying whether they kept it. Here the borrower said yes. The auditors later
        cut the profit figure that the ratio was calculated from, which quietly made the answer no.</p>

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
              Four of the eight scenes are built and run live against the memory API. The other four say so
              on screen rather than showing a mock. Two acceptance checks &mdash; 13 assertions and 8 &mdash;
              pass with no API key at all: <code>npm run check:flip</code> and <code>npm run check:ablation</code>.</div></div>
            <div class="sbrow"><div class="sbk">What doesn't<br>work?</div><div class="sbv">
              Four of eight scenes aren't built. Supersession is carried by the order documents were
              ingested, not detected automatically &mdash; there are no revision chains in this corpus, which
              is why Scene 5 is unbuilt and says why. And one fact didn't survive extraction: asked about it,
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
      return `
      <section class="card">
        <div class="eyebrow">Scene 2 &middot; The Recall &mdash; ${esc(c.deal)}</div>
        <h1 class="flip-h">What the file knows, three officers later.</h1>
        <p class="sub">Recalled live from the deal's memory. Every row carries the sentence it
        came from &mdash; nothing here is typed into the page.</p>
        <p class="plain"><b>In plain English:</b> this is what the loan file still remembers after the
        person who negotiated it has gone &mdash; the promise the borrower made, what they last reported,
        who signed it off, and where each line came from. Note the last row says everything is fine.
        That is the claim Scene 4 breaks.</p>
        <div class="cardrows">${rows}</div>
      </section>`;
    },
  },
  {
    id: "drift",
    n: 3,
    title: "The Drift",
    labels: ["SYNTHETIC DATA", "LIVE RECOMPUTE"],
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
        <p class="plain"><b>In plain English:</b> every quarter the borrower sends a file of numbers.
        This quarter they quietly renamed the earnings line from <code>ebitda</code> to
        <code>adjusted_ebitda</code>. A normal pipeline goes looking for the name it knows, doesn't
        find it, quietly reuses last quarter's number and reports that everything is fine. This one
        compares the <em>shape</em> of the file against what it remembers, spots the rename, and uses
        the real number.</p>

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
        <p class="xcheck" style="margin-top:14px">Detected on the field names, never on the values &mdash;
        a value-only comparison cannot tell &ldquo;renamed&rdquo; apart from &ldquo;missing&rdquo;, and
        missing looks like nothing being wrong.</p>

        <div class="flipgrid" style="margin-top:22px">
          <div class="panel green">
            <div class="pcap" style="font-style:normal;margin:0 0 8px">Value-only pipeline</div>
            <div class="num">${x2(d.naive.ratio)}&times;</div>
            <div class="verdict">${esc(d.naive.verdict)}</div>
            <div class="calc">used &pound;${x2(d.naive.ebitda)}m &mdash; last quarter's number</div>
            <div class="pcap">${esc(d.naive.saw)}</div>
          </div>
          <div class="arrow">vs</div>
          <div class="panel red">
            <div class="pcap" style="font-style:normal;margin:0 0 8px">Field-map pipeline</div>
            <div class="num">${x2(d.smart.ratio)}&times;</div>
            <div class="verdict">${esc(d.smart.verdict)}</div>
            <div class="calc">used &pound;${x2(d.smart.ebitda)}m &mdash; from <code>${esc(d.smart.usedField)}</code></div>
            <div class="pcap">cap for this Test Date is ${x2(d.cap)}&times;</div>
          </div>
        </div>

        <div class="proposal">
          <div class="minihead">Written back, so it is never worked out twice</div>
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

        <p class="plain"><b>In plain English:</b> the borrower promised to keep its debt under
        ${x2(f.threshold)}&times; its yearly profit. It reported ${x2(f.certificate.ratio)}&times; &mdash; just
        inside &mdash; and signed a certificate saying so. Its auditors then decided
        &pound;${(f.removed ?? 0).toFixed(1)}m of that profit didn't count. The debt never changed. On the
        corrected profit the same quarter is ${x2(f.restated.ratio)}&times; &mdash; well over the limit, and
        nobody had filed it.</p>

        <p class="sub">
          Nothing was overwritten. <em>One</em> <code>assess()</code> ran twice &mdash; same function, same
          period, same debt of &pound;${x2(f.restated.netDebt)}m. Only the profit figure changed, because the
          audit revised it after the certificate was signed. The conclusion is <em>re-derived</em>, and a
          quarter that closed green is now a breach.
        </p>

        <div class="twocol">
          <div>
            <div class="minihead">Why the profit figure moved &mdash; &pound;${x2(f.certificate.ebitda)}m &rarr; &pound;${x2(f.restated.ebitda)}m</div>
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
  {
    id: "ablation",
    n: 6,
    title: "The Ablation",
    labels: ["SYNTHETIC DATA", "LIVE EVAL"],
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
        <div class="eyebrow">Scene 6 &middot; The Ablation</div>
        <h1 class="flip-h">Does the memory actually change the answer?</h1>
        <p class="sub">Five questions about this deal, asked twice. Once with the deal's memory
        in front of the model, once without it. Same model, same questions, same wording &mdash;
        the memory is the only thing that changes.</p>

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

        <p class="plain"><b>How to read it:</b> each row is one question. The left tick is the answer
        <em>with</em> the memory, the right one is the same question <em>without</em> it. PASS means the
        answer actually contained the right figures &mdash; the answer itself is printed underneath, so you
        can check the marking yourself.</p>

        <table class="qtable">
          <thead><tr><th></th><th>Question</th><th class="cell">With</th><th class="cell">Without</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>

        <p class="sub" style="margin-top:24px">
          This measures whether the answers are <em>right</em> &mdash; not whether they are fast or cheap.
          Every score you see was counted from the run you just watched; nothing is saved from earlier.
        </p>
        <p class="xcheck">
          Said plainly: this is an invented company, so without the memory the model has nothing to go on.
          That is exactly the thing being measured &mdash; whether the answers come from the memory or from
          the model. It is not a claim that the model is weak.
        </p>
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
    built: true,
    render: () => {
      const p = propose();
      return `
      <section class="card">
        <div class="eyebrow">Scene 7 &middot; The Gate</div>
        <h1 class="flip-h">It found the breach. It is not allowed to file it.</h1>
        <p class="plain"><b>In plain English:</b> deciding that a borrower has broken its loan terms is
        a legal act with consequences. The software can work out that it happened &mdash; it is not
        allowed to be the one who says so. It writes up what it wants to do and stops, and a named
        person has to sign before anything is recorded.</p>

        <div class="proposal">
          <div class="minihead">What the agent proposes</div>
          <p class="pact">${esc(p.action)}</p>
          <p class="pbasis">${esc(p.basis)}</p>
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
  { id: "openbox",  n: 8, title: "The Open Box", labels: ["SYNTHETIC DATA", "REPLAY"],        built: false },
];

// Edit this one constant at 10:30 with the judge's posted problem statement.
export const JUDGE_SENTENCE = null;

export const getScene = (id) => SCENES.find((s) => s.id === id) || null;
