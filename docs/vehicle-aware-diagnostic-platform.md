# Vehicle-Aware Diagnostic Platform

## Product rule

IronKnuckle is one vehicle-aware diagnostic platform with two specialist workspaces. DCC owns the active investigation and powertrain workflow presentation. WiringHound owns electrical test planning and circuit/network evidence. Both use the same vehicle identity, case envelope, diagnostic brain, source records, and verified-case retrieval rules.

A truck make/model badge alone is never enough to establish an OEM procedure, wiring layout, connector pinout, calibration, or specification.

## Shared vehicle context

The canonical contract lives in `js/vehicle-context.js` and is included in the additive `caseEnvelope.vehicleContext` object. It normalizes:

- Truck make, model, model year and last-six VIN fragment (never the full VIN in the shared envelope).
- Engine manufacturer and engine model independently of truck make.
- Transmission manufacturer/model and emissions family.
- Registry platform and engine-family identity mappings.
- Missing identity fields, warnings and an explicit applicability state.

Identity mapping is not technical applicability. Every newly saved cloud case stores this context in both `raw_case.caseEnvelope.vehicleContext` and the existing `diagnostic_cases.vehicle_context` column. Older records are not rewritten in bulk; they acquire the canonical context when next saved.

## Source-of-truth boundaries

| Capability | Single owner |
|---|---|
| Vehicle identity and family mapping | Vehicle Platform Registry + Vehicle Context |
| Original authorized documents | Technical Library |
| Bulletin extraction and review state | Bulletin Intelligence |
| Measurement/specification records | OEM Specification Assistant |
| Active fault and complaint routing | DCC / shared fault routing |
| Powertrain investigation presentation | DCC |
| Electrical measurements and decision branches | WiringHound |
| Cross-system reasoning and evidence quality | Diagnostic Brain |
| Similar-case retrieval | Diagnostic Similar Cases |
| Verified repair knowledge | Knowledge Entries / reviewed cases |

Do not copy full procedures into the fault catalog, DCC, WiringHound, or the architecture registry when an approved source record already owns that information. Fault catalogs remain routing indexes. Public search hits and unreviewed bulletin extractions remain leads, not instructions.

## Similar-case retrieval

DCC and WiringHound must call the same `findSimilarDiagnosticCases` engine. Matching considers fault identity (including FMI/controller when recorded), symptom terms, make/model/year, engine manufacturer/model, transmission and emissions context. Exact fault-code matches across different platforms may still be shown as leads, but must be labelled cross-vehicle and never treated as transferable repair instructions.

Only technician-verified cases with recorded outcomes may be promoted as verified references in the Diagnostic Brain.

## Architecture data policy

The vehicle architecture tables hold reviewed, versioned, source-backed records. They are not a second vehicle registry and do not replace the Technical Library. Each controller, network, power/ground, connection and connector/pin assignment must point to its source and exact applicability. Unknown or unverified architecture remains unavailable to diagnostic decisions.

At this milestone, the architecture tables are deployed but empty. The lookup UI is connected to DCC and WiringHound, but no Mack/Volvo architecture record is yet approved for publication.

## Current known integration gaps

1. Bulletin Intelligence extractions are reviewable but are not yet consumed by DCC as approved, provenance-carrying workflows.
2. OEM Specification Assistant records are not yet connected to DCC/WiringHound measurement pass/fail decisions.
3. Vehicle architecture data has not yet been ingested or published.
4. Legacy cloud cases have empty `vehicle_context` fields until they are saved again; no bulk backfill has been run.
5. The existing platform registry is an identity map, not a complete list of every model year, chassis generation or powertrain combination.

## Delivery order

1. Establish and persist the shared vehicle context (completed in this milestone).
2. Unify similar-case retrieval across DCC and WiringHound (completed in this milestone).
3. Build the reviewed Mack/Volvo architecture and source-ingestion workflow; publish only records supported by authorized, exact-applicability evidence.
4. Connect approved architecture to DCC and WiringHound test planning without duplicating either decision engine.
5. Connect approved bulletin records to fault routing through a shared adapter; preserve document revision, pages, exclusions and approval.
6. Connect approved OEM specification records to measurement interpretation with units, test conditions, exact applicability and source provenance.
7. Expand to Detroit/Freightliner, PACCAR/Kenworth/Peterbilt, International, Isuzu/Hino and component manufacturers through data adapters—not duplicated diagnostic logic.
8. Audit and retire duplicate logic only after regression and technician validation proves the replacement is equivalent or better.
