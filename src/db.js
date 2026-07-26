// Postgres — the source of truth.
//
// This is the first dependency in the project (`pg`). The zero-dep rule was worth keeping
// while the core was an HTTP server and some arithmetic; hand-rolling the Postgres wire
// protocol to avoid one 14-package install would be dogma rather than discipline. Noted
// rather than quietly broken.
//
// Locally: a throwaway container on 5434. On Render: the blueprint declares the database and
// injects DATABASE_URL, so no credential is ever typed anywhere.
import pg from "pg";
import { loadEnv } from "./xtrace.js";

const env = loadEnv();

// Render's internal connection string needs no TLS; external ones do. Detect rather than ask.
const needsSsl = /\.render\.com|sslmode=require/.test(env.DATABASE_URL || "");

let pool = null;
export function db() {
  if (!env.DATABASE_URL) throw new Error("DATABASE_URL is not set — the source of truth is unreachable");
  if (!pool) {
    pool = new pg.Pool({
      connectionString: env.DATABASE_URL,
      ssl: needsSsl ? { rejectUnauthorized: false } : false,
      max: 4,
      idleTimeoutMillis: 10000,
      connectionTimeoutMillis: 8000,
    });
    pool.on("error", () => { /* a dead idle client must not take the process down */ });
  }
  return pool;
}

export const q = async (text, params = []) => (await db().query(text, params)).rows;
export const one = async (text, params = []) => (await q(text, params))[0] || null;
export const hasDb = () => Boolean(env.DATABASE_URL);

export async function close() {
  if (pool) { await pool.end(); pool = null; }
}

// --- reads the app uses -----------------------------------------------------------------

// Ground truth for every test date, straight from the SQL view. The verdicts here are
// computed by Postgres, not by src/deal.js — which is the point: two implementations.
export const positions = () =>
  q(`select * from v_position order by borrower_id, test_date`);

export const positionAt = (borrower, testDate) =>
  one(`select * from v_position where borrower_id = $1 and test_date = $2`, [borrower, testDate]);

export const borrowers = () => q(`select * from borrower order by legal_name`);

export const covenantsFor = (agreementId) =>
  q(`select * from covenant where agreement_id = $1 order by kind, effective_from`, [agreementId]);

// Every fact the database believes, rendered for sync. One row per measurement, and the
// fact_key is what makes a later change detectable as a revision rather than a new fact.
export function factsForSync() {
  return q(`
    select fact_key, value_text, fact_text, source_table, source_id from (
      -- the covenant level in force, per borrower per instrument
      select
        b.id || ':leverage_cap:' || c.effective_from            as fact_key,
        c.threshold::text                                      as value_text,
        b.legal_name || ' must keep Total Net Leverage at or below ' || c.threshold ||
          'x for Test Dates from ' || c.effective_from || ', under the ' || c.instrument || '.' as fact_text,
        'covenant'                                             as source_table,
        c.id::text                                             as source_id,
        1                                                      as ord
      from covenant c
      join agreement a on a.id = c.agreement_id
      join borrower b  on b.id = a.borrower_id
      where c.kind = 'leverage'

      union all
      -- what the borrower certified
      select
        b.id || ':certified_ebitda:' || s.test_date,
        s.ebitda::text,
        b.legal_name || ' certified Adjusted EBITDA of GBP ' || s.ebitda || 'm for the Test Date ' ||
          s.test_date || ', filed ' || s.filed_on || '.',
        'submission', s.id::text, 2
      from submission s
      join agreement a on a.id = s.agreement_id
      join borrower b  on b.id = a.borrower_id

      union all
      select
        b.id || ':net_debt:' || s.test_date,
        s.net_debt::text,
        b.legal_name || ' reported Total Net Debt of GBP ' || s.net_debt || 'm at the Test Date ' ||
          s.test_date || '.',
        'submission', s.id::text, 3
      from submission s
      join agreement a on a.id = s.agreement_id
      join borrower b  on b.id = a.borrower_id

      union all
      -- THE ONE THAT MOVES. Reusing the certified_ebitda key would be wrong, because that
      -- figure really was filed and stays true as a filing. This key is the position's
      -- earnings as they now stand, so a restatement changes its value — a revision.
      select
        b.id || ':ebitda:' || s.test_date,
        coalesce(r.restated_ebitda, s.ebitda)::text,
        b.legal_name || ' Adjusted EBITDA for the Test Date ' || s.test_date || ' is GBP ' ||
          coalesce(r.restated_ebitda, s.ebitda) || 'm.',
        'submission', s.id::text, 4
      from submission s
      join agreement a on a.id = s.agreement_id
      join borrower b  on b.id = a.borrower_id
      left join restatement r on r.submission_id = s.id

      union all
      -- and the conclusion that depends on it
      select
        p.borrower_id || ':verdict:' || p.test_date,
        p.current_leverage || ' ' || p.current_verdict,
        p.legal_name || ' Total Net Leverage at the Test Date ' || p.test_date || ' is ' ||
          p.current_leverage || 'x against a limit of ' || p.leverage_cap || 'x, which is a ' ||
          p.current_verdict || '.',
        'v_position', p.borrower_id || ':' || p.test_date, 5
      from v_position p
    ) f
    order by ord, fact_key
  `);
}
