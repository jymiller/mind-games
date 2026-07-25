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

function page(scene) {
  let body = scene.built ? scene.render() : placeholder(scene);
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

const server = createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  const path = url.pathname.replace(/\/+$/, "") || "/";

  if (path === "/healthz") {
    res.writeHead(200, { "content-type": "text/plain; charset=utf-8" });
    return res.end("ok");
  }
  if (path === "/api/scenes") {
    res.writeHead(200, { "content-type": "application/json; charset=utf-8" });
    return res.end(JSON.stringify(SCENES.map(({ id, n, title, labels, built }) => ({ id, n, title, labels, built }))));
  }
  if (path === "/") {
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    return res.end(page(getScene("lane")));
  }
  const m = path.match(/^\/scene\/([a-z0-9-]+)$/i);
  if (m) {
    const scene = getScene(m[1]);
    if (scene) {
      res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      return res.end(page(scene));
    }
  }
  res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
  res.end("not found");
});

server.listen(PORT, HOST, () => {
  console.log(`deal-memory listening on http://${HOST}:${PORT}`);
});
