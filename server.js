// Deal Memory — web service. Zero-dep Node http (project rule: zero-dep core).
// Binds process.env.PORT on 0.0.0.0 — the two most common Render first-deploy failures.
//
// Routes:
//   GET /            scene 1 (title card), with the scene strip
//   GET /scene/:id   any scene; unbuilt scenes render an honest placeholder
//   GET /healthz     200 text/plain — Render's health check
//   GET /api/scenes  scene manifest (JSON)
import { createServer } from "node:http";
import { SCENES, getScene, JUDGE_SENTENCE } from "./src/scenes.js";
import { getFlip } from "./src/deal.js";
import { runAblation } from "./src/ablation.js";
import { getStoryboard } from "./src/storyboard.js";
import { attest, register } from "./src/gate.js";
import { ask } from "./src/openbox.js";
import { redact } from "./src/redact.js";

const PORT = process.env.PORT || 3000;
const HOST = "0.0.0.0";

const CSS = `
:root{--bg:#0b0d10;--panel:#14181d;--line:#232a32;--ink:#e8eef5;--dim:#8b97a6;
--green:#2fbf71;--red:#e0525f;--amber:#e0a34a;--accent:#6ea8fe}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);
font:16px/1.55 ui-sans-serif,-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif}
.wrap{max-width:1040px;margin:0 auto;padding:28px 20px 64px}
.topbar{display:flex;align-items:baseline;gap:14px;flex-wrap:wrap;
border-bottom:1px solid var(--line);padding-bottom:14px;margin-bottom:26px}
.brand{font-weight:700;letter-spacing:.02em}
.brand span{color:var(--accent)}
.topbar .muted{color:var(--dim);font-size:13px}
.strip{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:26px}
.chip{display:inline-flex;align-items:center;gap:7px;padding:7px 12px;border-radius:999px;
border:1px solid var(--line);background:var(--panel);color:var(--dim);
font-size:12.5px;text-decoration:none;white-space:nowrap}
.chip b{color:var(--ink);font-weight:600}
.chip.on{border-color:var(--accent);color:var(--ink)}
.chip.ready{color:var(--ink);border-color:#2a4a3a;background:#101a15}
.chip.ready b{color:var(--green)}
.chip.ready:hover{border-color:var(--green)}
.chip.on.ready{border-color:var(--accent);background:var(--panel);box-shadow:0 0 0 1px var(--accent)}
.chip.todo{opacity:.34;border-style:dashed;background:transparent}
.chip.todo b{color:var(--dim)}
.livedot{width:7px;height:7px;border-radius:50%;background:var(--green);flex:0 0 auto;
box-shadow:0 0 7px -1px var(--green)}
.striplegend{display:inline-flex;align-items:center;gap:7px;color:var(--dim);font-size:11.5px;
padding:7px 4px;white-space:nowrap}
.card{background:var(--panel);border:1px solid var(--line);border-radius:14px;padding:34px}
.eyebrow{color:var(--dim);font-size:12.5px;letter-spacing:.09em;text-transform:uppercase;margin-bottom:20px}
h1{font-size:clamp(28px,4.6vw,46px);line-height:1.12;margin:0 0 18px;letter-spacing:-.02em}
.sub{color:var(--dim);font-size:17px;max-width:62ch;margin:0}
.sub em{color:var(--ink);font-style:italic}
.quote{margin:30px 0 0;padding:16px 20px;border-left:3px solid var(--accent);
background:#0f1318;border-radius:0 10px 10px 0;color:var(--ink)}
.quote-label{display:block;color:var(--dim);font-size:11.5px;letter-spacing:.09em;
text-transform:uppercase;margin-bottom:7px}
#judge-sentence{color:var(--dim)}
.labels{display:flex;gap:8px;flex-wrap:wrap;margin-top:28px}
.label{font-size:11px;letter-spacing:.09em;text-transform:uppercase;padding:5px 10px;
border-radius:6px;border:1px solid var(--line);color:var(--dim);background:#0f1318}
.label.live{color:var(--green);border-color:#1e4634}
.label.planned{color:#66717f;border-style:dashed;text-transform:none;letter-spacing:.04em}
.label.replay{color:var(--amber);border-color:#4a3a1e}
.todo-note{color:var(--dim);margin-top:12px;font-size:14.5px}
footer{color:var(--dim);font-size:12.5px;margin-top:34px;
border-top:1px solid var(--line);padding-top:14px}
code{font-size:.92em;background:#0b0f13;border:1px solid var(--line);border-radius:4px;padding:1px 5px}
.dim{color:var(--dim)}
h1.flip-h{font-size:clamp(24px,3.4vw,34px)}
.flipgrid{display:grid;grid-template-columns:1fr auto 1fr;gap:20px;align-items:center;margin:28px 0 26px}
.panel{border:1px solid var(--line);border-radius:12px;padding:26px 18px;background:#0f1318;text-align:center}
.panel.green{border-color:#1e4634}.panel.red{border-color:#4a2229}
.num{font-size:clamp(46px,9vw,88px);line-height:1;font-weight:700;letter-spacing:-.035em;
font-variant-numeric:tabular-nums}
.panel.green .num{color:var(--green)}.panel.red .num{color:var(--red)}
.verdict{margin-top:12px;font-size:12px;letter-spacing:.16em;text-transform:uppercase;font-weight:700}
.panel.green .verdict{color:var(--green)}.panel.red .verdict{color:var(--red)}
.calc{color:var(--dim);font-size:12.5px;margin-top:14px;font-variant-numeric:tabular-nums}
.pcap{color:var(--dim);font-size:11.5px;margin-top:6px;font-style:italic}
.arrow{color:var(--dim);font-size:28px;text-align:center}
.twocol{display:grid;grid-template-columns:1fr 1fr;gap:26px;margin-top:28px}
.minihead{color:var(--dim);font-size:11.5px;letter-spacing:.09em;text-transform:uppercase;margin-bottom:10px}
.dtable{width:100%;border-collapse:collapse;font-size:14px}
.dtable td{padding:7px 0;border-bottom:1px solid var(--line)}
.dtable tr.total td{font-weight:700}
.numcell{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}
.xcheck{font-size:14px;color:var(--dim);margin:0 0 12px}
.xcheck b{color:var(--ink)}
.prov{margin-top:28px;border-top:1px solid var(--line);padding-top:16px}
.provlist{list-style:none;margin:0;padding:0;display:grid;gap:9px}
.provlist li{display:grid;grid-template-columns:52px 1fr;gap:10px;font-size:12.5px;color:var(--dim);
align-items:start}
.pscore{font-variant-numeric:tabular-nums;color:var(--green);border:1px solid #1e4634;border-radius:5px;
padding:1px 0;text-align:center;font-size:11.5px}
.ptext{color:var(--ink)}
.pmeta{grid-column:2;font-size:11px;letter-spacing:.04em;text-transform:uppercase;color:#66717f}
.plain{background:#0f1318;border:1px solid var(--line);border-left:3px solid var(--amber);
border-radius:0 9px 9px 0;padding:14px 17px;margin:20px 0;font-size:14.5px;line-height:1.6;
color:var(--dim);max-width:74ch}
.plain b{color:var(--amber);font-weight:600}
.plain em{color:var(--ink);font-style:normal;font-weight:600}
.oneliner{margin:26px 0 4px;border-left:3px solid var(--accent);padding:4px 0 4px 20px}
.oneliner p{margin:0 0 10px;font-size:18px;line-height:1.5;color:var(--ink);max-width:60ch}
.oneliner b.g{color:var(--green);font-variant-numeric:tabular-nums}
.oneliner b.r{color:var(--red);font-variant-numeric:tabular-nums}
.oneliner .ol-tail{color:var(--dim);font-size:16px;margin-bottom:0}
.sbgrid{margin-top:24px;display:grid;gap:1px}
.sbrow{display:grid;grid-template-columns:150px 1fr;gap:16px;padding:11px 0;border-bottom:1px solid var(--line)}
.sbk{color:var(--dim);font-size:11px;letter-spacing:.09em;text-transform:uppercase;padding-top:2px}
.sbv{font-size:14px;color:var(--ink);line-height:1.55}
.who{display:inline-block;font-size:10.5px;letter-spacing:.05em;text-transform:uppercase;color:var(--amber);
border:1px solid #4a3a1e;border-radius:999px;padding:2px 9px;margin:0 6px 6px 0}
.said{font-style:italic;color:var(--dim)}
.blocked{margin-top:18px;border:1px dashed #4a3a1e;border-radius:8px;padding:12px 14px;
color:var(--amber);font-size:13.5px;line-height:1.55}
.blocked b{color:var(--ink)}
.dnote{margin-top:26px;border-top:1px solid var(--line);padding-top:16px}
.dnote summary{cursor:pointer;color:var(--dim);font-size:12.5px;letter-spacing:.04em;list-style:none}
.dnote summary::-webkit-details-marker{display:none}
.dnote summary::before{content:"▸ ";color:var(--accent)}
.dnote[open] summary::before{content:"▾ "}
.dnote summary:hover{color:var(--ink)}
.dtime{color:#66717f;font-variant-numeric:tabular-nums;margin-left:6px}
@media (max-width:640px){.sbrow{grid-template-columns:1fr;gap:4px}}
.qchips{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}
.qchip{background:transparent;border:1px solid var(--line);border-radius:999px;padding:7px 13px;
color:var(--dim);font:inherit;font-size:12.5px;cursor:pointer}
.qchip:hover{border-color:var(--accent);color:var(--ink)}
.ansheadrow{display:flex;align-items:center;gap:10px;margin-top:24px}
.ansbody{font-size:17px;line-height:1.6;color:var(--ink);margin:14px 0 0;max-width:70ch}
.notinmem{font-size:15px;line-height:1.6;color:var(--dim);margin:14px 0 0;max-width:70ch;
border-left:3px solid var(--red);padding-left:15px}
.badge.idle{color:var(--amber);border-color:#4a3a1e}
.fieldmap{border:1px solid var(--line);border-radius:10px;overflow:hidden}
.fieldrow{display:flex;justify-content:space-between;gap:12px;padding:10px 13px;font-size:13px;
border-bottom:1px solid var(--line);font-family:ui-monospace,SFMono-Regular,Menlo,monospace}
.fieldrow:last-child{border-bottom:none}
.fieldrow.changed{background:#2b1f08;color:var(--amber)}
.fieldrow.changed .fname{color:var(--amber);font-weight:700}
.fname{color:var(--ink)}
.fval{color:var(--dim);font-variant-numeric:tabular-nums}
.proposal{margin-top:24px;border:1px solid var(--line);border-radius:12px;padding:20px;background:#0f1318}
.pact{font-size:19px;font-weight:600;margin:0 0 6px;color:var(--ink)}
.pbasis{color:var(--dim);font-size:14px;margin:0 0 16px}
.denied{display:inline-block;color:var(--red);border:1px solid #4a2229;background:#1a0f12;
border-radius:7px;padding:9px 13px;font-size:13px;line-height:1.5}
.attestrow{display:flex;gap:10px;margin-top:20px;flex-wrap:wrap}
.attestin{flex:1;min-width:260px;background:#0b0f13;border:1px solid var(--line);border-radius:9px;
padding:13px 15px;color:var(--ink);font:inherit;font-size:14.5px}
.attestin:focus{outline:none;border-color:var(--accent)}
.regentry{border:1px solid var(--line);border-radius:9px;padding:13px 15px;margin-bottom:9px;background:#0f1318}
.regtop{display:flex;gap:10px;align-items:baseline;flex-wrap:wrap;font-size:14px;color:var(--ink)}
.regat{color:var(--dim);font-size:12px;margin-left:auto;font-variant-numeric:tabular-nums}
.regact{color:var(--dim);font-size:13px;margin-top:5px}
.reghash{color:#66717f;font-size:11px;margin-top:8px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;
line-height:1.5}
.cardrows{margin-top:26px;display:grid;gap:2px}
.crow{padding:15px 0;border-bottom:1px solid var(--line)}
.clabel{color:var(--dim);font-size:11.5px;letter-spacing:.09em;text-transform:uppercase}
.cval{font-size:20px;font-weight:600;margin-top:5px;display:flex;align-items:baseline;gap:10px;flex-wrap:wrap}
.cnote{color:var(--dim);font-size:13.5px;font-weight:400}
.csrc{color:var(--dim);font-size:12px;margin-top:9px;display:grid;grid-template-columns:46px 1fr;gap:9px;
align-items:start;line-height:1.5}
.board{display:grid;grid-template-columns:1fr 1fr 1.4fr;gap:18px;align-items:stretch;margin:28px 0 24px}
.armbox{border:1px solid var(--line);border-radius:12px;padding:20px 18px;background:#0f1318;text-align:center}
.armbox.green{border-color:#1e4634}.armbox.red{border-color:#4a2229}
.armlabel{font-size:11.5px;letter-spacing:.14em;text-transform:uppercase;color:var(--dim)}
.armnum{font-size:clamp(38px,7vw,64px);line-height:1.05;font-weight:700;letter-spacing:-.03em;
margin-top:8px;font-variant-numeric:tabular-nums}
.armbox.green .armnum{color:var(--green)}.armbox.red .armnum{color:var(--red)}
.armnum.idle{color:var(--dim)!important;font-size:22px;font-weight:400;letter-spacing:0;font-style:italic}
.runwrap{display:flex;flex-direction:column;justify-content:center;gap:10px}
.runbtn{background:var(--accent);color:#08131f;border:0;border-radius:9px;padding:14px 18px;
font-size:15px;font-weight:700;cursor:pointer;font-family:inherit}
.runbtn:disabled{opacity:.5;cursor:progress}
.runstatus{color:var(--dim);font-size:12.5px}
.qtable{width:100%;border-collapse:collapse;font-size:14px;margin-top:6px}
.qtable th{text-align:left;color:var(--dim);font-size:11.5px;letter-spacing:.09em;text-transform:uppercase;
padding:0 0 9px;font-weight:400;border-bottom:1px solid var(--line)}
.qtable td{padding:11px 0;border-bottom:1px solid var(--line);vertical-align:top}
.qtable td.qn{color:var(--dim);width:26px}
.qtable td.qtext{padding-right:18px}
.qtable th.cell,.qtable td.cell{text-align:center;width:74px}
.badge{font-size:10.5px;letter-spacing:.1em;font-weight:700;padding:4px 8px;border-radius:5px;
border:1px solid var(--line);color:var(--dim)}
.badge.pass{color:var(--green);border-color:#1e4634}
.badge.fail{color:var(--red);border-color:#4a2229}
.answerrow td{color:var(--dim);font-size:12.5px;padding-top:0!important;border-bottom:1px solid var(--line)}
.answerrow b{color:var(--ink)}
@media (max-width:760px){.flipgrid,.twocol{grid-template-columns:1fr}.arrow{transform:rotate(90deg)}
.board{grid-template-columns:1fr 1fr}.runwrap{grid-column:1/-1}}
`;

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

