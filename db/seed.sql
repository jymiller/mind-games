-- Seed the source of truth from the fixture documents.
--
-- Every figure here is transcribed from a file in fixtures/, and source_doc records which one,
-- so any row can be argued back to the document it came from. All entities are invented.
--
-- Two borrowers, both restated, both waived — because the point of the corpus is that a
-- correction after the fact is the normal case, not an edge case.

truncate memory_sync, attestation, restatement, submission, covenant, agreement, borrower restart identity cascade;

insert into borrower (id, legal_name, sponsor, auditor, prior_auditor) values
  ('thornwick', 'Thornwick Logistics Holdings Limited', 'Ardenmoor Capital Partners LLP',
   'Marbury Tolland LLP', 'Larkfield Downe LLP'),
  ('halveston', 'Halveston Services Group Limited', 'Ardenmoor Capital Partners LLP',
   'Ravenscourt Hale LLP', null);

insert into agreement (id, borrower_id, signed_on, agent, source_doc) values
  ('thornwick-sfa', 'thornwick', '2024-09-12', 'Fenwater Credit Partners',
   'fixtures/thornwick/01-credit-agreement-excerpt.md'),
  ('halveston-sfa', 'halveston', '2022-03-14', null,
   'fixtures/halveston/01-credit-agreement-excerpt.md');

-- Thornwick leverage. The original levels run until Amendment & Waiver No. 1 takes effect on
-- 2026-08-28; the amended levels run from that date. This is why 'what was the limit in May'
-- and 'what is it now' are different questions with different answers.
insert into covenant (agreement_id, kind, comparator, threshold, effective_from, effective_to, instrument, source_doc) values
  ('thornwick-sfa', 'leverage', '<=', 6.50, '2024-09-12', '2026-08-27', 'Original Agreement',
   'fixtures/thornwick/01-credit-agreement-excerpt.md'),
  ('thornwick-sfa', 'leverage', '<=', 7.25, '2026-08-28', '2026-12-31', 'Amendment & Waiver No. 1',
   'fixtures/thornwick/02-amendment-and-waiver.md'),
  ('thornwick-sfa', 'leverage', '<=', 7.25, '2027-01-01', '2027-09-30', 'Amendment & Waiver No. 1',
   'fixtures/thornwick/02-amendment-and-waiver.md'),
  ('thornwick-sfa', 'leverage', '<=', 6.75, '2027-10-01', '2027-12-31', 'Amendment & Waiver No. 1',
   'fixtures/thornwick/02-amendment-and-waiver.md'),
  ('thornwick-sfa', 'leverage', '<=', 6.25, '2028-01-01', null, 'Amendment & Waiver No. 1',
   'fixtures/thornwick/02-amendment-and-waiver.md'),
  ('thornwick-sfa', 'interest_cover', '>=', 2.00, '2024-09-12', '2026-08-27', 'Original Agreement',
   'fixtures/thornwick/01-credit-agreement-excerpt.md'),
  ('thornwick-sfa', 'interest_cover', '>=', 1.75, '2026-08-28', '2027-09-30', 'Amendment & Waiver No. 1',
   'fixtures/thornwick/02-amendment-and-waiver.md'),
  ('halveston-sfa', 'leverage', '<=', 5.75, '2022-03-14', null, 'Original Agreement',
   'fixtures/halveston/01-credit-agreement-excerpt.md'),
  ('halveston-sfa', 'interest_cover', '>=', 2.25, '2022-03-14', null, 'Original Agreement',
   'fixtures/halveston/01-credit-agreement-excerpt.md');

-- What each borrower certified, quarter by quarter.
insert into submission (agreement_id, test_date, filed_on, net_debt, ebitda, cash_interest, attested_by, source_doc) values
  ('thornwick-sfa', '2025-12-31', '2026-02-12', 217.0, 34.2, 16.3, null,
   'fixtures/thornwick/03-compliance-certificates.md'),
  ('thornwick-sfa', '2026-03-31', '2026-05-13', 220.0, 34.0, 16.5, 'R. Sandoval, Chief Financial Officer',
   'fixtures/thornwick/03-compliance-certificates.md'),
  ('thornwick-sfa', '2026-06-30', '2026-08-11', 220.0, 34.0, 16.5, null,
   'fixtures/thornwick/06-quarterly-field-maps.json'),
  -- Q3 is the quarter where the borrower renamed the earnings line (Scene 3).
  ('thornwick-sfa', '2026-09-30', '2026-11-10', 224.0, 29.5, 17.1, null,
   'fixtures/thornwick/06-quarterly-field-maps.json'),
  ('halveston-sfa', '2024-06-30', '2024-08-14', 140.0, 26.0, 11.0, null,
   'fixtures/halveston/02-compliance-certificate.md');

-- The corrections. Both audits reached back into quarters already certified and signed.
insert into restatement (submission_id, restated_ebitda, removed, reason, effective_on, source_doc)
select s.id, 29.5, 4.7,
       'FY2025 audit: run-rate synergy add-backs disallowed as projected rather than realised, plus revenue recognised before performance obligations were satisfied.',
       '2026-07-03', 'fixtures/thornwick/04-restatement-extract.md'
from submission s where s.agreement_id = 'thornwick-sfa' and s.test_date = '2025-12-31';

insert into restatement (submission_id, restated_ebitda, removed, reason, effective_on, source_doc)
select s.id, 29.0, 5.0,
       'FY2025 audit: GBP 3.0m of claimed synergies disallowed as projected rather than reasonably identifiable, GBP 1.7m of revenue reversed under IFRS 15, GBP 0.3m reclassified as recurring.',
       '2026-07-03', 'fixtures/thornwick/04-restatement-extract.md'
from submission s where s.agreement_id = 'thornwick-sfa' and s.test_date = '2026-03-31';

insert into restatement (submission_id, restated_ebitda, removed, reason, effective_on, source_doc)
select s.id, 22.5, 3.5,
       'FY2024 audit: the entire GBP 3.5m run-rate cost-synergy add-back disallowed as projected and not realised.',
       '2025-03-27', 'fixtures/halveston/03-restatement-note.md'
from submission s where s.agreement_id = 'halveston-sfa' and s.test_date = '2024-06-30';
