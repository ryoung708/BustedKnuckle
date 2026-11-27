# IronKnuckle Diagnostic Rebuild V3

DCC and WiringHound are flagship products. Prioritize technician usefulness, technical accuracy and usability over feature expansion.

## Interface contract
- One current test, concise actionable instructions, relevant safety conditions, large observation buttons, optional readings/notes/photos, visible next action and hold reason.
- Conceptual test-point illustrations where useful, explicitly distinguished from OEM schematics. No invented pinouts or specifications.
- Preserve shared intake, VIN privacy, fault descriptions, case history, evidence, authentication and vault functionality.
- Desktop and mobile acceptance required.

## Workflow contract
- Dedicated no-crank path; never derive starting or general electrical procedures from lighting instructions.
- Distinguish no engagement, click, slow crank, normal crank/no start and dash reset. Branch on actual observations. Normal crank/no start routes to DCC; dash reset routes to power-loss diagnosis.
- DCC: prioritize crank/no-start and fuel-pressure diagnosis, including P016F and P009B applicability and OEM EPRV conversion review.
- Unconfirmed observations cannot imply pass or repair verification. Unknown results offer safe alternatives or explicit reasons for stopping.
- Reuse shared vehicle context and case schema. Cross-tool handoff must preserve relevant evidence without exposing full VIN.

## Release gates
1. Complete observation-to-next-action matrix with valid targets and unknown-result handling.
2. Realistic end-to-end scenarios including 2020 Mack Anthem MP8 no crank/no start, normal crank/no start, lighting and power-loss regression cases, P016F related faults and post-repair verification.
3. Technical source/applicability review; no unsupported OEM-specific claims.
4. Full automated CI plus actual desktop/mobile browser review and technician acceptance.
5. Preserve existing cases and unrelated features. No production replacement until gates are met.

This document establishes requirements, not completed implementation or technical approval.
