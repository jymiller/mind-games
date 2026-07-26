// Apply the schema, and optionally the seed. Safe to re-run: schema drops and recreates,
// seed truncates first. This is a demo corpus, not production data.
//
//   npm run db:migrate     # schema only
//   npm run db:seed        # schema + seed
import { readFileSync } from "node:fs";
import { db, close, positions } from "../src/db.js";

const file = (n) => readFileSync(new URL(n, import.meta.url), "utf8");

const withSeed = process.argv.includes("--seed");
const client = await db().connect();
try {
  console.log("applying db/schema.sql …");
  await client.query(file("schema.sql"));
  if (withSeed) {
    console.log("applying db/seed.sql …");
    await client.query(file("seed.sql"));
  }
} finally {
  client.release();
}

const rows = await positions();
console.log(`\nsource of truth: ${rows.length} position(s)\n`);
for (const p of rows) {
  const flip = p.certified_verdict !== p.current_verdict ? "  <- verdict changed" : "";
  console.log(
    `  ${p.borrower_id.padEnd(10)} ${p.test_date.toISOString().slice(0, 10)}  cap ${p.leverage_cap}` +
      `  certified ${p.certified_leverage} ${p.certified_verdict.padEnd(9)}` +
      `  now ${p.current_leverage} ${p.current_verdict}${flip}`,
  );
}
await close();