function labelClass(l) {
  if (/LIVE/.test(l)) return "label live";
  if (/REPLAY|PRERUN/.test(l)) return "label replay";
  return "label";
}

// The strip has to be readable at a glance from a laptop on a table: a live scene must be
// obviously clickable, a storyboard-only one obviously not. Nobody should burn a judge's
// attention opening a page that has no implementation behind it.
function strip(activeId) {
  const built = SCENES.filter((s) => s.built).length;
  const chips = SCENES.map(
    (s) =>
      `<a class="chip ${s.id === activeId ? "on" : ""} ${s.built ? "ready" : "todo"}" href="/scene/${s.id}">` +
      `${s.built ? '<span class="livedot"></span>' : ""}<b>${s.n}</b> ${esc(s.title)}` +
      `${s.built ? "" : " &middot; storyboard"}</a>`,
  ).join("");
  return `${chips}<span class="striplegend"><span class="livedot"></span> ${built} live &middot; ${SCENES.length - built} storyboard only</span>`;
}

// Storyboard rows. Design intent only — never a source of figures for a live screen.
function sbRows(sb) {
  const row = (k, v) => (v ? `<div class="sbrow"><div class="sbk">${k}</div><div class="sbv">${esc(v)}</div></div>` : "");
  return (
    row("What it builds", sb.build) +
    row("The mechanism", sb.mech) +
    row("Acceptance check", sb.check) +
    row("Shot", sb.shot) +
    row("The beat", sb.beat) +
    (sb.who?.length ? `<div class="sbrow"><div class="sbk">Aimed at</div><div class="sbv">${sb.who.map((w) => `<span class="who">${esc(w)}</span>`).join("")}</div></div>` : "")
  );
}

