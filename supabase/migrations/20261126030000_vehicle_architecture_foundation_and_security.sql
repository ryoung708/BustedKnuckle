-- IronKnuckle architecture foundation + database privilege hardening.
-- Architecture catalog is curated by trusted backend workflows. Authenticated users
-- can read published records; draft/review/write operations remain server-side.

create table if not exists public.vehicle_manufacturers (
  id uuid primary key default gen_random_uuid(),
  canonical_name text not null unique,
  aliases text[] not null default '{}',
  vehicle_scope text[] not null default '{}',
  created_at timestamptz not null default now(),
  constraint vehicle_manufacturers_name_nonblank check (length(trim(canonical_name)) > 0)
);

create table if not exists public.vehicle_platforms (
  id uuid primary key default gen_random_uuid(),
  manufacturer_id uuid not null references public.vehicle_manufacturers(id) on delete restrict,
  platform_code text not null,
  platform_name text not null,
  vehicle_class text not null default 'heavy-duty',
  model_year_start integer,
  model_year_end integer,
  generation text,
  status text not null default 'draft' check (status in ('draft','reviewed','published','retired')),
  applicability jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (manufacturer_id, platform_code, generation),
  check (model_year_start is null or model_year_start between 1900 and 2200),
  check (model_year_end is null or model_year_end between 1900 and 2200),
  check (model_year_start is null or model_year_end is null or model_year_end >= model_year_start)
);

