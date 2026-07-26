-- Evaluation tables.
--
-- Deliberately NOT dropped by db/schema.sql: an evaluation is only worth anything if runs
-- accumulate and can be compared. Each run records the conditions it ran under, so a later
-- number can be argued against an earlier one.

create table if not exists eval_run (
  id           bigserial primary key,
  started_at   timestamptz not null default now(),
  finished_at  timestamptz,
  git_commit   text,
  scope        text not null,
  search_mode  text not null,
  corpus_facts integer,
  memory_rows  integer,
  probes       integer,
  correct      integer,
  stale        integer,
  contradictory integer,
  absent       integer,
  wrong        integer,
  notes        text
);

create table if not exists eval_result (
  id            bigserial primary key,
  run_id        bigint not null references eval_run(id) on delete cascade,
  fact_key      text not null,
  question      text not null,
  expected      text not null,
  superseded    text,
  verdict       text not null check (verdict in ('correct', 'stale', 'contradictory', 'absent', 'not_stored', 'wrong')),
  top_score     numeric(6,4),
  rows_returned integer,
  answer_excerpt text
);

create index if not exists eval_result_run on eval_result (run_id, verdict);
