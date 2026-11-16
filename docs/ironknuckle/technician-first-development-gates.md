# IronKnuckle — technician-first development gates

**Phase:** private/internal build and owner-technician dogfooding  
**Not a public beta or technician release.** The first user is the project owner. The purpose of this phase is to finish the visual learning environment, make the diagnostic workflow useful at the workbench, and accumulate trustworthy first-party repair knowledge.

## Product order

1. **Learning Center visuals and training aides.** Build recognizable system layouts and component relationships for engine, after-treatment, transmission, AMT, differential and chassis systems. A visual may be an educational blockout, but must be labelled as such until verified against a model-specific source.
2. **Diagnostic Command Center.** Capture complaint, operating conditions, fault codes, freeze-frame/scan data, inspection, test sequence, measurements, hypotheses, root cause, repair and post-repair verification.
3. **WiringHound.** Preserve the evidence-first electrical workflow: state the test conditions, meter setup, expected range, observed reading, interpretation and next safe isolation step. Distinguish an open circuit, short, voltage-drop issue and module/network fault; never condemn a component from one ambiguous reading.
4. **Private technician history.** Keep original cases private and owned by their author. A case is not a shared rule merely because it was submitted.
5. **Searchable similar cases.** Add only after case structure and outcome capture are reliable. Similarity results must show why cases match and keep unverified matches separate from verified repairs.

## Visual module acceptance

Every drivetrain/mechanical module must pass these gates before being described as mechanically accurate:

- Exact family, service model, generation and configuration are identified, or the module is explicitly marked provisional.
- Exterior, cutaway, exploded and reset views work repeatedly without losing parts, clipping geometry or concealing intersections with camera tricks.
- Input/output interfaces and mounting surfaces are recognizable and correctly placed.
- Shafts, gears, bearings and housings have coherent axes and clearances.
- Gear meshes, shaft speeds, direction and torque path are mechanically consistent with the declared educational model.
- Controls alter a defined mechanical state; animation follows state rather than inventing engagement.
- Mobile touch, desktop pointer, zoom, camera reset and component selection are checked in a real browser.
- Known simplifications and unverified details are visible to the learner.

### Current drivetrain gates

**Mack mDRIVE HD 13-speed Direct Drive:** retain the selected configuration, but do not assert exact internal topology, ratios, reverse path, sensor locations or actuator layout until the exact service model/generation is identified from authorized documentation. Exterior casting and output shaft/yoke remain visual work. The generic AMT prototype must not be relabelled as the mDRIVE.

**Differential:** rebuild the full assembly in functional order: axle tubes/shafts and wheel ends; carrier/housing; pinion and input interface; ring gear; differential case; side and spider gears; bearing supports and covers. Validate the torque path and relative gear motion before cosmetic detail. Keep the model-specific axle family and ratio provisional until identified.

## Diagnostic knowledge quality gates

A useful repair record contains:

- vehicle/system identity at the least-sensitive level needed;
- complaint and exact conditions when it occurs;
- fault codes and source/tool used to retrieve them;
- measurements with units, test points, key state, connector state and meter mode;
- tests performed, results and evidence attachments;
- suspected cause versus confirmed root cause;
- repair actually performed;
- post-repair verification under the original failure conditions;
- technician confidence and whether the outcome is independently corroborated;
- source/version for any OEM procedure or specification.

Do not store full VINs, customer identity, employer-confidential material, credentials or proprietary OEM documents unless authorized. Prefer redacted notes and user-created measurements.

## Knowledge trust states

Use explicit states rather than treating every saved note as truth:

- **Unverified:** hypothesis, imported reference or single unconfirmed observation.
- **Observed:** a technician recorded the symptom/test/result, but repair causality is not established.
- **Repair-reported:** repair and result recorded by the technician; not independently corroborated.
- **Verified:** the same fault condition was retested after repair and the result documented.
- **Corroborated:** independent cases or authoritative sources support the same causal finding.

A record may be promoted only when its evidence supports the transition. Preserve original case data and an audit trail when a knowledge entry is corrected.

## Internal-use success measures

Do not measure this phase by public users, signups or number of 3D objects. Measure it by:
- whether the owner can find the right system/component quickly;
- whether a diagnostic path produces useful next tests without skipping prerequisites;
- whether WiringHound interpretations match known electrical principles;
- whether a completed case captures the repair and verification outcome;
- whether a later similar case can retrieve the earlier case with a transparent match rationale;
- whether the tool saves diagnostic time or prevents unnecessary parts replacement.

## Next implementation sequence

1. Finish mDRIVE exterior identity and reliable view switching; do not add unsupported internal details.
2. Rebuild the differential blockout and validate gear/torque relationships.
3. Add claim-level evidence metadata and validation to fault-library records.
4. Improve case capture for repair performed and post-repair verification.
5. Add owner-only searchable job history and similar-case retrieval after the data model is proven with real owner cases.
