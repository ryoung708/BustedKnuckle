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


create or replace function public.enforce_oem_specification_approval()
returns trigger
language plpgsql
as $$
declare linked_source_type text;
begin
  if new.status = 'approved' then
    if nullif(trim(new.source_title),'') is null
       or nullif(trim(new.source_excerpt),'') is null
       or nullif(trim(new.test_conditions),'') is null
       or new.reviewed_at is null then
      raise exception 'Approved specifications require a source title, exact source evidence, test conditions, and review timestamp';
    end if;
    if new.source_type = 'oem_public' then
      if new.source_url is null or new.source_url !~* '^https://' then
        raise exception 'Approved public OEM specifications require an HTTPS source URL';
      end if;
    elsif new.source_type = 'technical_library' then
      if new.source_document_id is null then
        raise exception 'Approved Technical Library specifications require a linked document';
      end if;
      select d.source_type into linked_source_type
      from public.technical_documents d
      where d.id = new.source_document_id and d.owner_id = new.owner_id;
      if linked_source_type is null or linked_source_type not in ('oem_service_info','oem_bulletin') then
        raise exception 'Approved Technical Library specifications require an owned OEM service-information or OEM bulletin document';
      end if;
    else
      raise exception 'Only OEM public sources or OEM-classified Technical Library documents can be approved';
    end if;
  end if;
  new.updated_at = now();
  return new;
end;
$$;
drop trigger if exists trg_enforce_oem_specification_approval on public.oem_specification_records;
create trigger trg_enforce_oem_specification_approval
before insert or update on public.oem_specification_records
for each row execute function public.enforce_oem_specification_approval();
