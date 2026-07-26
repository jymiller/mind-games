-- Deal Memory — the source of truth.
--
-- Postgres holds the deal. Memory holds a DERIVED COPY. Everything interesting in this
-- project is the gap between the two, so the schema is built to make that gap measurable:
--
--   * every figure carries the document it came from, so a memory answer can be traced back
--   * corrections live in their own table rather than overwriting the original, because the
--     original really was filed and really was signed — you cannot un-file it
--   * memory_sync.fact_key is the load-bearing idea: a stable identity for a MEASUREMENT
--     ('thornwick:ebitda:2026-03-31'), separate from its VALUE. When the value under a key
--     changes, that is a revision — so we detect revisions ourselves instead of hoping the
--     extractor notices. That is the one gap the hackathon build could not close.

drop view if exists v_position cascade;
drop view if exists v_effective_covenant cascade;
drop table if exists memory_sync cascade;
drop table if exists attestation cascade;
drop table if exists restatement cascade;
drop table if exists submission cascade;
drop table if exists covenant cascade;
drop table if exists agreement cascade;
drop table if exists borrower cascade;

create table borrower (
  id            text primary key,
  legal_name    text not null,
  sponsor       text,
  auditor       text,
  prior_auditor text
);

create table agreement (
  id          text primary key,
  borrower_id text not null references borrower(id),
  signed_on   date not null,
  agent       text,
  source_doc  text not null
);

-- Covenant levels are effective-dated. An amendment does not edit history; it adds a row with
-- a later effective_from. 'What was the limit in May?' then becomes a real query.
create table covenant (
  id             bigserial primary key,
  agreement_id   text not null references agreement(id),
  kind           text not null check (kind in ('leverage', 'interest_cover')),
  comparator     text not null check (comparator in ('<=', '>=')),
  threshold      numeric(6,2) not null,
  effective_from date not null,
  effective_to   date,
  instrument     text not null,
  source_doc     text not null
);

-- What the borrower certified. A CLAIM, not the truth, and immutable: it was filed and signed
-- on a date, and a later correction does not unfile it.
create table submission (
  id            bigserial primary key,
  agreement_id  text not null references agreement(id),
  test_date     date not null,
  filed_on      date not null,
  net_debt      numeric(10,1) not null,
  ebitda        numeric(10,1) not null,
  cash_interest numeric(10,1),
  attested_by   text,
  source_doc    text not null,
  unique (agreement_id, test_date)
);

-- The correction. Its own table on purpose: this is the event that makes memory stale.
create table restatement (
  id              bigserial primary key,
  submission_id   bigint not null references submission(id),
  restated_ebitda numeric(10,1) not null,
  removed         numeric(10,1),
  reason          text not null,
  effective_on    date not null,
  source_doc      text not null
);

-- Human sign-off, hash-chained. Out of the ephemeral JSON file so it survives a deploy.
create table attestation (
  id        bigserial primary key,
  seq       integer not null unique,
  prev_hash text not null,
  hash      text not null,
  who       text not null,
  action    text not null,
  basis     text not null,
  at        timestamptz not null default now()
);

-- The bridge between the database and memory.
--
-- Two rows sharing a fact_key with different value_text ARE a revision. That is the entire
-- detector: no model call, no guessing — a unique key and a changed value.
create table memory_sync (
  id               bigserial primary key,
  fact_key         text not null,
  value_text       text not null,
  fact_text        text not null,
  source_table     text not null,
  source_id        text not null,
  xtrace_memory_id text,
  status           text not null default 'pending'
                   check (status in ('pending', 'live', 'superseded', 'failed')),
  supersedes       bigint references memory_sync(id),
  error            text,
  synced_at        timestamptz,
  created_at       timestamptz not null default now(),
  unique (fact_key, value_text)
);

create index memory_sync_key_status on memory_sync (fact_key, status);

-- The covenant level in force at a given test date.
create view v_effective_covenant as
select c.agreement_id, c.kind, c.comparator, c.threshold,
       c.effective_from, c.effective_to, c.instrument, s.test_date
from covenant c
join submission s
  on s.agreement_id = c.agreement_id
 and s.test_date >= c.effective_from
 and (c.effective_to is null or s.test_date <= c.effective_to);

-- GROUND TRUTH. The database's own answer for every test date: the figure as certified, the
-- figure as it stands now, the ratio, and the verdict — computed in SQL, independently of the
-- JavaScript assess() the app uses. The eval therefore compares three implementations.
create view v_position as
select
  b.id                                  as borrower_id,
  b.legal_name,
  s.agreement_id,
  s.test_date,
  s.filed_on,
  s.attested_by,
  s.net_debt,
  s.ebitda                              as certified_ebitda,
  r.restated_ebitda,
  coalesce(r.restated_ebitda, s.ebitda) as current_ebitda,
  r.removed                             as ebitda_removed,
  r.reason                              as restatement_reason,
  r.effective_on                        as restated_on,
  ec.threshold                          as leverage_cap,
  ec.instrument                         as covenant_instrument,
  round(s.net_debt / s.ebitda, 2)       as certified_leverage,
  round(s.net_debt / coalesce(r.restated_ebitda, s.ebitda), 2) as current_leverage,
  case when round(s.net_debt / s.ebitda, 2) <= ec.threshold
       then 'COMPLIANT' else 'BREACH' end as certified_verdict,
  case when round(s.net_debt / coalesce(r.restated_ebitda, s.ebitda), 2) <= ec.threshold
       then 'COMPLIANT' else 'BREACH' end as current_verdict,
  (r.id is not null)                    as was_restated
from submission s
join agreement a on a.id = s.agreement_id
join borrower b  on b.id = a.borrower_id
left join restatement r on r.submission_id = s.id
left join v_effective_covenant ec
       on ec.agreement_id = s.agreement_id
      and ec.test_date = s.test_date
      and ec.kind = 'leverage';
