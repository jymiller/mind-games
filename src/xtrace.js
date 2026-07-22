// Thin wrapper around the XTrace Memory client + a zero-dep .env loader.
import { readFileSync } from "node:fs";
import { MemoryClient } from "@xtraceai/memory";

export function loadEnv() {
  const env = { ...process.env };
  try {
    const txt = readFileSync(new URL("../.env", import.meta.url), "utf8");
    for (const raw of txt.split("\n")) {
      const m = raw.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
      if (m && !env[m[1]]) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  } catch { /* no .env yet */ }
  return env;
}

export function makeClient(env = loadEnv()) {
  if (!env.XTRACE_API_KEY || !env.XTRACE_ORG_ID) return null;
  return new MemoryClient({
    apiKey: env.XTRACE_API_KEY,
    orgId: env.XTRACE_ORG_ID,
    ...(env.XTRACE_BASE_URL ? { baseUrl: env.XTRACE_BASE_URL } : {}),
  });
}