create table if not exists public.vehicle_configurations (
  id uuid primary key default gen_random_uuid(),
  platform_id uuid not null references public.vehicle_platforms(id) on delete restrict,
  model_name text not null,
  model_year integer not null,
  vin_prefix text,
  build_code text,
  engine_manufacturer text,
  engine_model text,
  engine_serial_range text,
  transmission_manufacturer text,
  transmission_model text,
  emissions_family text,
  options jsonb not null default '{}'::jsonb,
  applicability_notes text,
  status text not null default 'draft' check (status in ('draft','reviewed','published','retired')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (model_year between 1900 and 2200)
);

create table if not exists public.electrical_architectures (
  id uuid primary key default gen_random_uuid(),
  configuration_id uuid not null references public.vehicle_configurations(id) on delete restrict,
  architecture_name text not null,
  revision text not null,
  effective_from date,
  effective_to date,
  source_confidence text not null default 'unverified'
    check (source_confidence in ('unverified','documented','cross_referenced','technician_verified','diagnostic_validated')),
  status text not null default 'draft' check (status in ('draft','reviewed','published','retired')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (configuration_id, revision),
  check (effective_to is null or effective_from is null or effective_to >= effective_from)
);

create table if not exists public.architecture_sources (
  id uuid primary key default gen_random_uuid(),
  architecture_id uuid not null references public.electrical_architectures(id) on delete cascade,
  source_type text not null check (source_type in ('oem_service_info','oem_wiring_diagram','oem_bulletin','component_manufacturer','standard','technician_observation','other')),
  source_title text not null,
  publisher text,
  revision text,
  publication_date date,
  page_reference text,
  source_url text,
  status text not null default 'draft' check (status in ('draft','reviewed','published','retired')),
  rights_status text not null default 'review_required'
    check (rights_status in ('licensed','public_reference','link_out_only','user_authorized','review_required','prohibited')),
  validation_level text not null default 'unverified'
    check (validation_level in ('unverified','documented','cross_referenced','technician_verified','diagnostic_validated')),
  checked_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  check (source_url is null or source_url ~* '^https://')
);

create table if not exists public.architecture_controllers (
  id uuid primary key default gen_random_uuid(),
  architecture_id uuid not null references public.electrical_architectures(id) on delete cascade,
  status text not null default 'draft' check (status in ('draft','reviewed','published','retired')),
  controller_code text not null,
  controller_name text not null,
  manufacturer text,
  function_description text,
  physical_location text,
  connector_notes text,
  source_id uuid references public.architecture_sources(id) on delete set null,
  validation_level text not null default 'unverified'
    check (validation_level in ('unverified','documented','cross_referenced','technician_verified','diagnostic_validated')),
  applicability jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (architecture_id, controller_code)
);

create table if not exists public.architecture_network_segments (
  id uuid primary key default gen_random_uuid(),
  architecture_id uuid not null references public.electrical_architectures(id) on delete cascade,
  status text not null default 'draft' check (status in ('draft','reviewed','published','retired')),
  network_name text not null,
  protocol text not null,
  data_rate text,
  topology text,
  termination_details text,
  gateway_controller_id uuid references public.architecture_controllers(id) on delete set null,
  source_id uuid references public.architecture_sources(id) on delete set null,
  validation_level text not null default 'unverified'
    check (validation_level in ('unverified','documented','cross_referenced','technician_verified','diagnostic_validated')),
  notes text,
  created_at timestamptz not null default now(),
  unique (architecture_id, network_name)
);

create table if not exists public.architecture_controller_connections (
  id uuid primary key default gen_random_uuid(),
  architecture_id uuid not null references public.electrical_architectures(id) on delete cascade,
  status text not null default 'draft' check (status in ('draft','reviewed','published','retired')),
  network_segment_id uuid not null references public.architecture_network_segments(id) on delete cascade,
  controller_id uuid not null references public.architecture_controllers(id) on delete cascade,
  connection_role text,
  connector_reference text,
  source_id uuid references public.architecture_sources(id) on delete set null,
  validation_level text not null default 'unverified'
    check (validation_level in ('unverified','documented','cross_referenced','technician_verified','diagnostic_validated')),
  unique (network_segment_id, controller_id)
);

create table if not exists public.architecture_power_distributions (
  id uuid primary key default gen_random_uuid(),
  architecture_id uuid not null references public.electrical_architectures(id) on delete cascade,
  status text not null default 'draft' check (status in ('draft','reviewed','published','retired')),
  distribution_name text not null,
  distribution_type text not null check (distribution_type in ('battery','fuse_box','relay_center','power_feed','ground_point','splice','other')),
  voltage_system text,
  physical_location text,
  upstream_reference text,
  fuse_or_relay_details text,
  affected_controller_id uuid references public.architecture_controllers(id) on delete set null,
  source_id uuid references public.architecture_sources(id) on delete set null,
  validation_level text not null default 'unverified'
    check (validation_level in ('unverified','documented','cross_referenced','technician_verified','diagnostic_validated')),
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.architecture_connectors (
  id uuid primary key default gen_random_uuid(),
  architecture_id uuid not null references public.electrical_architectures(id) on delete cascade,
  controller_id uuid references public.architecture_controllers(id) on delete cascade,
  status text not null default 'draft' check (status in ('draft','reviewed','published','retired')),
  connector_designation text not null,
  connector_location text,
  pin_count integer,
  circuit_reference text,
  pin_assignments jsonb not null default '[]'::jsonb,
  source_id uuid references public.architecture_sources(id) on delete set null,
  validation_level text not null default 'unverified'
    check (validation_level in ('unverified','documented','cross_referenced','technician_verified','diagnostic_validated')),
  notes text,
  created_at timestamptz not null default now(),
  check (pin_count is null or pin_count > 0),
  check (jsonb_typeof(pin_assignments) = 'array')
);

create index if not exists vehicle_platforms_manufacturer_year_idx
  on public.vehicle_platforms(manufacturer_id, model_year_start, model_year_end);
create index if not exists vehicle_configurations_platform_year_idx
  on public.vehicle_configurations(platform_id, model_year, model_name);
create index if not exists electrical_architectures_configuration_status_idx
  on public.electrical_architectures(configuration_id, status);
create index if not exists architecture_sources_architecture_idx
  on public.architecture_sources(architecture_id, validation_level);
create index if not exists architecture_controllers_architecture_idx
  on public.architecture_controllers(architecture_id, controller_code);
create index if not exists architecture_network_segments_architecture_idx
  on public.architecture_network_segments(architecture_id, protocol);
create index if not exists architecture_controller_connections_network_idx
  on public.architecture_controller_connections(network_segment_id, controller_id);
create index if not exists architecture_power_distributions_architecture_idx
  on public.architecture_power_distributions(architecture_id, distribution_type);
create index if not exists architecture_connectors_architecture_idx
  on public.architecture_connectors(architecture_id, connector_designation);

-- Published architecture is readable by signed-in users. No client-side write
-- policies are created: trusted backend ingestion/review must control publication.
do $$
declare t text;
begin
  foreach t in array array[
    'vehicle_manufacturers','vehicle_platforms','vehicle_configurations',
    'electrical_architectures','architecture_sources','architecture_controllers',
    'architecture_network_segments','architecture_controller_connections',
    'architecture_power_distributions','architecture_connectors'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "Authenticated users read published architecture" on public.%I', t);
    if t = 'vehicle_manufacturers' then
      execute format('create policy "Authenticated users read published architecture" on public.%I for select to authenticated using (true)', t);
    else
      execute format('create policy "Authenticated users read published architecture" on public.%I for select to authenticated using (status = ''published'')', t);
    end if;
    execute format('revoke all on public.%I from anon, authenticated', t);
    execute format('grant select on public.%I to authenticated', t);
    execute format('grant all on public.%I to service_role', t);
  end loop;
end $$;

-- The trigger itself remains attached to diagnostic_cases. Trigger execution does
-- not require client EXECUTE grants; remove the unnecessary public RPC surface.
create or replace function public.sync_case_fault_records()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  item jsonb;
  code_value text;
  controller_value text;
  fmi_value text;
  confidence_value text;
begin
  delete from public.diagnostic_fault_records where case_id = new.id;
  if jsonb_typeof(coalesce(new.fault_codes, '[]'::jsonb)) = 'array' then
    for item in select value from jsonb_array_elements(coalesce(new.fault_codes, '[]'::jsonb))
    loop
      code_value := coalesce(item->>'code', item->>'faultCode', item->>'spn', 'UNKNOWN');
      controller_value := nullif(coalesce(item->>'controller', item->>'module', ''), '');
      fmi_value := nullif(coalesce(item->>'fmi', ''), '');
      confidence_value := case
        when item->>'confidence' in ('corroborated','verified') then item->>'confidence'
        else 'single_case'
      end;
      insert into public.diagnostic_fault_records (
        case_id, owner_id, code, normalized_code, fmi, controller,
        fault_signature, description, report_status, occurrence_count, source_page,
        source_type, confidence, approved, raw_record
      ) values (
        new.id, new.owner_id, code_value,
        upper(regexp_replace(code_value, '[^A-Za-z0-9]', '', 'g')),
        fmi_value, controller_value,
        upper(regexp_replace(code_value, '[^A-Za-z0-9]', '', 'g')) || '|' ||
          coalesce(fmi_value,'') || '|' || coalesce(controller_value,''),
        coalesce(item->>'description', item->>'meaning'),
        coalesce(item->>'report_status', item->>'status', 'unknown'),
        nullif(coalesce(item->>'count', item->>'occurrence_count', ''), '')::integer,
        nullif(coalesce(item->>'source_page', ''), '')::integer,
        coalesce(item->>'source_type', 'technician_case'),
        confidence_value,
        coalesce((item->>'approved')::boolean, false),
        item
      );
    end loop;
  end if;
  return new;
end;
$function$;

revoke all on function public.sync_case_fault_records() from public, anon, authenticated;
grant execute on function public.sync_case_fault_records() to service_role;

-- Keep trigger function search path pinned and schema references explicit.
create or replace function public.enforce_oem_specification_approval()
returns trigger
language plpgsql
set search_path = ''
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
  new.updated_at = pg_catalog.now();
  return new;
end;
$$;
