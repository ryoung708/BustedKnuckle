# IronKnuckle diagnostic knowledge quality and case lifecycle

## Principle

IronKnuckle must preserve the difference between a technician's observation, a plausible diagnostic hypothesis, a repair that was attempted, and a repair that was verified. A case is evidence, not automatically a universal rule.

## Required case lifecycle

1. **Draft:** incomplete work in progress.
2. **Submitted:** the technician has captured the complaint, tests and available evidence.
3. **In review:** the technician or a later workflow is organizing findings and identifying evidence gaps.
4. **Reviewed:** findings have been checked for internal consistency; this does not automatically mean the repair is verified.
5. **Archived:** retained for the owner's history and future retrieval.

Keep the original submitted payload immutable in spirit. Corrections and review notes should be additive or versioned, not silently overwrite the original observation.

## Required repair outcome fields

Capture these as structured fields when the UI is ready:
- confirmed_root_cause (nullable until established)
- repair_performed
- parts_or_components_changed (optional; avoid implying replacement if repaired)
- repair_date
- post_repair_test_conditions
- post_repair_measurements
- verification_result: not_run | passed | failed | inconclusive
- verification_notes
- verified_at
- technician_confidence
- source_case_id(s) for any derived knowledge

A successful verification must repeat the condition that originally produced the complaint when safe and practical. If the symptom cannot be reproduced, record that limitation instead of marking the repair verified.

## Claim-level provenance

Every technical recommendation or library claim should carry:
- claim_id and affected system/component;
- claim text and applicability constraints (make/model/year/engine/transmission/serial range);
- evidence type: OEM service information, OEM bulletin, measured case, training reference, or inference;
- source title, publisher, document/revision/date and page/section where permitted;
- source URL only when public and stable;
- source_checked_at;
- confidence/trust state;
- reviewer and review date;
- limitations and known counterexamples.

A source reference is not proof that a specific claim is supported. The cited page/section must support the claim and its applicability. Never publish employer-confidential service portal content or proprietary documents. Record only authorized factual findings and provenance.

## Knowledge promotion rules

- Single case without a verified repair: unverified/observed.
- Repair reported but no post-repair test: repair-reported, not verified.
- Repeatable post-repair test documented: verified for that case.
- Independent matching cases or authoritative applicable source: corroborated, with the evidence listed.
- Conflicting cases: preserve the conflict and applicability boundaries; do not average away the disagreement.

Search results should display trust state, make/model applicability, evidence count, and why the case matched. Do not present a nearest-neighbor result as a confirmed fix.

## Privacy and ownership

- Original case, attachments and job history are private to the technician owner by default.
- Shared knowledge requires a separate, explicit opt-in action.
- Before sharing, remove direct identifiers and review free-text notes and images for VINs, customer names, fleet IDs, plates, geolocation, work orders, employer data and credentials.
- Keep source case IDs and ownership boundaries server-side. A shared record must not expose another technician's private case or attachments.
- RLS must check both the row owner and parent-case ownership for child records.
- Browser clients use only publishable keys. Service-role/secret keys stay server-side and out of Git history.

## Current implementation boundary

The current private vault already has diagnostic_cases, case_attachments, case_reviews and knowledge_entries. The live Supabase policies additionally verify that attachment/review parent cases belong to the authenticated owner. The checked-in schema snapshot is being aligned to that live policy behavior.

The current frontend does not yet implement the complete structured repair outcome form, claim-level provenance workflow, owner job-history screen or cross-case similarity engine. Those are planned follow-on features, not completed capabilities.
