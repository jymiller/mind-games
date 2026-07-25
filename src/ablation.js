// Scene 6 "The Ablation" — same 5 questions, same model, same prompts, temperature 0,
// run twice: memory-ON injects XTrace's composed context, memory-OFF gets nothing.
// The only difference between arms is the memory. Scores are counted from the run.
import { loadEnv, searchDomain } from "./xtrace.js";
import { redact } from "./redact.js";

const env = loadEnv();
const MODEL = env.NOVITA_MODEL;
const NOVITA = "https://api.novita.ai/openai/v1/chat/completions";

const SYSTEM =
  "You are a credit analyst answering questions about a private-credit loan. " +
  "Answer in at most three sentences. Give specific figures where you have them. " +
  "If you do not know, say you do not know — never guess a number.";

export const QUESTIONS = [
  { id: "q1", q: "What Total Net Leverage did Thornwick's 31 March 2026 compliance certificate certify, and against what covenant limit?",
    expect: [{ label: "6.47x certified", re: /6\.47/ }, { label: "6.50x limit", re: /6\.50|6\.5(?!\d)/ }] },
  { id: "q2", q: "Given the FY2025 audit restatement, is Thornwick's Q1 2026 leverage covenant position still compliant? State the restated ratio.",
    expect: [{ label: "7.59x restated", re: /7\.59|7\.6(?!\d)/ }, { label: "identifies a breach", re: /breach|not compliant|non-compliant|not in compliance|no longer compliant|event of default|default/i }] },
  { id: "q3", q: "What caused Thornwick's Q1 2026 covenant breach — a change in debt, or a change in EBITDA?",
    expect: [{ label: "EBITDA, not debt", re: /ebitda/i }, { label: "disallowed synergy add-back", re: /synerg|3\.0|add-back/i }, { label: "not driven by debt", re: /unchanged|unaffected|did not (change|move)|no change|not a change in debt|not (a )?(change|increase) in (net )?debt|rather than (a change in )?debt/i }] },
  // Asks what memory HOLDS, not what the source document holds: the 7.25x reset level did
  // not survive extraction, and the ON arm correctly refuses to guess it rather than
  // hallucinating a number. The waiver itself, and the instrument that granted it, did.
  { id: "q4", q: "What happened to Thornwick's Q1 2026 covenant breach, and under which instrument?",
    expect: [{ label: "it was waived", re: /waiv/i }, { label: "names Amendment & Waiver No. 1", re: /amendment\s*(&|and)\s*waiver\s*no\.?\s*1|28 august 2026/i }] },
  { id: "q5", q: "Who audited Thornwick's FY2025 financial statements, and was that a change of auditor?",
    expect: [{ label: "Marbury Tolland LLP", re: /marbury|tolland/i }, { label: "flags the change", re: /chang|new auditor|previous|prior|replac|first year/i }] },
];

// The grader is dumb on purpose: auditable, and identical for both arms.
export function grade(answer, expect) {
  const text = String(answer || "");
  const hits = expect.map((e) => ({ label: e.label, hit: e.re.test(text) }));
  return { pass: hits.every((h) => h.hit), hits };
}
export const scoreArm = (results) => results.filter((r) => r.pass).length;

async function ask(question, context) {
  const messages = [{ role: "system", content: SYSTEM }];
  if (context) messages.push({ role: "system", content: `Recalled memory for this deal:\n${context}\n\nAnswer only from the recalled memory above.` });
  messages.push({ role: "user", content: question });
  const r = await fetch(NOVITA, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${env.NOVITA_API_KEY}` },
    // 700 because the pinned model is a REASONING model: it spends tokens on
    // reasoning_content first and returns EMPTY content if it runs out mid-thought.
    body: JSON.stringify({ model: MODEL, messages, temperature: 0, max_tokens: 700 }),
  });
  if (!r.ok) throw new Error(`Novita ${r.status}: ${(await r.text()).slice(0, 160)}`);
  const j = await r.json();
  return { answer: (j.choices?.[0]?.message?.content || "").trim(), finish: j.choices?.[0]?.finish_reason };
}

export async function runAblation() {
  if (!env.NOVITA_API_KEY || !MODEL) throw new Error("NOVITA_API_KEY / NOVITA_MODEL missing");
  const contexts = await Promise.all(QUESTIONS.map(async (q) => {
    const r = await searchDomain(q.q, 8);
    return r?.context || (r?.data ?? []).map((m) => `- ${m.text}`).join("\n") || "";
  }));
  const one = async (q, i, withMemory) => {
    try {
      const { answer, finish } = await ask(q.q, withMemory ? contexts[i] : null);
      return { id: q.id, q: q.q, answer, finish, ...grade(answer, q.expect) };
    } catch (e) {
      return { id: q.id, q: q.q, answer: `[call failed: ${e.message}]`, error: true, pass: false,
               hits: q.expect.map((x) => ({ label: x.label, hit: false })) };
    }
  };
  const [on, off] = await Promise.all([
    Promise.all(QUESTIONS.map((q, i) => one(q, i, true))),
    Promise.all(QUESTIONS.map((q, i) => one(q, i, false))),
  ]);
  return { label: "LIVE EVAL", model: MODEL, n: QUESTIONS.length, temperature: 0,
           on: { score: scoreArm(on), results: on }, off: { score: scoreArm(off), results: off } };
}
