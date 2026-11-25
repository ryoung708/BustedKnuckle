-- Store structured, page-cited bulletin extraction separately from raw technical documents.
create table if not exists public.bulletin_intelligence (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.technical_documents(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  extracted_data jsonb not null,
  review_status text not null default 'candidate'
    check (review_status in ('candidate','approved','rejected')),
  reviewer_notes text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint bulletin_intelligence_document_owner_unique unique (document_id, owner_id)
);

create index if not exists bulletin_intelligence_owner_status_idx
  on public.bulletin_intelligence(owner_id, review_status);

alter table public.bulletin_intelligence enable row level security;

drop policy if exists "Owners can read bulletin intelligence" on public.bulletin_intelligence;
create policy "Owners can read bulletin intelligence"
  on public.bulletin_intelligence for select to authenticated
  using (owner_id = (select auth.uid()));

drop policy if exists "Owners can create bulletin intelligence" on public.bulletin_intelligence;
create policy "Owners can create bulletin intelligence"
  on public.bulletin_intelligence for insert to authenticated
  with check (owner_id = (select auth.uid()));

drop policy if exists "Owners can update bulletin intelligence" on public.bulletin_intelligence;
create policy "Owners can update bulletin intelligence"
  on public.bulletin_intelligence for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

drop policy if exists "Owners can delete bulletin intelligence" on public.bulletin_intelligence;
create policy "Owners can delete bulletin intelligence"
  on public.bulletin_intelligence for delete to authenticated
  using (owner_id = (select auth.uid()));

create or replace function public.set_bulletin_intelligence_updated_at()
returns trigger language plpgsql set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_bulletin_intelligence_updated_at on public.bulletin_intelligence;
create trigger set_bulletin_intelligence_updated_at
before update on public.bulletin_intelligence
for each row execute function public.set_bulletin_intelligence_updated_at();
