# Supabase migration history reconciliation

Audit date: 2026-11-26
Project: `wpxvaqmzxhxlrutklypm`

## Observed drift

The live migration ledger contains these versions that are absent from the repository migration directory:

| Live version | Live migration name | Repository state |
|---|---|---|
| 20261103010107 | ironknuckle_private_case_vault | SQL migration file missing |
| 20261103010129 | ironknuckle_rls_and_index_hardening | SQL migration file missing |

Two repository files have timestamps that differ from the corresponding live ledger entries:

| Live version | Live migration name | Repository filename |
|---|---|---|
| 20261117172810 | technical_library_pdf_text_extraction | 20261117183000_technical_library_pdf_text_extraction.sql |
| 20261118173352 | create_ironknuckle_case_shares | 20261118173500_create_ironknuckle_case_shares.sql |

The repository contains `202611230001_oem_specification_records.sql`, but the live migration ledger does not list an OEM-specification migration even though the table, trigger and policies exist in the live schema. This indicates schema state that is not represented by the migration ledger.

## Why this is not auto-repaired here

The two missing baseline migration files cannot safely be replaced with guessed/no-op SQL: they create core private-case and RLS behavior. Renaming ledger versions or marking guessed files as applied would make a fresh environment appear reproducible when it is not.

The safe resolution is to recover the exact original SQL for the two baseline migrations, verify the two timestamp-only differences against their live SQL, and determine how the OEM specification schema was applied. Only then should the ledger and filenames be reconciled with Supabase CLI migration repair in a controlled maintenance window.

## Current work

The new architecture/security migration is additive and uses a new version after the current ledger. It does not rewrite historical migration entries. This preserves production state while documenting the exact outstanding drift.
