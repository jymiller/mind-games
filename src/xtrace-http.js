// DEPRECATED — folded into src/xtrace.js when the SDK path was dropped (org rotation,
// 25 Jul 2026). This file sent an `x-org-id` header we no longer have, so it would have
// sent `undefined`. Re-exported so existing imports keep working.
export { req, getRevisions, getUsage, BASE } from "./xtrace.js";
