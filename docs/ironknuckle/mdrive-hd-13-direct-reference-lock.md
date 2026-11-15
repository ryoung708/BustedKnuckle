# IronKnuckle Reference Lock — Mack mDRIVE HD 13-Speed Direct Drive

**Decision date:** 2026-11-15  
**Product family:** Mack mDRIVE HD  
**Selected marketing configuration:** 13-speed Direct Drive (DD)  
**Reference status:** Product configuration selected; exact service model/generation and internal mechanical layout remain to be verified.  
**Purpose:** Prevent the first IronKnuckle mDRIVE HD model from silently mixing specifications or mechanisms from different generations.

## 1. Locked product choice

The first transmission module will represent the **Mack mDRIVE HD 13-speed Direct Drive** configuration.

The current Mack mDRIVE HD public product page identifies:
- 13 forward speeds in Direct Drive (DD), Overdrive (OD), or Dynamic Overdrive (DOD) configurations.
- Five reverse speeds for the 13-speed DD configuration.
- Six reverse speeds for 13-speed OD/DOD.
- Optional creeper gearing on 13- and 14-speed configurations.
- A countershaft brake using a spring-loaded pneumatic design.
- Maximum published input torque of 1,950 lb-ft.

Source: Mack Trucks, [mDRIVE HD](https://www.macktrucks.com/powertrain/transmissions/mdrive-hd) (public product specifications accessed 2026-11-15).

**Configuration rule:** This first model is DD only. Do not use OD or DOD ratios, gear counts, shift logic or reverse data in the DD configuration.

## 2. Creeper-gear treatment

Mack's current public page describes an optional low-reduction creeper gear for the 13-speed configuration and describes an additional ultra-low reduction gear for the 14-speed configuration. Its specification summary groups low and ultra-low creeper availability across 13- and 14-speed models, so exact option content must be checked against the selected service model.

For the initial DD 13-speed configuration:
- Treat the low creeper as an optional feature.
- Do not add an ultra-low gear unless the exact service model documentation confirms it.
- Keep the creeper option data-driven so it can be enabled or disabled without rebuilding the model.

## 3. Facts we can safely encode now

| Item | Initial value | Evidence status |
|---|---|---|
| Manufacturer / family | Mack mDRIVE HD | Mack current public product page |
| Forward speeds | 13 | Mack current public product page |
| Drive configuration | Direct Drive (DD) | User-selected; listed by Mack |
| Reverse speeds | 5 | Mack current public product page |
| Maximum input torque | 1,950 lb-ft | Mack current public product page |
| Countershaft brake | Spring-loaded pneumatic design | Mack current public product page |
| Creeper | Optional low-reduction creeper; exact option content to verify | Mack public page; model-specific confirmation required |
| Exact service model code | Not yet established | Unknown |
| Gear ratios / tooth counts | Not yet established for the chosen exact model | Unknown |
| Reverse gear path and selector arrangement | Not yet established | Unknown |
| Exact splitter, main and range component geometry | Not yet established for the chosen exact model | Unknown |
| Sensor, solenoid, actuator and harness details | Not yet established | Unknown |

## 4. Important generation boundary

Older mDRIVE HD material can show different reverse-speed counts and gear ratios from Mack's current public product specifications. For example, older 2015/2017-era material describes a 13-speed direct-drive configuration with four reverse speeds. That historical information must **not** be blended into the current five-reverse-speed marketing configuration.

Historical material may be useful for tracing a specific older service model, but it is not authority for this selected current configuration unless the model code and applicable serial-number range match.

## 5. Mechanical architecture — provisional only

The existing IronKnuckle I-Shift/mDRIVE blueprint provides a useful conventional single-countershaft reference architecture:
- automated single-disc clutch and input;
- splitter section;
- main gear section;
- countershaft brake;
- planetary range section;
- output.

However, this is not yet sufficient to certify the selected current mDRIVE HD 13-speed DD's exact internal arrangement. The blueprint's conventional I-Shift architecture is a starting hypothesis, not permission to assume that every mDRIVE HD generation shares the same parts, reverse arrangement, selector hardware or actuator packaging.

The 3D model must keep all not-yet-verified assemblies configurable and visibly marked as educational/provisional until matched to model-specific Mack service information.

## 6. Evidence required before detailed mechanical modeling

Obtain or identify the exact Mack service model and applicable generation/serial range, then verify:
1. Transmission model designation and identification-tag fields.
2. Internal exploded view and section views.
3. Splitter, main and range gear relationships.
4. Main-section selector and reverse engagement path.
5. Countershaft brake construction and actuation.
6. Creeper gear option and engagement arrangement.
7. Gear ratios and any published gear/tooth data.
8. External actuator, air-line, sensor and electrical component locations.

Use only documentation the user is authorized to access. Do not copy employer-confidential material into the public repository. If reference illustrations are proprietary, record the relevant verified facts and source/version in a private working note rather than publishing the documents or images.

## 7. Build rules for IronKnuckle

- Keep the generic AMT page as a preserved prototype; do not relabel its internals as mDRIVE HD.
- Build the new transmission from a component/assembly hierarchy with stable IDs.
- Separate variant configuration, mechanical state, control sequence, fault state and 3D rendering.
- Make gear selection alter physical engagement and kinematics; animation must follow state rather than invent it.
- Main-section speed matching must be represented through the verified countershaft-brake mechanism, not generic mainshaft synchronizers unless exact service data proves otherwise.
- The five reverse speeds must be modeled through the verified reverse gear path, not by merely reversing output rotation.
- Ratios remain unavailable until sourced for the exact model; never substitute historical or OD values.
- Keep the future fault-simulation hooks in the component model from the first blockout.

## 8. Next gate

**Reference identity gate:** identify the exact service model/generation that corresponds to the selected Mack mDRIVE HD 13-speed DD configuration.

Only after that gate should we lock internal gear topology, reverse layout, ratios, actuator packaging and detailed geometry. Until then, proceed only with noncommittal scene scaffolding and UI/architecture work that does not encode unverified mechanics.
