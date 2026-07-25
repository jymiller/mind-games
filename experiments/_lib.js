// Shared helpers for the XTrace experiment harness.
import { loadEnv, makeClient } from "../src/xtrace.js";

export const env = loadEnv();
export const client = makeClient(env);

export function requireClient() {
  if (!client) {
    console.log("⚠  No XTrace credentials. cp .env.example .env and paste XTRACE_API_KEY + XTRACE_ORG_ID.");
    process.exit(1);
  }
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export const hd = (t) => console.log(`\n===== ${t} =====`);
export const PASS = (m) => console.log(`  ✓ PASS     ${m}`);
export const FAIL = (m) => console.log(`  ✗ FAIL     ${m}`);
export const LOOK = (m) => console.log(`  • INSPECT  ${m}`);

// Ingest and wait for extraction; returns the terminal IngestJob.
export async function ingestWait(body) {
  let job = await client.memories.ingest(body, { wait: true });
  if (job.status !== "succeeded") {
    job = await client.memories.jobs.pollUntilDone(job.id, { timeoutMs: 30000 });
  }
  return job;
}

// First memory id created by an ingest job (or null).
export const firstCreatedId = (job) => job.result?.memories_created?.[0]?.id ?? null;

// Scoped search -> rows.
export async function search(query, scope, limit = 5) {
  const r = await client.memories.search({ query, limit, ...scope });
  return r.data ?? [];
}

// Compact printer for a memory row.
export function showMemory(m, label = "memory") {
  if (!m) return console.log(`  ${label}: (none)`);
  const d = m.details ?? {};
  console.log(`  ${label}: [${m.type}] "${(m.text || "").slice(0, 70)}"`);
  console.log(`      id=${m.id} status=${d.status ?? m.status ?? "?"} supersedes=${d.supersedes ?? "null"} groups=${JSON.stringify(m.group_ids ?? [])}`);
}
