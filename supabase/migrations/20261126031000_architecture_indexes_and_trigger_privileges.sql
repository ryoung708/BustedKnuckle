-- Complete FK indexes and close unnecessary trigger-function EXECUTE grants.
create index if not exists architecture_connectors_controller_idx on public.architecture_connectors(controller_id);
create index if not exists architecture_connectors_source_idx on public.architecture_connectors(source_id);
create index if not exists architecture_controller_connections_architecture_idx on public.architecture_controller_connections(architecture_id);
create index if not exists architecture_controller_connections_controller_idx on public.architecture_controller_connections(controller_id);
create index if not exists architecture_controller_connections_source_idx on public.architecture_controller_connections(source_id);
create index if not exists architecture_controllers_source_idx on public.architecture_controllers(source_id);
create index if not exists architecture_network_segments_gateway_controller_idx on public.architecture_network_segments(gateway_controller_id);
create index if not exists architecture_network_segments_source_idx on public.architecture_network_segments(source_id);
create index if not exists architecture_power_distributions_controller_idx on public.architecture_power_distributions(affected_controller_id);
create index if not exists architecture_power_distributions_source_idx on public.architecture_power_distributions(source_id);
create index if not exists oem_specification_records_source_document_idx on public.oem_specification_records(source_document_id);

drop policy if exists "Owners can insert their diagnostic fault records" on public.diagnostic_fault_records;
create policy "Owners can insert their diagnostic fault records"
  on public.diagnostic_fault_records for insert to authenticated
  with check (
    (select auth.uid()) = owner_id
    and exists (
      select 1 from public.diagnostic_cases c
      where c.id = diagnostic_fault_records.case_id
        and c.owner_id = (select auth.uid())
    )
  );

drop policy if exists "Owners can read their diagnostic fault records" on public.diagnostic_fault_records;
create policy "Owners can read their diagnostic fault records"
  on public.diagnostic_fault_records for select to authenticated
  using ((select auth.uid()) = owner_id);

drop policy if exists "Owners can update their diagnostic fault records" on public.diagnostic_fault_records;
create policy "Owners can update their diagnostic fault records"
  on public.diagnostic_fault_records for update to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

revoke all on function public.enforce_oem_specification_approval() from public, anon, authenticated;
