-- Add structured repair outcomes and evidence provenance to the private owner vault.
-- Additive only: existing cases and knowledge entries remain intact.

alter table public.diagnostic_cases
  add column if not exists complaint text,
  add column if not exists vehicle_context jsonb not null default '{}'::jsonb,
  add column if not exists fault_codes jsonb not null default '[]'::jsonb,
  add column if not exists tests_performed jsonb not null default '[]'::jsonb,
  add column if not exists confirmed_root_cause text,
  add column if not exists repair_performed text,
  add column if not exists verification_result text not null default 'not_run',
  add column if not exists verification_notes text,
  add column if not exists verified_at timestamptz,
  add column if not exists technician_confidence text not null default 'unknown';

alter table public.knowledge_entries
  add column if not exists source_type text,
  add column if not exists source_title text,
  add column if not exists source_revision text,
  add column if not exists source_location text,
  add column if not exists source_url text,
  add column if not exists source_checked_at timestamptz,
  add column if not exists verification_notes text,
  add column if not exists verified_at timestamptz,
  add column if not exists reviewed_at timestamptz,
  add column if not exists share_consent boolean not null default false;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'diagnostic_cases_verification_result_check') then
    alter table public.diagnostic_cases
      add constraint diagnostic_cases_verification_result_check
      check (verification_result in ('not_run','passed','failed','inconclusive'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'diagnostic_cases_technician_confidence_check') then
    alter table public.diagnostic_cases
      add constraint diagnostic_cases_technician_confidence_check
      check (technician_confidence in ('unknown','low','medium','high'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'knowledge_entries_source_type_check') then
    alter table public.knowledge_entries
      add constraint knowledge_entries_source_type_check
      check (source_type is null or source_type in ('oem_service_info','oem_bulletin','technician_case','training_reference','inference','other'));
  end if;
end $$;

comment on column public.diagnostic_cases.verification_result is
  'Post-repair result. passed requires a documented retest; absence of a reproduced symptom is not automatically a pass.';
comment on column public.knowledge_entries.share_consent is
  'Explicit consent flag for future sharing workflows. Sharing remains disabled until a separate authorization and anonymization path exists.';
comment on column public.knowledge_entries.source_type is
  'Evidence category for the knowledge entry; source details must support the exact claim and applicability.';
