# I-Shift / mDRIVE 3D Trainer — Architecture Audit
**Date:** 2026-11-15  
**Audited file:** `amt-transmission.html` on `main`  
**Audited source blob:** `f1cf2f8862d2366fd84b9d399911e358f07e246d`  
**Reference specification:** `docs/ironknuckle/ishift-mdrive-simulation-blueprint.md`  
**Audit type:** Static source review. No browser/WebGL visual inspection or OEM dimensional validation was performed.

## Executive finding

The current page is a useful **generic AMT interaction prototype**, but it is not yet a valid I-Shift/mDRIVE mechanical model. It has reusable presentation and interaction infrastructure, but its internal powertrain topology and shift logic need a substantial rebuild.

**Recommendation:** Preserve the page's UI and interaction foundation. Rebuild the mechanical assembly and operating model as a data-driven I-Shift/mDRIVE baseline. Do not incrementally relabel the current geartrain.

## 1. KEEP — reusable foundation

| Existing feature | Decision | Reason |
|---|---|---|
| Three.js scene, camera, renderer and lighting | Keep | Solid starting point for the 3D experience |
| Responsive canvas and resize handling | Keep / harden | Useful desktop and mobile foundation |
| Pointer drag, pinch zoom, wheel zoom and zoom buttons | Keep / test | Matches the intended technician interaction |
| Reset camera and selectable component pattern | Keep / improve | Good navigation and learning affordance |
| Exterior, cutaway and exploded view controls | Keep / refactor | Essential views; preserve behavior while changing assembly contents |
| Component sidebar, labels and readouts | Keep / data-drive | Useful teaching UI; descriptions should come from configuration data |
| Material palette, basic shaft/cylinder/gear mesh helpers | Keep selectively | Reusable primitives, but gear geometry and axes must be validated |
| Housing visibility concept | Keep / improve | Existing exterior-versus-cutaway approach is worth retaining |

## 2. MODIFY — preserve intent, replace implementation

### 2.1 Assembly and component organization

Current groups are broad visual buckets: `case`, `clutch`, `input`, `counter`, `main`, `forks`, `pneumatic` and `output`.

Refactor to an explicit assembly hierarchy:
- clutch / flywheel interface;
- input shaft;
- splitter section;
- main section;
- countershaft brake;
- range section and planetary gearset;
- output shaft;
- control and actuator system;
- housing and covers.

Every component should have a stable ID, parent assembly, motion axis, selectable identity, source/evidence status and future fault hooks. Avoid relying on broad string labels as the only identity.

### 2.2 View modes

Keep the three view modes, but make visibility and exploded transforms declarative per assembly. The current implementation changes group positions directly and resets every group to the origin when leaving exploded mode. This is fragile as the assembly becomes more complex.

Acceptance requirements:
- exterior always shows the complete housing and external interfaces;
- cutaway reveals the correct internals without losing spatial context;
- exploded view separates assemblies along planned axes;
- switching modes repeatedly restores each component's intended transform;
- camera position is never used to conceal intersections or incorrect geometry.

### 2.3 Operating state

Replace the current direct UI-to-animation behavior with a mechanical state model. Gear request, control sequence, physical engagement and rendered motion must be separate.

For example, selecting a ratio should not instantly imply a successful engagement. The state should represent the shift request, clutch/torque coordination, countershaft speed matching where required, selector movement, engagement confirmation and torque restoration.

### 2.4 Component descriptions

Replace hard-coded generic descriptions with configuration-backed content. Each description should identify whether the behavior is OEM-confirmed, an educational simplification or still awaiting model-specific verification.

## 3. REMOVE / REBUILD — generic AMT mechanics that conflict with the baseline

| Current implementation | Why it cannot remain as the I-Shift baseline | Required replacement |
|---|---|---|
| Two mainshaft synchronizer assemblies for 1st/2nd and 3rd/4th | The selected conventional I-Shift reference has unsynchronized main-section gears | Main-section selector/dog engagement plus a modeled countershaft brake and speed-matching sequence |
| Dedicated reverse synchronizer sleeve, hub and fork | Not established by the selected baseline reference; generic prototype assumption | Rebuild reverse path from the exact OEM service layout |
| Four forward gear pairs all placed in the main section | Baseline reference describes three forward main-section speeds, with splitter and range sections contributing ratios | Three main-section forward speeds, plus distinct splitter and range assemblies |
| Reverse idler and reverse gear as a generic local mesh | Exact placement and engagement need OEM confirmation | Model verified reverse gear path and make direction emerge from gear topology |
| Hard-coded output speed multipliers | They do not derive from actual gear ratios or gear constraints | Calculate shaft speeds from configured gear relationships; label illustrative ratios until sourced |
| Output direction set by a reverse sign switch | It bypasses the modeled gear path | Determine output direction from actual mesh/planetary relationships |
| Generic selector actuators mapped to synchronizer sleeves | Main-section shift mechanism is not equivalent to splitter/range synchronizers | Distinct main selector, splitter selector and range selector mechanisms, matching reference documentation |
| Air-pressure button that changes a readout and scales rod travel | It does not model a pressure circuit, force, position feedback or failed actuation | State-driven pneumatic supply, valve command, actuator position and fault response |
| Clutch state directly starts/stops all shaft animation | Overly simplified and not a complete clutch/shift control sequence | Model clutch coupling, disengagement, inertia/coast and torque restoration as explicit states |

