// Never let a credential reach a screen.
//
// fetch() puts the offending header VALUE into its error text, so "Bearer mmk_…" ends up
// inside e.message. We surface e.message on the page by design — an honest failure beats a
// cached score — which means the honest failure was printing the API key to anyone who
// clicked. Redact before anything is rendered or returned over HTTP.
import { loadEnv } from "./xtrace.js";

const env = loadEnv();

// The live values, longest first so a longer key is replaced before a shorter substring.
const SECRETS = ["XTRACE_API_KEY", "NOVITA_API_KEY", "RENDER_API_KEY", "PARASAIL_API_KEY"]
  .map((k) => env[k])
  .filter((v) => typeof v === "string" && v.length >= 8)
  .sort((a, b) => b.length - a.length);

// Belt and braces: catch key-shaped tokens even if they never came from our env.
const SHAPES = [
  /\b(?:mmk|xtk|sk|rnd|pk|api)[-_][A-Za-z0-9_-]{12,}\b/g,
  /\bBearer\s+[A-Za-z0-9._~+/=-]{12,}/gi,
];

export function redact(input) {
  let s = typeof input === "string" ? input : String(input?.message ?? input ?? "");
  for (const secret of SECRETS) if (secret) s = s.split(secret).join("[REDACTED]");
  for (const re of SHAPES) s = s.replace(re, (m) => (/^Bearer/i.test(m) ? "Bearer [REDACTED]" : "[REDACTED]"));
  return s;
}
