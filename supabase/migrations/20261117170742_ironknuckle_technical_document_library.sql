-- IronKnuckle Technical Library: private document metadata and storage.
-- Each authenticated account can manage only its own records and files.
create table if not exists public.technical_documents (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  category text not null default 'other'
    check (category in ('service_manual','wiring_diagram','technical_bulletin','troubleshooting_guide','specification','training_reference','other')),
  manufacturer text,
  model text,
  model_year text,
  system text,
  source_type text not null default 'oem_service_info'
    check (source_type in ('oem_service_info','oem_bulletin','training_reference','other')),
  source_reference text,
  revision text,
  tags text[] not null default '{}',
  notes text,
  storage_path text not null unique,
  original_name text not null,
  mime_type text not null,
  size_bytes bigint not null check (size_bytes > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists technical_documents_owner_created_idx
  on public.technical_documents(owner_id, created_at desc);
create index if not exists technical_documents_owner_category_idx
  on public.technical_documents(owner_id, category);

alter table public.technical_documents enable row level security;
grant select, insert, update, delete on public.technical_documents to authenticated;

drop policy if exists "Owners manage their technical documents" on public.technical_documents;
create policy "Owners manage their technical documents" on public.technical_documents
  for all to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'ironknuckle-technical-library',
  'ironknuckle-technical-library',
  false,
  52428800,
  array[
    'application/pdf','image/jpeg','image/png','image/webp',
    'text/plain','application/json','text/csv'
  ]
)
on conflict (id) do update set
  public = false,
  file_size_limit = 52428800,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Owners upload technical library files" on storage.objects;
create policy "Owners upload technical library files" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'ironknuckle-technical-library'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "Owners read technical library files" on storage.objects;
create policy "Owners read technical library files" on storage.objects
  for select to authenticated using (
    bucket_id = 'ironknuckle-technical-library'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "Owners delete technical library files" on storage.objects;
create policy "Owners delete technical library files" on storage.objects
  for delete to authenticated using (
    bucket_id = 'ironknuckle-technical-library'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
