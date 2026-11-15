# IronKnuckle Mechanical & Simulation Blueprint
## Standard Volvo I-Shift / Mack mDRIVE reference module

**Status:** Baseline architecture and product specification  
**First reference family:** Conventional single-countershaft I-Shift / mDRIVE layout  
**Purpose:** Establish the mechanical, interactive and future diagnostic-simulation requirements for the first drivetrain module.

> **Accuracy rule:** This document distinguishes OEM-documented facts from the educational model's simplifications and from behavior that still requires model-specific service information. "I-Shift" and "mDRIVE" cover multiple generations and configurations. This blueprint is not a claim that every generation shares one internal layout.

---

## 1. Product objective

Build an interactive 3D learning and diagnostic module that lets a technician:

1. Explore a transmission's components and relationships.
2. Operate it through representative shift states.
3. Observe torque flow, gear engagement and control actions.
4. Introduce a realistic fault and see its direct effects.
5. Connect those effects to driver symptoms, fault codes and technician measurements.
6. Work through a diagnostic process and verify a repair.

The first release is a mechanically credible teaching model. Fault injection, system-level consequences and guided diagnosis are architectural requirements from the beginning, but are not prerequisites for calling the first mechanical model complete.

## 2. Reference architecture and evidence boundaries

### 2.1 Baseline architecture

For the initial conventional I-Shift reference, Volvo Trucks North America's 2010 Group 431 service bulletin describes:

- A **single-countershaft** automated mechanical transmission.
- A **splitter section**, a main section with **three forward gears and one reverse gear**, and a **range section**.
- Synchronizers in the splitter and range sections, **not in the main section**.
- A **countershaft brake** used to equalize shaft speeds for main-section gear meshing.
- A single-disc automated clutch instead of a torque converter.
- Pneumatic and electrically controlled shift, clutch and countershaft-brake functions coordinated by the TCM.

This is the starting mechanical reference, not a universal specification for every later I-Shift or mDRIVE.

### 2.2 Related official product information

Volvo's AT2612 / ATO3112 fact sheets describe three main speeds, splitter and reverse gearing, with a planetary range gear in the range housing. Volvo's 2025 ATO3112 fact sheet also documents optional crawler and multi-speed reverse configurations. Mack's current mDRIVE product information lists 12- and 13-speed configurations with different direct/overdrive choices and differing reverse-speed counts; mDRIVE HD has additional 12-, 13- and 14-speed configurations.

These facts establish why the model must support **configuration variants** rather than hard-code one gear count or reverse arrangement.

### 2.3 Reference sources

- Volvo Trucks North America, Service Bulletin Group 431-03, *Transmission, Mechanical* (April 2010): https://static.nhtsa.gov/odi/inv/2013/INOT-PE13002-60056P.pdf
- Volvo, AT2612 I-Shift fact sheet: https://stpi.it.volvo.com/STPIFiles/Volvo/FactSheet/AT2612_Eng_02_324367762.pdf
- Volvo, ATO3112 I-Shift fact sheet (2025 revision): https://stpi.it.volvo.com/STPIFiles/Volvo/FactSheet/ATO3112_Eng_02_337856864.pdf
- Mack, mDRIVE product specifications: https://www.macktrucks.com/powertrain/transmissions/mdrive
- Mack, mDRIVE HD product specifications: https://www.macktrucks.com/powertrain/transmissions/mdrive-hd

Use OEM service information for the exact transmission model, serial-number range, control generation and gear arrangement before asserting exact component dimensions, gear ratios, actuator locations, wiring, air routing or diagnostic thresholds.

---

## 3. Mechanical system map

### 3.1 Functional power path

Represent the baseline as these functional sections:

1. **Engine / flywheel interface**
2. **Single-disc automated clutch**
3. **Input shaft**
4. **Splitter section and splitter synchronizer**
5. **Main gear section**
   - Three forward main ratios in the baseline reference.
   - One reverse ratio in the baseline reference.
   - Unsynchronized main-section gear engagement.
   - Countershaft brake used to bring rotating members toward the required speed before engagement.
