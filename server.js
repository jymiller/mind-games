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
.chip.todo{opacity:.55}
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

function strip(activeId) {
  return SCENES.map(
    (s) =>
      `<a class="chip ${s.id === activeId ? "on" : ""} ${s.built ? "" : "todo"}" href="/scene/${s.id}">` +
      `<b>${s.n}</b> ${esc(s.title)}${s.built ? "" : " &middot; todo"}</a>`,
  ).join("");
}

function placeholder(scene) {
  return `
    <section class="card">
      <div class="eyebrow">Scene ${scene.n} &middot; ${esc(scene.title)}</div>
      <h1>Not built yet.</h1>
      <p class="sub">This scene has no implementation on the server. It is a placeholder, and it
      says so &mdash; it does not render a mock as though it were real.</p>
      <p class="todo-note">Build order is Scene 2 &rarr; 4 &rarr; 6 first. See <code>BUILD-LOOP.md</code>.</p>
    </section>`;
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
  if (scene.id === "lane" && JUDGE_SENTENCE) {
    body = body.replace(
      /<span id="judge-sentence">[\s\S]*?<\/span>/,
      `<span id="judge-sentence" style="color:var(--ink)">${esc(JUDGE_SENTENCE)}</span>`,
    );
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
  <div class="labels">${scene.labels.map((l) => `<span class="${labelClass(l)}">${esc(l)}</span>`).join("")}</div>
  <footer>All entities and figures are SYNTHETIC and invented. Enid is the use case, not an integration.</footer>
</div></body></html>`;
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
