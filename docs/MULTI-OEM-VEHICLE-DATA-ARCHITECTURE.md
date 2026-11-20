# IronKnuckle Multi-OEM Vehicle and Specification Architecture

## Purpose

IronKnuckle uses one shared diagnostic engine with manufacturer-, vehicle-, engine- and source-specific data adapters. Adding a truck make must not require duplicating diagnostic decision logic.

## Identity model

Every case should progressively capture:

- Truck make, model, model year and VIN when available.
- Engine manufacturer and engine model as separate fields from truck make/model.
- Transmission manufacturer and model.
- Emissions family/configuration.
- Relevant configuration details and the source used to verify them.

A truck badge is not a reliable substitute for engine identity. A Cummins-powered Freightliner and a Detroit-powered Freightliner share a truck make but do not share every engine-specific specification or procedure.

## Initial platform roadmap

1. Mack / Volvo — existing development experience; no commercial OEM content is implied by this registry.
2. Freightliner / Western Star — first additional heavy-duty truck platform.
3. Kenworth / Peterbilt — include PACCAR and non-PACCAR engine identity.
4. International — include medium- and heavy-duty variants.
5. Isuzu / Hino — medium-duty expansion.

Engine families are independently registered. Initial identity mappings include Detroit DD13/DD15/DD16, Cummins X12/X15, PACCAR MX-11/MX-13 and International A26. These are identity mappings only, not a claim that every listed engine is available in every model/year/configuration.

## Specification provenance and permission gate

Every specification record must carry:

- Stable record ID and specification type.
- Exact vehicle/engine applicability.
- Value, unit, allowable range and test conditions.
- Source name, publication identifier and revision/effective date.
- Retrieval/verification date.
- Permission state and evidence of commercial display rights.
- Reviewer and approval state.

Supported source states:

- `licensed`: may display only when the commercial permission flag is explicitly confirmed and source/applicability metadata is complete.
- `independently-verified`: may display only after documented legal/content review approval and complete provenance.
- `link-out-only`: do not copy/display the value; direct the technician to the authorized source.
- `unverified` / `not-available`: do not display as an OEM specification.

No OEM specifications, service-manual text, diagrams or proprietary procedures are bundled in the initial registry. The software gate is a conservative product safeguard, not a legal opinion or substitute for reviewing the actual license.

## Diagnostic integration

1. Resolve vehicle identity before requesting a vehicle-specific specification.
2. Resolve engine family independently from truck make.
3. Query a source adapter using the exact applicability tuple.
4. Apply the permission gate before rendering a value.
5. If no authorized value is available, show an explicit verification-required/link-out state. Never invent a limit or silently substitute another engine's data.
6. Preserve the source revision and conditions with the technician's recorded measurement and case history.

## First expansion target

Freightliner / Western Star is the first additional truck-manufacturer platform. Detroit Diesel is registered as a separate engine family, while Cummins remains independently selectable. This provides the architecture to handle different powertrains in the same truck brand without conflating truck OEM and engine OEM data.

## Out of scope for this foundation

- No claim of official OEM partnership or data licensing.
- No OEM specification values or copied repair information.
- No VIN decoding service.
- No automated source scraping or reuse of employer credentials.
- No assertion that registry mappings cover every model year or build configuration.