6. **Range section**
   - Planetary range gear set.
   - Range synchronizer / selector arrangement.
7. **Output shaft / yoke**
8. **TCM, sensors, solenoids, pneumatic supply and actuators**

The model must show the power path continuously and make it clear which components are rotating, free-running, locked together or stationary in each selected state.

### 3.2 Shaft and gear relationships

The baseline mechanical model must represent:

- One input shaft receiving torque through the automated clutch.
- One countershaft with its fixed gear train.
- One mainshaft carrying the main-section gears and the selected torque path.
- The splitter section's selectable ratio path and synchronizer.
- The range section's planetary members and range selection.
- The output connection downstream of the range section.

Do not simply duplicate the generic AMT gear stack and relabel it. Rebuild the topology around the selected reference architecture.

### 3.3 Main-section engagement: critical correction

The baseline model must **not portray the main-section gear changes as conventional synchronizer-cone events**. The 2010 Volvo reference identifies the main gears as unsynchronized and describes the countershaft brake as the mechanism used to equalize speeds for gear meshing.

For the baseline:
- Show the main-section selector/dog engagement as a distinct operation from splitter and range synchronization.
- Show the countershaft brake as a separate controlled component.
- Make the speed-matching phase visible before main-section engagement.
- Do not label a main-section sliding sleeve as a synchronizer unless a chosen OEM variant's service information confirms that design.

The splitter and range synchronizers should be separately identifiable and animated as their own assemblies.

### 3.4 Reverse

The baseline reference identifies one reverse gear in the main section. Do not carry forward the generic prototype's dedicated reverse synchronizer as an assumed OEM feature. Model the reverse gear path, idler/gear relationships and selector engagement only after confirming the exact reference model's service illustrations. Reverse direction must emerge from the modeled gear path, not from an arbitrary sign flip alone.

Later multi-speed reverse options must be separate configurations, not silently folded into the baseline.

---

## 4. Component inventory and 3D requirements

Every modeled component should have a stable ID, display name, system/section, parent assembly, motion role, visibility groups, educational description, evidence status and future fault hooks.

| Assembly | Required visible components | Interaction / learning purpose |
|---|---|---|
| Clutch | Flywheel interface, clutch cover/disc, release bearing and release mechanism | Show torque coupling and commanded disengagement |
| Input | Input shaft, bearings, drive interface | Show input speed and torque entry |
| Splitter | Splitter gears, synchronizer hub/sleeve, fork/selector | Show ratio selection and synchronization |
| Main section | Mainshaft, countershaft, fixed and free-running gears, selector/dog engagement, countershaft brake | Show main gear selection and speed matching |
| Reverse | Reverse gear path and idler components as confirmed for selected variant | Show reverse torque path and output direction |
| Range | Planetary set, range synchronizer/selector, housing | Show low/high range and planetary member relationships |
| Output | Output shaft, bearings, yoke | Show delivered speed and direction |
| Controls | TCM representation, sensors, solenoids, pneumatic valves, air lines and actuators | Connect command, feedback and physical movement |
| Housing | Bell housing, main case, range housing, covers and mounting interfaces | Preserve spatial context in exterior/cutaway/exploded modes |

### 4.1 View modes

All view modes must remain stable when switching repeatedly:

- **Exterior:** complete housing and external shafts/yokes visible; no internal gear leakage through the housing.
- **Cutaway:** housing sections removed or made selectively transparent without losing component relationships.
- **Exploded:** components separated along intentional assembly axes, with clear assembly order.
- **Component focus:** selected component highlighted without hiding important adjacent context.

Camera behavior:
- Preserve the established useful viewing angle.
- Start sufficiently zoomed out to see the complete assembly.
- Support user-controlled zoom and rotation.
- Do not use camera movement to hide geometry intersections or incorrect component placement.
- Reset view must restore a predictable default.

### 4.2 Interaction and operating states

The first mechanically complete model should support:

