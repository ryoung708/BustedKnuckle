create table if not exists public.ironknuckle_case_shares (
  token_hash text primary key,
  case_id uuid not null references public.diagnostic_cases(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists ironknuckle_case_shares_expires_at_idx on public.ironknuckle_case_shares (expires_at);
create index if not exists ironknuckle_case_shares_case_id_idx on public.ironknuckle_case_shares (case_id);
create index if not exists ironknuckle_case_shares_owner_id_idx on public.ironknuckle_case_shares (owner_id);

alter table public.ironknuckle_case_shares enable row level security;
revoke all on table public.ironknuckle_case_shares from anon, authenticated;
grant all on table public.ironknuckle_case_shares to service_role;