The current `animate()` loop independently assigns rotation to the input, countershaft, free gears, mainshaft and output. This makes the assembly look active, but it does not enforce a physically consistent geartrain. Rebuild the motion logic around a mechanical state solver or a clearly constrained educational kinematic model.

## 4. MISSING — required baseline assemblies

These are not present as functional assemblies in the current page:

1. **Splitter section:** gears, synchronizer, selector/fork and its effect on ratio.
2. **Countershaft brake:** distinct brake component, command, application state and speed-matching effect for main-section shifts.
3. **Range section:** planetary gearset with identifiable members and range selection.
4. **Main-section selector:** correct unsynchronized gear engagement representation.
5. **TCM/control representation:** requested ratio, shift coordination, actuator commands and feedback.
6. **Sensors and solenoids:** only add specific devices and signal behavior after the chosen generation's documentation is identified.
7. **Configuration/variant data:** gear count, ratios, reverse options, direct/overdrive arrangement and generation differences.
8. **Fault-state architecture:** component-level fault definitions that alter the underlying mechanical/control state and produce downstream effects.

## 5. Important source-level observations

- The current page identifies itself as a generic single-countershaft AMT; that disclaimer is appropriate for the prototype but must be replaced when the baseline is validated.
- The gear selector offers Neutral, 1st–4th and Reverse, while the rendered geartrain has four main-section forward gear pairs. That does not match the three-forward-main-gear baseline described in the blueprint.
- The main-section synchronizers are visibly and behaviorally central to current gear selection; this is the most important architecture conflict.
- The reverse sleeve is independently animated toward the reverse gear, but the model does not establish this as an OEM-verified I-Shift reverse mechanism.
- The planetary range section and countershaft brake are absent.
- Gear-speed values are illustrative constants, not derived from documented gear tooth counts or OEM ratios.
- The air-pressure control changes a displayed value and a simplified rod offset; it is not yet a pneumatic system simulation.
- The view-mode code mutates assembly group positions in place and restores them to zero, rather than restoring per-component authored transforms. This will become increasingly fragile as the assembly grows.
- The current code uses broad group visibility and material opacity rules. These should become per-assembly/per-part view metadata to prevent housing and internal components from being unintentionally hidden.
- No actual browser interaction, WebGL rendering, mobile touch test or performance test was performed during this static audit.

## 6. Proposed rebuild architecture

Use four explicit layers:

### A. Variant configuration
Stores transmission family, generation, exact model, section layout, gear counts, ratios, reverse options, component inventory and source references. A new variant should not require duplicating the entire renderer.

### B. Mechanical model
Defines shafts, gears, fixed/free relationships, mesh relationships, synchronizers, dog engagements, brake constraints, planetary members and output path.

### C. Control and fault state
Defines gear request, shift sequence, clutch command, brake command, selector command, actuator response, sensor feedback and injected fault conditions. A command must not be treated as proof that a component moved.

### D. 3D renderer and learning UI
Displays the state through animation, highlights, torque-flow indicators, component details and view modes. Rendering must not invent a successful shift or conceal a failed engagement.

## 7. Rebuild sequence

1. **Freeze the current page as the generic prototype reference.** Do not delete its useful UI or lose a working baseline.
2. **Confirm the exact first reference model/generation** from available OEM service information. "Standard I-Shift/mDRIVE" is a family-level direction, not enough to certify exact reverse layout, gear ratios, selector details or actuator packaging.
3. **Build a mechanical blockout** for input, splitter, main, countershaft brake, range planetary and output.
4. **Validate normal torque paths and ratio states** before polishing gear teeth, castings and detailed hardware.
5. **Add control sequencing** for clutch, countershaft brake, splitter and range operations.
6. **Restore polished exterior/cutaway/exploded views** using the new assembly hierarchy.
7. **Add one evidence-backed fault simulation** only after normal operation is coherent.
8. **Add additional model variants** through configuration data and documented mechanical differences.

## 8. Acceptance gates for the next implementation

The rebuild is not ready for merge until:
- no main-section synchronizer is represented as the baseline speed-matching mechanism;
- the countershaft brake is visible and has a meaningful modeled effect;
- splitter and range sections are distinct and mechanically connected;
- the range planetary members and selection behavior are represented;
- gear and shaft speeds are consistent with the modeled kinematic relationships;
- reverse is modeled from the chosen OEM reference, not a generic assumption;
- exterior, cutaway, exploded and reset interactions remain reliable;
- no unsupported OEM ratios, sensor thresholds, fault codes or component layouts are asserted;
- the page clearly labels any remaining educational simplifications.

**Bottom line:** keep the 3D interaction experience; rebuild the powertrain topology and motion logic. The current page is a strong prototype foundation, not the mechanical foundation we should build fault simulation on.