- Neutral.
- Representative forward gear selections.
- Reverse, only as validated for the selected configuration.
- Clutch engaged / disengaged.
- Splitter low / high.
- Range low / high.
- Countershaft brake applied / released.
- Shift sequence animation with visible command, actuator movement, component engagement and torque restoration.

Use actual model relationships for rotation. Gear ratios and speed relationships must be internally consistent. Where exact ratios are not yet sourced, label values as illustrative rather than OEM specifications.

---

## 5. Simulation-ready software architecture

The 3D geometry must not be the source of truth for mechanical behavior. Keep the model's concerns separated:

### 5.1 Data/configuration layer

A transmission configuration should declare:
- Manufacturer / family / generation.
- Exact model or reference variant, when known.
- Forward and reverse speed count.
- Direct / overdrive arrangement.
- Optional crawler or multi-speed reverse features.
- Shaft and gear topology.
- Component identifiers and relationships.
- OEM source references and revision dates.
- Which facts are confirmed, inferred, simplified or unknown.

A variant should be data-driven where practical. Do not fork the entire 3D page for every gear-count variation.

### 5.2 Mechanical state layer

Track state independently of rendering:
- Input/clutch state.
- Shaft angular speeds and directions.
- Gear engagement state.
- Synchronizer positions.
- Main-section dog engagement.
- Countershaft brake state.
- Range and splitter states.
- Output speed/torque relationship.
- Air pressure and actuator position where modeled.

### 5.3 Control layer

Represent the shift request and the control sequence separately from the physical result:
- Driver/TCM gear request.
- Interlocks and preconditions.
- Torque reduction / clutch command.
- Air-solenoid command.
- Actuator movement.
- Speed synchronization.
- Gear engagement confirmation.
- Clutch re-engagement and torque restoration.

Do not claim to reproduce proprietary OEM shift maps or calibration. The educational sequence should be labeled as representative unless validated against model-specific documentation.

### 5.4 Rendering layer

The renderer reads the mechanical state and animates:
- Component rotation.
- Fork, sleeve and selector movement.
- Clutch release travel.
- Countershaft brake action.
- Planetary member movement.
- Torque-flow indicators.
- Fault-state highlighting and visual effects.

The renderer must not invent a successful shift when the mechanical state says engagement failed.

### 5.5 Fault layer — planned from day one

A fault definition should eventually include:
- Fault ID and title.
- Affected component(s).
- Failure mode.
- Conditions required to reproduce it.
- Direct physical/electrical/control effect.
- Secondary effects and affected components.
- Observable driver symptoms.
- Possible diagnostic trouble codes, with exact applicability sourced.
- Expected measurements and test conditions.
- Diagnostic steps and evidence.
- Repair action and post-repair verification.
- Confidence and source provenance.

Faults must be causal, not cosmetic. A fault should change the underlying state, and the rendered behavior should follow from that changed state.

---

## 6. Future fault-simulation scenarios

These are candidate scenarios, not claims about universal I-Shift failure behavior. Each must be checked against the applicable service documentation before implementation.

| Candidate fault | Simulation behavior to develop | Technician learning outcome |
|---|---|---|
| Clutch fails to release fully | Residual torque/input drag remains during shift request | Understand why shaft speeds may not settle and why engagement can be difficult |
| Countershaft brake ineffective | Main-section speed matching is delayed or unsuccessful | Understand the role of the countershaft brake and what evidence supports a fault |
| Splitter synchronizer wear/damage | Splitter engagement becomes slow, noisy or incomplete under defined conditions | Distinguish splitter synchronization from main-section speed matching |
| Range selector fails to complete travel | Range state disagrees with command; output ratio/state is incorrect or unavailable | Connect actuator travel, position feedback and range selection |
| Pneumatic supply/actuator fault | Command occurs but physical movement is weak, delayed or absent | Separate electrical command from pneumatic/mechanical response |
| Speed sensor signal fault | Controller-visible speed differs from simulated physical speed | Compare physical behavior with sensor data and diagnostic evidence |
| Wiring/solenoid circuit fault | Control command is absent or electrically incorrect; actuator response follows that condition | Link WiringHound measurements to transmission behavior |

