// XTrace access + a zero-dep .env loader.
//
// RAW HTTP ONLY. The @xtraceai/memory SDK is unusable on the current credentials:
// `new MemoryClient()` throws "orgId is required" and the rotated key (mmk_…, org "milbird")
// carries no org id in the Memory-API format. Auth is the bearer key alone.
import { readFileSync } from "node:fs";

export function loadEnv() {
  const env = { ...process.env };
  try {
    const txt = readFileSync(new URL("../.env", import.meta.url), "utf8");
    for (const raw of txt.split("\n")) {
      const m = raw.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
      if (m && !env[m[1]]) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  } catch { /* no .env yet */ }
  // Trim every value. A key pasted into a dashboard textarea picks up a newline, and
  // `Bearer \nmmk_…` is rejected by fetch as an invalid header value — which reads as
  // "memory unreachable" and silently drops the app to its frozen fallback.
  for (const k of Object.keys(env)) if (typeof env[k] === "string") env[k] = env[k].trim();
  return env;
}

const env = loadEnv();
export const BASE = env.XTRACE_BASE_URL || "https://api.production.xtrace.ai";

export async function req(method, path, body) {
  if (!env.XTRACE_API_KEY) throw new Error("XTRACE_API_KEY missing from .env");
  const r = await fetch(BASE + path, {
    method,
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${env.XTRACE_API_KEY}`,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if (r.status === 204) return null;
  const text = await r.text();
  let json;
  try { json = JSON.parse(text); } catch { json = text; }
  if (!r.ok) {
    const detail = typeof json === "string" ? json : JSON.stringify(json);
    throw new Error(`XTrace ${method} ${path} -> ${r.status}: ${detail}`);
  }
  return json;
}

// --- scope axes -------------------------------------------------------------
// The domain corpus the PRODUCT reasons over. Build/dev memory lives on a disjoint
// user_id + app_id (mg-build / mind-games-build) and is never read from here.
export const DOMAIN_SCOPE = { user_id: "deal-memory", app_id: "deal-memory-domain" };

// --- endpoints --------------------------------------------------------------
export const ingest = (body) => req("POST", "/v1/memories", body);
export const search = (body) => req("POST", "/v1/memories/search", body);
export const deleteMemory = (id) => req("DELETE", `/v1/memories/${id}`);
export const getUsage = () => req("GET", "/v1/usage");
export const getRevisions = (id) => req("GET", `/v1/memories/${id}/revisions`);

export function listMemories({ user_id, app_id, limit = 100 } = {}) {
  const qs = new URLSearchParams();
  if (user_id) qs.set("user_id", user_id);
  if (app_id) qs.set("app_id", app_id);
  qs.set("limit", String(limit));
  return req("GET", `/v1/memories?${qs}`);
}

// THE ONLY read the application path may use. Hardcodes the domain scope so a caller
// cannot accidentally issue an unscoped search and surface build chatter in covenant recall.
export const searchDomain = (query, limit = 5) =>
  search({ ...DOMAIN_SCOPE, query, limit, mode: "compose" });

// Kept so old call sites fail loudly instead of silently constructing a broken SDK client.
export function makeClient() {
  throw new Error("makeClient() removed — the SDK needs an orgId we do not have. Use searchDomain/ingest from src/xtrace.js.");
}
