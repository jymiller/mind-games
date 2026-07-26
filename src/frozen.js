// Frozen captures — so the app is never simply broken.
//
// Every scene that depends on a network call keeps a capture of a real successful run on
// disk. If the call fails, the scene renders the capture and labels itself PRERUN. That is
// the difference between honest and stale: the figures are real, they were true when
// captured, and the page says out loud that they are not live.
//
// Captures are produced by scripts/freeze-scenes.mjs from actual runs. Nothing in here is
// hand-written, and no capture is ever presented as LIVE.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname } from "node:path";

const dir = new URL("../fixtures/replay/", import.meta.url);
const fileFor = (name) => new URL(`${name}.json`, dir);

export function saveCapture(name, data) {
  const path = dirname(new URL(fileFor(name)).pathname);
  if (!existsSync(path)) mkdirSync(path, { recursive: true });
  writeFileSync(fileFor(name), JSON.stringify({ capturedAt: new Date().toISOString(), data }, null, 2) + "\n");
}

export function loadCapture(name) {
  try {
    const j = JSON.parse(readFileSync(fileFor(name), "utf8"));
    return j && j.data ? j : null;
  } catch {
    return null;
  }
}

// One place decides what the label says, so the vocabulary cannot drift per scene.
export const LIVE = "LIVE";
export const PRERUN = "PRERUN";
export const SYNTHETIC = "SYNTHETIC";
