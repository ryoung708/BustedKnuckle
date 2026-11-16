# IronKnuckle private case vault — setup

This is the internal, owner-first development backend. It is not a public multi-technician release.

## Current data model

- `diagnostic_cases`: owner-private repair/job history, original case payload, complaint, vehicle context, codes, tests, root cause, repair performed and post-repair verification.
- `case_attachments`: private evidence metadata for screenshots, wiring diagrams, harness photos and reports.
- `case_reviews`: versioned findings, evidence gaps and candidate patterns.
- `knowledge_entries`: owner-private curated findings with confidence and source/provenance metadata.
- Private Storage bucket `ironknuckle-case-files` (25 MB per file).

All four application tables have RLS. Child attachment/review policies check both `owner_id` and that the referenced parent diagnostic case belongs to the same authenticated user. Storage paths must begin with that user's UUID. The bucket is private.

## Create or restore a project

1. Create a Supabase project under an account you control.
2. Choose a strong database password and store it in your password manager. Do not send it to ChatGPT or put it in GitHub.
3. For a fresh project, run the current full snapshot in `supabase-schema.sql`.
4. For an existing project, apply the ordered migrations in `supabase/migrations/`; do not rerun the snapshot as a migration.
5. In **Authentication → URL Configuration**, add the deployed IronKnuckle site URL as the Site URL and add the diagnostic page URL as an allowed redirect URL.
6. In **Project Settings → API**, use the Project URL and publishable key in the browser. Never use or share the service-role/secret key.

## Owner-only authentication

- Enable email sign-in for the owner's account.
- Keep public sign-ups disabled after the owner account is created.
- Enable leaked-password protection in Supabase Auth settings.
- RLS remains the actual row-level access control; hiding UI controls is not security.

## Data handling

- Do not upload full VINs, customer names, phone numbers, fleet identifiers, credentials, employer-confidential records or OEM-proprietary material unless authorized to retain and upload them.
- Use VIN last six only when permitted; omit it when uncertain.
- Uploaded files are private and are not publicly addressable.
- Original repair cases remain owner-private. `share_consent` is only a future consent marker; no cross-user sharing workflow is enabled.
- A single case must never silently become a trusted universal diagnostic rule.
- Record repair performed and post-repair verification separately. A repair is not verified merely because a symptom did not recur during an unrelated drive.

## Backups and restore

- Confirm the Supabase plan's scheduled backup/PITR availability and retention.
- Export schema and case data periodically to a separate access-controlled location.
- Back up Storage object bytes separately; database exports do not include file contents.
- Never store real case exports in the public GitHub repository.
- Test restoration into a non-production project and record row/object counts and gaps.

## Public repository / IP warning

The GitHub Pages repository is currently public. All client-side HTML, JavaScript, JSON data and static assets are visible. Minification or obfuscation does not make them private. Do not put trade-secret diagnostic logic, employer/OEM confidential information or customer data in this repository. Decide on a private backend/private repository architecture before protecting valuable proprietary logic. Do not change repository visibility without checking GitHub Pages hosting implications.

## Current limitations

The frontend has not yet been upgraded to use all structured outcome/provenance columns. The new columns are a safe foundation; UI capture and display remain follow-up implementation work. Similar-case search, technician profiles and shared knowledge are not implemented.
