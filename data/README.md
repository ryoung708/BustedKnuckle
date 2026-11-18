# IronKnuckle fault catalog data policy

This directory separates generic standards references from vehicle/OEM-specific fault definitions.

## Files
- `standard-fmi-reference.json`: original plain-language FMI explanations. These describe failure-mode categories only; they do not define an SPN or identify a failed part.
- `fault-catalog.json`: provenance-first catalog schema. It intentionally starts with no imported code records.

## Entry rules
1. Verify code assignment and scope before adding a definition.
2. Preserve source title, URL, page/section, date reviewed, and license/permission status.
3. Keep OEM/controller/engine/emissions scope explicit.
4. Do not copy proprietary manuals, paid databases, or restricted datasets without permission.
5. Do not turn an FMI description into a component diagnosis.
6. No repair/parts recommendation from an unverified definition.
7. Technician cases remain separate evidence until reviewed.

## Confidence labels
- `verified`: checked against an applicable authoritative source with scope recorded.
- `publicly_documented`: supported by a public technical/regulatory publication, with scope recorded.
- `technician_verified`: validated through a documented real-world case; not automatically a universal definition.
- `unverified`: incomplete or awaiting source confirmation.

A blank catalog is intentional. It is safer than presenting invented or incorrectly scoped definitions as current fault data.