function placeholder(scene) {
  const sb = getStoryboard(scene.id);
  if (!sb) {
    return `
    <section class="card">
      <div class="eyebrow">Scene ${scene.n} &middot; ${esc(scene.title)}</div>
      <h1>Not built yet.</h1>
      <p class="sub">This scene has no implementation on the server. It is a placeholder, and it
      says so &mdash; it does not render a mock as though it were real.</p>
    </section>`;
  }
  return `
    <section class="card">
      <div class="eyebrow">Scene ${scene.n} &middot; ${esc(scene.title)} &middot; ${esc(sb.time)}</div>
      <h1 class="flip-h">Not built yet &mdash; here is what it would do.</h1>
      <p class="sub">There is no implementation behind this page. Everything below is the
      <em>storyboard</em>: the design intent and the acceptance check this scene must pass before it
      may claim to work. It is a plan, not a result, and no figure on it came from memory.</p>
      ${sb.blocked ? `<p class="blocked"><b>Blocked, and why:</b> ${esc(sb.blocked)}</p>` : ""}
      <div class="sbgrid">${sbRows(sb)}</div>
      <blockquote class="quote said"><span class="quote-label">What gets said, roughly</span>
        &ldquo;${esc(sb.said)}&rdquo;</blockquote>
    </section>`;
}

