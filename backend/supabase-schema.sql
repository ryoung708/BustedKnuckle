-- IronKnuckle current private owner-vault schema snapshot.
-- Fresh-project reference only. For an existing project, apply ordered files in
-- supabase/migrations/ rather than rerunning this snapshot as a migration.

create extension if not exists pgcrypto;

create table if not exists public.diagnostic_cases (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'Untitled diagnostic case',
  status text not null default 'submitted' check (status in ('draft','submitted','in_review','reviewed','archived')),
  raw_case jsonb not null,
  complaint text,
  vehicle_context jsonb not null default '{}'::jsonb,
  fault_codes jsonb not null default '[]'::jsonb,
  tests_performed jsonb not null default '[]'::jsonb,
  confirmed_root_cause text,
  repair_performed text,
  verification_result text not null default 'not_run' check (verification_result in ('not_run','passed','failed','inconclusive')),
  verification_notes text,
  verified_at timestamptz,
  technician_confidence text not null default 'unknown' check (technician_confidence in ('unknown','low','medium','high')),
  submitted_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists diagnostic_cases_owner_submitted_idx
  on public.diagnostic_cases(owner_id, submitted_at desc);

create table if not exists public.case_attachments (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.diagnostic_cases(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  storage_path text not null,
  original_name text not null,
  mime_type text,
  size_bytes bigint,
  category text not null default 'other',
  created_at timestamptz not null default now(),
  unique(case_id, storage_path)
);

create table if not exists public.case_reviews (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.diagnostic_cases(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  review_version integer not null default 1,
  findings jsonb not null default '{}'::jsonb,
  evidence_gaps jsonb not null default '[]'::jsonb,
  candidate_patterns jsonb not null default '[]'::jsonb,
  reviewed_at timestamptz not null default now(),
  unique(case_id, review_version)
);

create table if not exists public.knowledge_entries (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  system text,
  content jsonb not null,
  source_case_ids uuid[] not null default '{}',
  confidence text not null default 'unverified' check (confidence in ('unverified','single_case','corroborated','verified')),
  approved boolean not null default false,
  source_type text check (source_type is null or source_type in ('oem_service_info','oem_bulletin','technician_case','training_reference','inference','other')),
  source_title text,
  source_revision text,
  source_location text,
  source_url text,
  source_checked_at timestamptz,
  verification_notes text,
  verified_at timestamptz,
  reviewed_at timestamptz,
  share_consent boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.diagnostic_cases enable row level security;
alter table public.case_attachments enable row level security;
alter table public.case_reviews enable row level security;
alter table public.knowledge_entries enable row level security;

drop policy if exists "Owner manages own diagnostic cases" on public.diagnostic_cases;
create policy "Owner manages own diagnostic cases" on public.diagnostic_cases
  for all to authenticated using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

drop policy if exists "Owner manages own case attachments" on public.case_attachments;
create policy "Owner manages own case attachments" on public.case_attachments
  for all to authenticated
  using (
    (select auth.uid()) = owner_id
    and exists (
      select 1 from public.diagnostic_cases c
      where c.id = case_attachments.case_id
        and c.owner_id = (select auth.uid())
    )
  )
  with check (
    (select auth.uid()) = owner_id
    and exists (
      select 1 from public.diagnostic_cases c
      where c.id = case_attachments.case_id
        and c.owner_id = (select auth.uid())
    )
  );

drop policy if exists "Owner manages own case reviews" on public.case_reviews;
create policy "Owner manages own case reviews" on public.case_reviews
  for all to authenticated
  using (
    (select auth.uid()) = owner_id
    and exists (
      select 1 from public.diagnostic_cases c
      where c.id = case_reviews.case_id
        and c.owner_id = (select auth.uid())
    )
  )
  with check (
    (select auth.uid()) = owner_id
    and exists (
      select 1 from public.diagnostic_cases c
      where c.id = case_reviews.case_id
        and c.owner_id = (select auth.uid())
    )
  );

drop policy if exists "Owner manages own knowledge entries" on public.knowledge_entries;
create policy "Owner manages own knowledge entries" on public.knowledge_entries
  for all to authenticated using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'ironknuckle-case-files',
  'ironknuckle-case-files',
  false,
  26214400,
  array['image/jpeg','image/png','image/webp','application/pdf','text/plain','application/json']
)
on conflict (id) do update set public = false, file_size_limit = 26214400;

drop policy if exists "Owner uploads own case files" on storage.objects;
create policy "Owner uploads own case files" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'ironknuckle-case-files'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "Owner reads own case files" on storage.objects;
create policy "Owner reads own case files" on storage.objects
  for select to authenticated using (
    bucket_id = 'ironknuckle-case-files'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "Owner deletes own case files" on storage.objects;
create policy "Owner deletes own case files" on storage.objects
  for delete to authenticated using (
    bucket_id = 'ironknuckle-case-files'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

comment on column public.diagnostic_cases.verification_result is
  'Post-repair result. passed requires a documented retest; absence of a reproduced symptom is not automatically a pass.';
comment on column public.knowledge_entries.share_consent is
  'Explicit consent flag for future sharing workflows. Sharing remains disabled until a separate authorization and anonymization path exists.';
