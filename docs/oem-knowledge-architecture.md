# OEM Knowledge Architecture and Source-of-Truth Plan

## Goal

Keep one authoritative, reviewable record for each OEM document and prevent the Technical Library, fault catalog, DCC, WiringHound, and OEM Specification Assistant from independently maintaining overlapping procedures.

This is an architecture change, not a request to delete working diagnostic guidance before a replacement is proven.

## Ownership boundaries

| Component | Owns | Must not become |
|---|---|---|
| Technical Library | Original authorized documents, document metadata, extracted text, storage permissions | A second diagnostic workflow engine |
| Bulletin Intelligence | Structured extraction tied to a specific document and revision; page/excerpt provenance; candidate/review status | An automatically trusted OEM instruction source |
| OEM Specification Assistant | Individual measurement/specification records, units, test conditions, location, applicability, source evidence and approval | A duplicate bulletin repository or general procedure store |
| OEM fault catalog | Fault-code identity, manufacturer/controller hints, fault family/group routing, source identifiers | A second copy of complete bulletin procedures |
| DCC | Case context, active faults, evidence, next-step presentation and decision history | A place to hardcode manufacturer procedures that already exist as reviewed bulletin records |
| WiringHound | Electrical test planning, circuit-specific measurements, wiring evidence and electrical decision logic | A separate copy of OEM bulletin storage or generic powertrain procedures |

## Current overlap found in the repository

1. Mack CBR 2107-22 is represented by a hand-authored workflow in `js/oem-fault-guidance.js`.
2. The same nine Mack UQLS yellow fault codes and source/applicability metadata are also listed in `data/oem-fault-catalog.json`. This is acceptable as a routing index only while it does not grow into a second procedure.
3. The Technical Library extracts bulletin content into `bulletin_intelligence` records. These records are currently reviewable but are not consumed by the DCC.
4. The DCC has a separate public-source research panel. Search results are leads, not validated instructions.
5. The OEM Specification Assistant stores individual specification records in `oem_specification_records`; these records are not yet wired into DCC measurement pass/fail logic.

## Source-of-truth rules

- The original OEM document is the ultimate evidence.
- An extracted bulletin is a candidate until a technician explicitly reviews and approves it.
- Approval is scoped to the exact document record and revision. A new revision must create a new review decision; it must not silently inherit approval.
- Every instruction shown in a diagnostic path must retain its source document, revision, page, and excerpt where available.
- A public search result or snippet is never an approved procedure.
- Applicability must be positively established. Unknown model, emissions family, serial range, chassis variant, or explicit exclusion means the bulletin cannot be treated as applicable.
- Conflicts between a bulletin and a manually authored fallback must be surfaced for review, not silently resolved by whichever source loads last.
- Candidate or rejected extractions must never drive diagnostic decisions.
- The DCC may present a reviewed procedure, but the DCC itself must not become the source of OEM technical truth.

## Safe consolidation sequence

### Phase 1 — establish the contract (this change)

Document the ownership boundaries and safety rules. Preserve all current behavior while the original bulletin OCR pipeline is still awaiting end-to-end verification.

### Phase 2 — validate the real document

Upload the actual Mack CBR 2107-22 PDF into the Technical Library. Verify extracted text, OCR where needed, all nine yellow codes, applicability, AN(4)/PR(4) exclusions, the diagnostic sequence, evaluation rules, replacement rules, revision/date, and page references against the original six-page PDF.

Do not mark it approved until the extraction has been checked against the source.

### Phase 3 — add a reviewed-bulletin adapter

Create one shared adapter that accepts only an approved bulletin record and produces a DCC-ready, provenance-carrying workflow. The adapter must enforce document/revision identity, fault-code match, applicability and exclusions. It must fail closed when evidence is missing or ambiguous.

### Phase 4 — migrate Mack CBR 2107-22

Make the approved bulletin record the primary source for the Mack UQLS workflow. Keep the current hand-authored workflow only as a clearly labelled fallback while migration is validated. Add regression tests that compare the generated path with the reviewed CBR sequence and confirm that excluded/unknown variants stop.

### Phase 5 — connect measurement specifications

Let the DCC and WiringHound request approved specification records through a shared lookup interface. Never infer pass/fail when the exact test conditions, units, applicability or source are missing. Do not merge the specification table with bulletin procedures; link the two through document/source identifiers.

### Phase 6 — remove stale duplication

Only after the new path passes regression and technician testing, remove duplicated procedure text and redundant source metadata. Keep the fault catalog as a compact routing index and keep the original document as the evidence source.

## Acceptance criteria

- One authoritative approved record per document revision and owner.
- No candidate or unverified public search result can drive a diagnostic procedure.
- DCC instructions preserve source and page-level provenance.
- Explicit exclusions and unknown applicability stop the workflow.
- Mack UQLS behavior remains correct for all nine yellow codes and does not apply the yellow procedure to green codes.
- Existing manually authored Mack guidance remains available until the approved-record integration is verified.
- No paid AI API is required for extraction, review, routing, or the initial integration.


## Public OEM source collection — initial Mack / Volvo registry

The initial curated source inventory is maintained in `data/public-oem-document-registry.json`. It records manufacturer-hosted manuals, wiring indexes, official training/resource portals and a small number of NHTSA-hosted dealer-bulletin records for discovery.

The registry is **not** a document mirror or a source of approved diagnostic procedures:

- Public OEM body-builder PDFs and wiring pages are indexed as `link-out-only` because the publications reserve reproduction/storage rights.
- Mack and Volvo eMedia/emissions service portals are marked `license-review-required`; an ordinary technician subscription is not proof of commercial SaaS display or redistribution rights.
- NHTSA-hosted dealer bulletins carrying a confidential / limited-distribution marking are recorded as `restricted-no-ingestion`. Public hosting does not remove those restrictions.
- Registry entries are source leads only. They cannot populate DCC steps, specifications or OEM-verified catalog entries without authorized content, exact applicability, review and permission evidence.

### Initial collection priorities

1. Mack current VECU5 electrical section and model/build-specific wiring index.
2. Volvo current VNL electrical section, legacy VECU4 reference and wiring index.
3. Engine and aftertreatment sections for each supported vehicle generation.
4. Transmission / mDRIVE / I-Shift material and authorized service procedures.
5. eMedia access and commercial integration permissions for VIN-specific repair procedures, wiring diagrams, specifications, CBR and TSB content.

Keep original authorized documents in the existing private Technical Library. Use Bulletin Intelligence for page-level extraction and review; use OEM Specification Assistant for individual approved measurements; keep DCC as the presentation/decision layer. Do not create a second document store or a second diagnostic brain.