The simulator must distinguish:
- A component that physically failed.
- A control command that was never issued.
- An actuator that received a command but did not move.
- A sensor that reports incorrect information while the mechanism may still move.
- A mechanical consequence caused by a different upstream fault.

---

## 7. Diagnostic experience design

The eventual technician workflow:

1. **Observe:** vehicle complaint, warning, fault code or symptom.
2. **Inspect:** select the relevant transmission section and components.
3. **Reproduce:** run the operating condition that triggers the fault.
4. **Measure:** access simulated scan data, electrical values, air pressure, actuator position and shaft speeds where supported.
5. **Hypothesize:** choose likely failure causes and explain the evidence.
6. **Test:** perform guided or open-ended diagnostic checks.
7. **Repair:** apply a repair to the simulated system.
8. **Verify:** repeat the operating condition and confirm the fault is resolved.

The experience should reward correct diagnostic reasoning, not guessing the hidden fault.

---

## 8. Validation and acceptance gates

### Gate A — reference accuracy
- Selected model/generation is explicitly named.
- Mechanical layout is cross-checked against OEM service illustrations.
- Main, splitter and range section functions are correctly distinguished.
- Reverse arrangement is verified.
- Confirmed facts are cited; unknowns remain marked unknown.

### Gate B — mechanical integrity
- Shafts, gears, bearings and housings do not intersect incorrectly.
- Gear meshes and shaft axes are coherent.
- Gear selection engages the intended mechanism.
- Neutral leaves the intended gears free-running.
- Torque flow and output direction follow the gear path.
- Splitter/range synchronization and main-section speed matching are not conflated.

### Gate C — interactive reliability
- Exterior, cutaway and exploded views can be switched repeatedly.
- Housing visibility remains correct.
- Zoom, rotation, reset and component selection work on desktop and mobile.
- No control becomes visually active without changing the underlying state.
- No uncaught runtime errors during core interactions.

### Gate D — simulation readiness
- Geometry has stable component IDs.
- Mechanical state is separate from rendering.
- Control commands are separate from physical actuator response.
- Fault hooks can alter state without rebuilding the model.
- One fault can produce multiple observable consequences.

### Gate E — technician validation
- A heavy-duty technician can identify major components.
- A technician can explain the normal shift sequence from the animation.
- A technician can distinguish confirmed OEM behavior from educational simplification.
- Diagnostic scenarios teach a testable cause-and-effect relationship.

Do not call the module "OEM accurate" or "diagnostically validated" until the corresponding gate has passed.

---

## 9. Delivery sequence

1. **Architecture audit:** compare the existing generic AMT prototype with this baseline; list what can be reused and what must be rebuilt.
2. **Reference selection:** identify the exact baseline I-Shift/mDRIVE generation and model from available OEM service information.
3. **Mechanical blockout:** establish correct input, countershaft, mainshaft, splitter, range and reverse topology.
4. **Mechanical operation:** implement gear engagement, clutch, countershaft brake, synchronizers, planetary range and output relationships.
5. **Visual polish:** refine housing, bearings, shafts, gears, forks, actuators, labels and view transitions.
6. **Simulation foundation:** separate configuration, mechanical state, controls and rendering.
7. **First fault scenario:** implement one evidence-backed failure end-to-end.
8. **Variant framework:** add additional I-Shift/mDRIVE generations and configurations without corrupting the baseline.

Each iteration should preserve the long-term simulation architecture, but the current acceptance gate remains mechanical correctness and stable interaction.

---

## 10. Non-negotiable IronKnuckle standards

- Mechanical accuracy before visual complexity.
- Cause and effect before decorative animation.
- No invented OEM specifications, ratios, fault codes or test thresholds.
- Label educational simplifications.
- Keep model-specific variants distinct.
- Preserve working behavior and test regressions after every change.
- Build components so they can eventually participate in fault simulations.
- Use technician feedback to validate whether the module teaches something useful in the shop.

**Long-term destination:** a technician can see a system, operate it, introduce a fault, observe what changes, measure the evidence, diagnose the cause and verify the repair—all within IronKnuckle.
