-- Owner-scoped OEM specification records. Candidates are excluded from diagnostic decisions until reviewed.
create table if not exists public.oem_specification_records (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
 status text not null default 'candidate' check (status in ('candidate','reviewed','approved','rejected')),
 manufacturer text not null, vehicle_model text, model_year text, engine_family text, engine_serial_range text,
 system text not null, component text, measurement_name text not null,
 minimum_value numeric, maximum_value numeric, nominal_value numeric, value_text text, unit text,
 test_conditions text, test_location text, applicability jsonb not null default '{}'::jsonb,
 source_type text not null check (source_type in ('oem_public','technical_library','technician_reference','other')),
 source_title text, source_url text, source_document_id uuid references public.technical_documents(id) on delete set null,
 source_reference text, source_revision text, source_page text, source_excerpt text, review_notes text,
 reviewed_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 constraint oem_specification_value_present check (minimum_value is not null or maximum_value is not null or nominal_value is not null or nullif(trim(value_text),'') is not null)
);
create index if not exists oem_spec_records_owner_created_idx on public.oem_specification_records(owner_id, created_at desc);
create index if not exists oem_spec_records_lookup_idx on public.oem_specification_records(manufacturer, system, measurement_name);
alter table public.oem_specification_records enable row level security;
drop policy if exists "Owners manage own OEM specification records" on public.oem_specification_records;
create policy "Owners manage own OEM specification records" on public.oem_specification_records for all to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
grant select, insert, update, delete on public.oem_specification_records to authenticated;
