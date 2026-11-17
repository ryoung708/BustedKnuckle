alter table public.technical_documents
  add column if not exists extracted_text text,
  add column if not exists extraction_status text not null default 'pending'
    check (extraction_status in ('pending','extracted','unsupported','failed')),
  add column if not exists extraction_page_count integer,
  add column if not exists extracted_at timestamptz,
  add column if not exists extraction_error text;

create index if not exists technical_documents_owner_extraction_idx
  on public.technical_documents(owner_id, extraction_status);