// Built scenes carry the same intent as a note UNDER the live prop, never in place of it.
function directorNote(scene) {
  const sb = getStoryboard(scene.id);
  if (!sb) return "";
  return `
    <details class="dnote">
      <summary>Director's note &mdash; the storyboard behind this scene <span class="dtime">${esc(sb.time)}</span></summary>
      <div class="sbgrid">${sbRows(sb)}</div>
      <blockquote class="quote said"><span class="quote-label">What gets said, roughly</span>
        &ldquo;${esc(sb.said)}&rdquo;</blockquote>
    </details>`;
}

async function page(scene) {
  let body;
  try {
    body = scene.built ? await scene.render() : placeholder(scene);
  } catch (e) {
    // An honest failure beats a stale mock: say what broke, on screen.
    body = `<section class="card"><div class="eyebrow">Scene ${scene.n} &middot; ${esc(scene.title)}</div>
      <h1>This scene could not render.</h1>
      <p class="sub">Live data was unavailable and no frozen fallback answered.</p>
      <p class="todo-note">${esc(e.message)}</p></section>`;
  }
  // The judge-quote block is optional. With a sentence set, it renders. With none set the
  // whole block is REMOVED — otherwise a visitor reads "<their exact sentence — edit
  // JUDGE_SENTENCE in src/scenes.js at 10:30>", which is an editing note, not a title card.
  if (scene.id === "lane") {
    body = JUDGE_SENTENCE
      ? body.replace(
          /<span id="judge-sentence">[\s\S]*?<\/span>/,
          `<span id="judge-sentence" style="color:var(--ink)">${esc(JUDGE_SENTENCE)}</span>`,
        )
      : body.replace(/<blockquote id="judge-quote"[\s\S]*?<\/blockquote>/, "");
  }
  return `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Deal Memory &middot; ${esc(scene.title)}</title><style>${CSS}</style></head>
<body><div class="wrap">
  <div class="topbar">
    <div class="brand">deal<span>memory</span></div>
    <div class="muted">institutional memory for private credit &middot; Mind Games, Stanford, 25 Jul 2026</div>
  </div>
  <nav class="strip">${strip(scene.id)}</nav>
  ${body}
  ${scene.built ? directorNote(scene) : ""}
  <div class="labels">${
    // An unbuilt scene's labels describe what it WILL carry. Rendering "LIVE" in green on a
    // page that has no implementation is exactly the lie the labels exist to prevent.
    scene.built
      ? scene.labels.map((l) => `<span class="${labelClass(l)}">${esc(l)}</span>`).join("")
      : scene.labels.map((l) => `<span class="label planned">planned: ${esc(l)}</span>`).join("")
  }</div>
  <footer>All entities and figures are SYNTHETIC and invented. Enid is the use case, not an integration.</footer>
</div></body></html>`;
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (c) => {
      data += c;
      if (data.length > 10_000) reject(new Error("body too large"));
    });
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

