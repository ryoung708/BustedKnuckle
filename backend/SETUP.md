# IronKnuckle private case vault — setup

This is the first backend foundation for the single-user development phase.

## What it creates
- `diagnostic_cases`: immutable-style original case payloads and submission status.
- `case_attachments`: metadata for fault screenshots, wiring diagrams, harness photos and reports.
- `case_reviews`: separate review output, evidence gaps and candidate patterns.
- `knowledge_entries`: curated findings with explicit confidence and approval state.
- Private Storage bucket `ironknuckle-case-files` (25 MB per file).

All four tables have row-level security. An authenticated user can access only rows whose `owner_id` matches their Supabase Auth user ID. Storage paths must begin with that user's UUID. The bucket is private.

## Create the Supabase project
1. Create a project in Supabase under an account you control.
2. Choose a strong database password and store it in your password manager. Do not send it to ChatGPT or put it in GitHub.
3. In **SQL Editor**, run the complete contents of `supabase-schema.sql`.
4. In **Authentication → URL Configuration**, add the deployed IronKnuckle site URL as the Site URL and add the diagnostic page URL as an allowed redirect URL.
5. In **Project Settings → API**, copy the Project URL and the publishable/anon key. These are intended for browser use; never use or share the service-role/secret key.

## Before the browser uploader is enabled
Send only the **Project URL** and **publishable (anon) key** in this chat, or enter them into a local configuration file when instructed. Never send the database password or service-role/secret key.

The frontend will use Supabase Auth. Enable email sign-in and create your own account. Keep public sign-ups disabled after your account is created if the project settings allow it; access is still enforced by RLS.

## Data handling
- Do not upload full VINs, customer names, phone numbers, fleet identifiers, employer-confidential records, credentials, or OEM-proprietary material unless you are authorized to retain and upload them.
- Use VIN last six only when permitted; omit it when uncertain.
- Uploaded files are private and are not publicly addressable.
- Keep exporting periodic JSON backups. A cloud database is not a substitute for backups.
- Raw submitted cases are separate from reviews and approved knowledge. A single case must never silently become a trusted universal diagnostic rule.

## Current limitation
This commit establishes the secure database and storage structure only. It does not yet connect the public GitHub Pages frontend. The uploader and cross-device case browser are the next implementation step after the project URL and browser-safe key are available.
