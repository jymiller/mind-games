// Voice control — the intent layer.
//
// Speech-to-text happens in the BROWSER (Web Speech API). It is free, needs no key, and
// adds no round trip. Novita was the obvious candidate for it and cannot do it: probed
// /openai/v1/audio/transcriptions, /v3/audio/transcriptions, /v3/whisper, /v3/asr,
// /v3/speech2text and /v3/minimax/asr — all 404 — and its 142-model catalogue lists no ASR.
// Novita DOES have TTS at POST /v3/async/txt2speech if we ever want spoken replies.
//
// What lives here is the part worth testing: turning a heard phrase into an action. It is
// deliberately plain string matching, not a model call — a voice command that needs an LLM
// round trip to decide "go to scene 4" would feel broken, and this way it is auditable.
import { SCENES } from "./scenes.js";

// Spoken aliases per scene. People say "the money one", not "scene four".
const ALIASES = {
  lane: ["lane", "title", "home", "start", "beginning", "front page", "intro"],
  recall: ["recall", "card", "deal card", "memory card", "file", "what the file knows"],
  drift: ["drift", "rename", "renamed", "field", "schema", "shape"],
  flip: ["flip", "breach", "money", "money shot", "the turn", "verdict", "compliant"],
  chain: ["chain", "lineage", "history", "timeline", "crossed out", "audit", "trail"],
  ablation: ["ablation", "test", "eval", "evaluation", "score", "scores", "proof", "on and off"],
  gate: ["gate", "approval", "approve", "attest", "sign", "signature", "permission", "denied"],
  openbox: ["open box", "openbox", "ask", "question", "anything", "box"],
};

const norm = (s) =>
  String(s || "").toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();

const WORD_NUMBERS = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8 };

function sceneFromNumber(t) {
  const digit = t.match(/\bscene\s+(\d)\b/) || t.match(/\bnumber\s+(\d)\b/) || t.match(/^(\d)$/);
  if (digit) return SCENES.find((s) => s.n === Number(digit[1])) || null;
  const word = t.match(/\bscene\s+(one|two|three|four|five|six|seven|eight)\b/);
  if (word) return SCENES.find((s) => s.n === WORD_NUMBERS[word[1]]) || null;
  return null;
}

function sceneFromAlias(t) {
  // Longest alias first so "open box" beats "box", and "money shot" beats "money".
  const pairs = [];
  for (const [id, words] of Object.entries(ALIASES)) for (const w of words) pairs.push([id, w]);
  pairs.sort((a, b) => b[1].length - a[1].length);
  for (const [id, w] of pairs) {
    if (new RegExp(`\\b${w.replace(/ /g, "\\s+")}\\b`).test(t)) return SCENES.find((s) => s.id === id) || null;
  }
  return null;
}

export function parseCommand(heard, { currentScene = null } = {}) {
  const t = norm(heard);
  if (!t) return { intent: "empty", heard: "" };

  // Stop listening / cancel. Checked first so it always wins.
  if (/\b(stop|cancel|never mind|nevermind|quiet|shut up)\b/.test(t)) return { intent: "stop", heard: t };

  // Read the page aloud.
  if (/\b(read (it|that|this)?|say (it|that)|out loud|speak)\b/.test(t)) return { intent: "speak", heard: t };

  // Run whatever this page runs (the ablation button).
  if (/\b(run|go on then|do it|start the (test|run)|press it)\b/.test(t) && !/\bscene\b/.test(t)) {
    const scene = sceneFromAlias(t) || sceneFromNumber(t);
    return { intent: "run", sceneId: scene ? scene.id : currentScene, heard: t };
  }

  // Move through the strip.
  if (/\b(next|forward|after this)\b/.test(t)) return { intent: "next", heard: t };
  if (/\b(back|previous|before this|go back)\b/.test(t)) return { intent: "prev", heard: t };

  // An explicit question, or a question-shaped phrase, goes to the Open Box.
  const asked = t.match(/^(?:ask|question|tell me|find out)\b[: ]*(.*)$/);
  if (asked && asked[1].trim().length > 2) return { intent: "ask", question: asked[1].trim(), heard: t };
  if (/^(what|who|when|where|why|how|did|does|is|are|has|have|was|were|can)\b/.test(t) && t.split(" ").length >= 3) {
    return { intent: "ask", question: t, heard: t };
  }

  // Navigation, last, so "what happened..." is not eaten by an alias.
  const scene = sceneFromNumber(t) || sceneFromAlias(t);
  if (scene) return { intent: "navigate", sceneId: scene.id, n: scene.n, title: scene.title, heard: t };

  return { intent: "unknown", heard: t };
}

// The phrases the mic panel offers, so a first-time user knows what to say.
export const EXAMPLES = [
  "show me the flip",
  "scene six",
  "run the test",
  "next",
  "what happened to the covenant breach?",
  "read it to me",
];

// Where to go for a navigate/next/prev, computed from the registry rather than hardcoded.
export function resolveTarget(cmd, currentSceneId) {
  const order = SCENES.map((s) => s.id);
  const at = order.indexOf(currentSceneId);
  if (cmd.intent === "navigate") return `/scene/${cmd.sceneId}`;
  if (cmd.intent === "next" && at >= 0 && at < order.length - 1) return `/scene/${order[at + 1]}`;
  if (cmd.intent === "prev" && at > 0) return `/scene/${order[at - 1]}`;
  return null;
}
