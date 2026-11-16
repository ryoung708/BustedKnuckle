# IronKnuckle technical content and model-specific learning standard

## Product direction
IronKnuckle is an evidence-led diagnostic and technical learning platform. It must distinguish a general concept, a simulated training model, a model-specific visual target, and an OEM-verified service reference.

## Content states
- **Conceptual:** teaches principles; not a service procedure.
- **Simulation:** behavior is calculated from an educational model, not a complete physical/electrical vehicle model.
- **Family concept:** represents a product family; exact model/serial applicability is not established.
- **Visual blockout:** geometry is under construction; not dimensional or service accurate.
- **Model-specific training context:** application/year/variant selected, but individual details still require validation.
- **OEM-verified:** only allowed when an authorized, traceable source and exact applicability are recorded and reviewed.

No page may imply OEM verification without source metadata and review.

## Model-specific learning requirements
Every model-specific lesson must record:
1. OEM and model family.
2. Model year or year range.
3. Engine/transmission designation and variant.
4. Serial-number/configuration caveats.
5. System diagram and named components.
6. What is known versus conceptual.
7. Technical source, revision/date and reviewer.
8. Open validation items.

For the 2022 Mack mDRIVE HD 13-speed project, preserve the current 3D work but label it a visual blockout until housing, shafts, geartrain, ratios, lubrication and service details are independently validated. Do not invent ratios, dimensions or internal arrangements to make the model look complete.

For Eaton Fuller 18-speed learning, keep the family-level lesson separate from the Mack mDRIVE. Do not reuse the generic AMT cutaway as if it were an Eaton Fuller-specific assembly.

## Diagnostic recommendation rules
- Never use unsupported "critical fix", "always replace", "service alert" or similar language.
- A suspected cause is not a confirmed cause.
- Recommendations must request measurements and vehicle configuration before component condemnation.
- Numerical thresholds require the exact application and traceable specification.
- Record test conditions, meter reference, connector/pin, connected modules, actual result and source.
- Mark incomplete evidence as unknown; never silently convert missing data to a pass.
- Repairs become reusable knowledge only after physical cause and post-repair verification are recorded.

## Case-library lifecycle
Draft case -> evidence complete -> technical review -> verified outcome -> searchable knowledge.
Store the original case separately from its reviewed knowledge entry. Preserve reviewer, date, source, vehicle configuration, evidence references and revision history. Do not promote a single unreviewed case into a universal recommendation.

## Data and privacy
- Keep user case data private by default.
- Organization sharing requires explicit membership and role-based authorization.
- Do not weaken owner-level row-level security to enable shop sharing.
- Never upload employer-confidential material, proprietary OEM content without rights, customer-identifying records or dealer-system exports without authorization.
- Keep secrets and service credentials out of the public repository and browser code.

## Release gate
Before a workflow is offered to external technicians:
- Automated tests pass.
- Browser interaction is checked on desktop and mobile.
- At least one experienced technician reviews technical logic.
- Vehicle applicability and source limitations are visible.
- No unsupported repair instruction is presented as fact.
- A realistic case can be completed, saved, reopened and audited.
