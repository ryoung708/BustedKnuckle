# IronKnuckle security, backup and intellectual-property runbook

**Use:** internal development only. This is an operational checklist, not a claim that all controls are currently enabled.

## Repository and source protection

Current repository: public GitHub repository with GitHub Pages enabled. Public repositories expose source, data files, history and static assets. Minification, obfuscation and moving JavaScript between files do not protect intellectual property.

Before putting valuable proprietary diagnostic logic or licensed content in this repository:
- Decide whether to keep the public Pages site as a presentation shell and move private engine/data into a private repository or server-side service.
- Check GitHub Pages plan/visibility constraints before changing repository visibility; do not flip this repository private without confirming the site hosting impact.
- Keep OEM/employer-confidential material, licensed service documents, credentials and customer records out of the public repository and all commit history.
- Keep a clean backup/export of the current source before major refactors.
- Use feature branches and pull requests; preserve the known-good main branch.
- Enable branch protection/rules for main with required CI checks, no force pushes and no direct pushes where supported.
- Review dependencies and third-party scripts before adding them.

## Supabase controls

- Frontend may contain the Supabase project URL and publishable key. Never expose service_role or secret keys.
- RLS must be enabled on every exposed table.
- Case rows are owner-only. Child attachments and reviews must additionally prove the parent case belongs to the same authenticated owner.
- Storage bucket remains private; paths are scoped to auth.uid().
- Use explicit opt-in and server-side authorization before any future sharing.
- Enable leaked-password protection in Supabase Auth settings.
- Keep sign-up restricted during the owner-only phase; do not enable public registration as a shortcut.
- Re-run Supabase security, performance and health advisors after schema/policy changes.
- Never treat frontend hiding as access control.

## Backup and restore

A database with RLS is not a backup. Establish:
1. Scheduled database backups/PITR appropriate to the Supabase plan and retention needs.
2. A periodic logical export of schema and user-owned case data to a separate, access-controlled location.
3. A separate Storage object backup; database exports do not contain uploaded file bytes.
4. Encrypted backup storage with access limited to the owner.
5. A documented restore test on a non-production project before relying on the backup.
6. A short restore log: date, source backup, restored table/object counts, test result and gaps.

Do not put exports containing real case data into the public GitHub repository. Redact customer, fleet, vehicle and employer identifiers before sharing any test data.

## Current observed state (2026-11-16)

- GitHub repository is public; main branch protection is disabled.
- Main currently has regression, fault-data validation and Pages workflows, but branch protection does not require them.
- Supabase project is active and healthy.
- Four public application tables have RLS enabled.
- Attachment and review policies check both owner_id and parent diagnostic_cases ownership.
- Storage bucket is private and object policies restrict paths to the authenticated user's UUID.
- Supabase security advisor reports leaked-password protection disabled.
- No health or performance advisor findings were returned.
- The current schema snapshot in backend/supabase-schema.sql did not include the live parent-case checks; align it before using it to recreate a project.
- Backup schedule, PITR entitlement and a successful restore drill have not been verified.

## Do not do without an explicit separate decision

- Do not change repository visibility until the GitHub Pages hosting implications and private-code architecture are agreed.
- Do not upload employer/OEM confidential information or full customer-identifying repair files.
- Do not enable multi-user signup or shared case search until isolation and consent flows are tested.
- Do not make a live schema change without a versioned migration, a backup, a rollback plan and post-change verification.
