# IronKnuckle fault catalog data policy

The fault library is split into distinct layers so a generic code is not confused with a manufacturer-specific definition.

## Catalog files

- `standard-fmi-reference.json`: original plain-language FMI explanations. FMI describes a failure mode, not the failed component.
- `obd2-standard-codes.json`: a starter set of generic OBD-II powertrain DTCs. Descriptions are original paraphrases of the publicly accessible SAE J2012 APR2002 reference. This is a historical baseline, not a guarantee that every assignment or phrase is unchanged in the current J2012 edition. Verify current applicability before relying on a code.
- `j1939-spn-reference.json`: selected SPN parameter descriptions paraphrased from NHTSA-hosted supplemental service information. The source expressly says it is not comprehensive; verify current assignments against the applicable SAE J1939 Digital Annex and OEM implementation.
- `oem-fault-catalog.json`: reserved for scoped OEM-specific definitions. It intentionally starts empty.
- `fault-catalog.json`: index and data policy.

## Technician submissions

The Command Center includes a local submission form. Drafts are stored in the current browser profile under `ironknuckle.faultSubmissions.v1`. They are **not uploaded** to a server and are **not trusted catalog entries**. Use Export submissions to create a JSON file for review/import. A future authenticated backend is required for shared submissions between technicians.

Do not enter customer names, VINs, personal data, or restricted OEM document text in submissions. Use vehicle/platform context only where appropriate and permitted.

## Entry and promotion rules

1. Record source title, URL, edition, page/section, date reviewed, license/permission status and scope.
2. Keep manufacturer, controller, engine family, model years, emissions generation and calibration explicit for OEM entries.
3. Never treat a generic SPN/FMI pair as a confirmed component failure.
4. Do not copy proprietary manuals, paid databases, or restricted datasets without permission.
5. Technician findings remain pending review until corroborated and scoped.
6. No repair/parts recommendation is generated from a code definition alone.

## Confidence labels

- `verified`: checked against an applicable authoritative source with scope recorded.
- `publicly_documented`: supported by a public technical/regulatory publication, with source limitations recorded.
- `publicly_documented_historical_standard`: supported by an older publicly accessible standard edition; current-edition confirmation remains necessary.
- `technician_verified`: validated through a documented real-world case; not automatically a universal definition.
- `unverified`: incomplete or awaiting source confirmation.

A deliberately limited catalog is safer than an impressive-looking list of guessed or incorrectly scoped definitions.