const json = (res, code, obj) => {
  res.writeHead(code, { "content-type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(obj));
};

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  const path = url.pathname.replace(/\/+$/, "") || "/";

  if (path === "/healthz") {
    res.writeHead(200, { "content-type": "text/plain; charset=utf-8" });
    return res.end("ok");
  }
  if (path === "/api/flip") {
    try { return json(res, 200, await getFlip()); }
    catch (e) { return json(res, 502, { error: e.message }); }
  }
  if (path === "/api/ask") {
    try { return json(res, 200, await ask(url.searchParams.get("q") || "")); }
    catch (e) { return json(res, 502, { error: redact(e.message) }); }
  }
  if (path === "/api/register") {
    try { return json(res, 200, register()); }
    catch (e) { return json(res, 502, { error: redact(e.message) }); }
  }
  if (path === "/api/attest" && req.method === "POST") {
    try {
      const body = JSON.parse((await readBody(req)) || "{}");
      return json(res, 200, { ...attest({ who: body.who }), register: register() });
    } catch (e) {
      return json(res, 400, { error: redact(e.message) });
    }
  }
  if (path === "/api/ablation") {
    // Runs both arms live: 10 model calls. No cached scores, ever.
    try { return json(res, 200, await runAblation()); }
    catch (e) { return json(res, 502, { error: e.message }); }
  }
  if (path === "/api/scenes") {
    res.writeHead(200, { "content-type": "application/json; charset=utf-8" });
    return res.end(JSON.stringify(SCENES.map(({ id, n, title, labels, built }) => ({ id, n, title, labels, built }))));
  }
  if (path === "/") {
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    return res.end(await page(getScene("lane")));
  }
  const m = path.match(/^\/scene\/([a-z0-9-]+)$/i);
  if (m) {
    const scene = getScene(m[1]);
    if (scene) {
      res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      return res.end(await page(scene));
    }
  }
  res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
  res.end("not found");
});

server.listen(PORT, HOST, () => {
  console.log(`deal-memory listening on http://${HOST}:${PORT}`);
});
