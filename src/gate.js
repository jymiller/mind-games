// Scene 7 "The Gate" — the agent proposes; it does not write.
//
// A covenant determination is a legal act. The agent found the breach in Scene 4, but it
// does not hold the authority to file it, so it produces a PROPOSAL that is blocked on a
// human. Only an explicit attestation commits anything, and the attestation is itself
// recorded — so next quarter the file knows who decided and on what evidence.
//
// The register is an append-only hash chain: each entry carries the hash of the one before
// it, so a later edit to any entry breaks every hash after it. XTrace gives us value
// provenance, not an audit log — this is our own ledger, deliberately.
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

const FILE = new URL("../data/register.json", import.meta.url);
const GENESIS = "0".repeat(64);

const sha256 = (s) => createHash("sha256").update(s).digest("hex");

function load() {
  try {
    if (!existsSync(FILE)) return [];
    return JSON.parse(readFileSync(FILE, "utf8"));
  } catch {
    return [];
  }
}

function save(entries) {
  const dir = dirname(new URL(FILE).pathname);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(FILE, JSON.stringify(entries, null, 2) + "\n");
}

// What the agent WANTS to do. Deliberately not an action — a description of one.
export function propose() {
  return {
    action: "Issue a reservation-of-rights notice to Thornwick Logistics Holdings Limited",
    basis: "Total Net Leverage of 7.59x at the 31 March 2026 Test Date against a 6.50x covenant",
    authority: "DENIED",
    reason: "A covenant determination requires a human credit officer's attestation. The agent may not commit it.",
    blocked_on_human: true,
  };
}

export function register() {
  const entries = load();
  return { entries, count: entries.length, verified: verifyChain(entries) };
}

// Recompute every link. Any edit to any entry breaks this from that point on.
export function verifyChain(entries = load()) {
  let prev = GENESIS;
  for (const e of entries) {
    if (e.prev !== prev) return { ok: false, brokeAt: e.seq, why: "prev hash does not match the entry before it" };
    if (e.hash !== sha256(`${e.seq}|${e.prev}|${e.at}|${e.who}|${e.action}|${e.basis}`)) {
      return { ok: false, brokeAt: e.seq, why: "entry content does not match its own hash" };
    }
    prev = e.hash;
  }
  return { ok: true, links: entries.length };
}

// The ONLY thing that writes. Nothing above this line touches the register.
export function attest({ who, at }) {
  if (!who || !String(who).trim()) throw new Error("an attestation needs a named human");
  const entries = load();
  const p = propose();
  const prev = entries.length ? entries[entries.length - 1].hash : GENESIS;
  const seq = entries.length + 1;
  const stamp = at || new Date().toISOString();
  const entry = {
    seq,
    prev,
    at: stamp,
    who: String(who).trim(),
    action: p.action,
    basis: p.basis,
    hash: sha256(`${seq}|${prev}|${stamp}|${String(who).trim()}|${p.action}|${p.basis}`),
  };
  entries.push(entry);
  save(entries);
  return { committed: entry, chain: verifyChain(entries) };
}

export const REGISTER_FILE = FILE;
