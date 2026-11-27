import {startingRecommendation,sensorRecommendation} from "./wiringhound-complaint-engine.js";
// IronKnuckle Diagnostic Brain v2
// One shared reasoning core with system-specific specialist adapters.
// Evidence-first rules only. Cross-system cues are prompts to investigate, never causal diagnoses.
import { buildVehicleContext } from "./vehicle-context.js";
import { recommendNextStep } from "./wiringhound-decision-engine.js";
import { workflows as powertrainWorkflows } from "./diagnostic-engine.js";
import { MACK_UQLS_YELLOW_CODES } from "./oem-fault-guidance.js";

const clean = value => String(value ?? "").trim();
const lower = value => clean(value).toLowerCase();
const populated = value => clean(value).length > 0;
function mackUqlsScope(vehicle = {}) {
  const make=lower(vehicle.make);
  const model=clean(vehicle.model||vehicle.chassis).toUpperCase();
  const emissions=clean(vehicle.emissions||vehicle.emissionsFamily).toUpperCase().replace(/\s/g,"");
  const year=Number.parseInt(clean(vehicle.year),10);
  const excluded=/\b(?:AN|PR)\s*\(\s*4\s*\)/.test(model);
  const emissionMatch=emissions.match(/^US(\d{2})\+OBD(\d{2}|\d{4})$/);
  const usGeneration=emissionMatch?Number(emissionMatch[1]):NaN;
  const obdYear=emissionMatch?(emissionMatch[2].length===4?Number(emissionMatch[2]):2000+Number(emissionMatch[2])):NaN;
  const supportedEmissions=Number.isFinite(usGeneration)&&Number.isFinite(obdYear)&&
    usGeneration>=17&&usGeneration<=22&&obdYear>=2016&&obdYear<=2023;
  const supportedModelYear=Number.isFinite(year)&&year>=2017&&year<=2024;
  return {valid:make.includes("mack")&&populated(model)&&!excluded&&supportedEmissions&&supportedModelYear,make,model,emissions,year,excluded,supportedEmissions,supportedModelYear};
}
const mackUqlsCodes = new Set(Object.keys(MACK_UQLS_YELLOW_CODES));
function hasActiveMackUqlsFault(record = {}) {
  return Object.values(record.entries || {}).some(entry =>
    Array.isArray(entry?.faultCodes) && entry.faultCodes.some(fault => {
      const code=clean(fault?.code).toUpperCase().replace(/[^A-Z0-9]/g,"");
      const status=lower(fault?.status);
      return mackUqlsCodes.has(code) && ["active","confirmed"].includes(status);
    })
  );
}
const electricalWorkflowIds = new Set([
  "sensor_circuit","starting_system","j1939_network","j1939_dropout","light_inop","general_electrical",
  "short_ground","short_power","open_circuit","voltage_drop","intermittent","power_loss"
]);
const electricalTerms = /\b(j1939|can\s*(?:bus|high|low|h|l)|data.?link|communication dropout|controller offline|voltage drop|short to ground|short to power|open circuit|high resistance|harness|connector|power feed|ground path|electrical fault)\b/i;
const powertrainTerms = /\b(engine|after.?treatment|dpf|scr|def|doser|regen|regeneration|turbo|boost|fuel pressure|rail pressure|injector|misfire|coolant|transmission|mdrive|i.?shift|clutch|gearbox|drivetrain|derate|torque loss)\b/i;
const stopWords = new Set(["with","from","that","this","when","where","what","have","been","were","will","your","into","then","than","only","both","after","before","under","over","there","their","they","them","does","did","could","would","should","fault","issue","case","test","check","reading","actual","vehicle","truck","engine","system","module","modules","found","not","yes","and","for","the"]);

function textForCase(record = {}) {
  const entries = Object.values(record.entries || {});
  const evidence = entries.flatMap(entry => [
    entry?.choice, entry?.notes, entry?.measurements?.actual,
    entry?.measurements?.testPoints, entry?.measurements?.condition,
    ...(Array.isArray(entry?.faultCodes) ? entry.faultCodes.flatMap(f => [f.code,f.controller,f.description]) : [])
  ]);
  return [record.complaint, record.rootCause, record.repairPerformed, record.workflowId, ...evidence]
    .map(clean).filter(Boolean).join(" ");
}
function getSystem(record = {}) {
  const id = clean(record.workflowId);
  if (electricalWorkflowIds.has(id)) return "electrical";
  const category = lower(powertrainWorkflows[id]?.category);
  if (/engine|after.?treatment|drivetrain|powertrain|fuel|cooling|transmission/.test(category)) return "powertrain";
  if (/network|electrical/.test(category)) return "electrical";
  return "general";
}
function specialistFor(system) {
  if (system === "electrical") return {
    id:"wiringhound", name:"WiringHound specialist",
    scope:"Electrical circuits, power and ground, harness faults, lighting and J1939/CAN networks."
  };
  if (system === "powertrain") return {
    id:"powertrain", name:"Powertrain specialist",
    scope:"Engine performance, fuel and air, cooling, aftertreatment, transmission and drivetrain."
  };
  return {id:"general",name:"General diagnostic coordinator",scope:"Vehicle context, symptom definition and evidence quality."};
}
function summarizeEvidence(entries = {}) {
  const rows = Object.entries(entries).map(([stepId, entry]) => ({stepId, ...(entry || {})}));
  const observed = rows.filter(row => populated(row.choice));
  const measured = rows.filter(row => {
    const m = row.measurements || {};
    return [m.actual,m.testPoints,m.condition,m.canH,m.canL,m.voltage,m.resistance]
      .some(populated);
  });
  const notes = rows.filter(row => populated(row.notes));
  const faultCodes = rows.flatMap(row => Array.isArray(row.faultCodes) ? row.faultCodes : []);
  return {
    stagesWithObservations:observed.length,
    stagesWithMeasurements:measured.length,
    stagesWithNotes:notes.length,
    faultCodeCount:faultCodes.length,
    observations:observed.map(row => ({stepId:row.stepId,choice:clean(row.choice)})),
    faultCodes:faultCodes.map(f => clean(f.code)).filter(Boolean)
  };
}
function recommendationEvidence(record = {}, steps = [], recommendation = {}) {
  const entries = record.entries || {};
  const rows = Object.entries(entries).map(([stepId, entry], index) => {
    const step = steps.find(item => item.id === stepId);
    const measurements = entry?.measurements || {};
    const faultCodes = Array.isArray(entry?.faultCodes) ? entry.faultCodes : [];
    const actual = clean(measurements.actual);
    const condition = clean(measurements.condition);
    const testPoints = clean(measurements.testPoints);
    const notes = clean(entry?.notes);
    const choice = clean(entry?.choice);
    const hasDetails = [choice, actual, condition, testPoints, notes].some(Boolean) || faultCodes.length > 0;
    return {
      stepId, stepTitle:step?.title || stepId, index,
      timestamp:Date.parse(entry?.updatedAt || entry?.recordedAt || "") || 0,
      choice, condition, testPoints, actual, notes,
      faultCodes:faultCodes.map(item => clean(item.code)).filter(Boolean),
      hasDetails
    };
  }).filter(row => row.hasDetails);
  rows.sort((a,b) => (a.timestamp && b.timestamp && a.timestamp !== b.timestamp)
    ? a.timestamp - b.timestamp : a.index - b.index);
  const trail = rows.slice(-4).map(row => ({
    stepId:row.stepId,stepTitle:row.stepTitle,observation:row.choice,
    condition:row.condition,testPoints:row.testPoints,actual:row.actual,
    notes:row.notes,faultCodes:row.faultCodes
  }));
  const latest = trail[trail.length - 1] || null;
  const measurementSummary = latest
    ? [latest.condition && "Condition: " + latest.condition,
       latest.testPoints && "Test points: " + latest.testPoints,
       latest.actual && "Measured: " + latest.actual,
       latest.faultCodes.length && "Fault codes: " + latest.faultCodes.join(", ")]
      .filter(Boolean).join(" · ")
    : "";
  let explanation;
  if (recommendation.state === "hold") {
    const currentStepId = steps[Math.max(0,Math.min(Number(record.currentStep)||0,steps.length-1))]?.id;
    const priorObserved = rows.filter(row => row.choice && row.stepId !== currentStepId).slice(-1)[0];
    if (priorObserved && recommendation.stepId === currentStepId) {
      const priorDetails = [priorObserved.condition && "Condition: " + priorObserved.condition,
        priorObserved.testPoints && "Test points: " + priorObserved.testPoints,
        priorObserved.actual && "Measured: " + priorObserved.actual,
        priorObserved.faultCodes.length && "Fault codes: " + priorObserved.faultCodes.join(", ")]
        .filter(Boolean).join(" · ");
      explanation = "The previous completed finding in " + priorObserved.stepTitle + " was: " + priorObserved.choice + "." +
        (priorDetails ? " " + priorDetails + "." : "") +
        " That finding leads the workflow to " + (clean(steps.find(step => step.id === recommendation.stepId)?.title) || recommendation.stepId) +
        " as the next check. This stage is still open because no result has been recorded here yet; perform the check and record what actually happens. The earlier finding guides the next test but does not prove a failed component.";
    } else {
      explanation = "IronKnuckle is holding this stage because " + clean(recommendation.reason).replace(/[.!?]+$/, "") + ".";
      if (latest) explanation += " The latest saved details are shown below; they are not treated as a completed test result.";
    }
  } else if (recommendation.state === "review") {
    explanation = clean(recommendation.action) ||
      "The recorded workflow has reached a review point. Confirm the physical cause, repair and repeat-test evidence before closing the case.";
  } else if (latest) {
    explanation = "The latest recorded finding is from " + latest.stepTitle + ": " +
      (latest.observation || "details recorded without a selected observation") + "." +
      (measurementSummary ? " " + measurementSummary + "." : "") +
      " Based on that finding, the workflow rule recommends " +
      (clean(steps.find(step => step.id === recommendation.stepId)?.title) || recommendation.stepId) +
      ": " + clean(recommendation.reason).replace(/[.!?]+$/, "") + ".";
  } else {
    explanation = "No completed test finding is available yet. Start with the first stage and record the actual observation before relying on a branch recommendation.";
  }
  return {explanation,latestFinding:latest,evidenceTrail:trail};
}
function evidenceQuality(record, evidence) {
  if (record.verification === "verified" && populated(record.rootCause) && populated(record.repairPerformed))
    return {state:"technician-verified-outcome",label:"Technician marked repair verified",note:"This is a technician-recorded outcome, not automatically peer-reviewed or OEM-certified."};
  if (!evidence.stagesWithObservations && !evidence.stagesWithMeasurements)
    return {state:"not-started",label:"No test observations recorded",note:"Begin with the complaint and baseline conditions."};
  if (record.status === "ready-for-review" || record.status === "completed" || record.status === "confirmed")
    return {state:"review-needed",label:"Outcome needs review",note:"Check physical evidence, repair details and repeat-test results before reusing this case as knowledge."};
  return {state:"in-progress",label:"Evidence still developing",note:"Unrecorded or ambiguous stages remain unknown; they are not treated as passing tests."};
}
function crossSystemSignals(record, system) {
  const text = textForCase(record);
  const signals = [];
  if (system === "powertrain" && electricalTerms.test(text)) {
    signals.push({
      id:"electrical-review",system:"electrical",title:"Consider an electrical / network handoff",
      why:"The complaint or recorded evidence mentions an electrical, power/ground, harness or communication condition.",
      action:"If supported by the actual symptoms, verify power, grounds, connectors, network integrity and controller communication in WiringHound. Do not assume an electrical fault is the cause."
    });
  }
  if (system === "electrical" && powertrainTerms.test(text)) {
    signals.push({
      id:"powertrain-review",system:"powertrain",title:"Consider a powertrain-side review",
      why:"The complaint or recorded evidence also mentions an engine, aftertreatment, transmission or drivetrain condition.",
      action:"If the electrical checks do not explain the complaint, review the matching powertrain workflow and relevant operating data. Do not assume the powertrain component is faulty."
    });
  }
  return signals;
}
function tokens(text) {
  return [...new Set(lower(text).split(/[^a-z0-9]+/).filter(t => t.length > 3 && !stopWords.has(t)))];
}
function caseFaultCodes(record = {}) {
  return (record.entries ? Object.values(record.entries) : [])
    .flatMap(entry => Array.isArray(entry?.faultCodes) ? entry.faultCodes : [])
    .map(f => lower(f.code).replace(/\s+/g, ""))
    .filter(Boolean);
}
function caseSymptomText(record = {}) {
  return [record.complaint, powertrainWorkflows[record.workflowId]?.title]
    .map(clean).filter(Boolean).join(" ");
}
function verifiedCaseMatches(current, candidates = []) {
  const currentSystem = getSystem(current);
  const currentCodes = new Set(caseFaultCodes(current));
  const currentTokens = tokens(caseSymptomText(current));
  const currentVehicle = current.vehicle || {};
  return candidates.filter(candidate => candidate && candidate.id !== current.id &&
      candidate.verification === "verified" && populated(candidate.rootCause) &&
      populated(candidate.repairPerformed))
    .map(candidate => {
      const candidateSystem = getSystem(candidate);
      if (candidateSystem !== currentSystem) return null;
      const candidateCodes = caseFaultCodes(candidate);
      const matchingCodes = [...currentCodes].filter(code => candidateCodes.includes(code));
      const candidateTokens = tokens(caseSymptomText(candidate));
      const overlap = currentTokens.filter(token => candidateTokens.includes(token));
      const vehicle = candidate.vehicle || {};
      const sameMake = populated(currentVehicle.make) && lower(currentVehicle.make) === lower(vehicle.make);
      const sameModel = populated(currentVehicle.model) && lower(currentVehicle.model) === lower(vehicle.model);
      const sameEngine = populated(currentVehicle.engine) && lower(currentVehicle.engine) === lower(vehicle.engine);
      const sameWorkflow = populated(current.workflowId) && current.workflowId === candidate.workflowId;
      const sameVehicleFamily = sameMake && sameModel;
      const exactFaultMatch = matchingCodes.length > 0;
      const symptomMatch = overlap.length >= 3 && sameWorkflow &&
        (sameEngine || sameVehicleFamily || overlap.length >= 5);
      if (!exactFaultMatch && !symptomMatch) return null;
      const matchReason = exactFaultMatch
        ? "Exact fault code match (" + matchingCodes.join(", ") + ") in the same diagnostic system."
        : "Same diagnostic workflow with " + overlap.length + " shared symptom terms" +
          ((sameEngine || sameVehicleFamily) ? " and matching vehicle/engine context." : ".");
      const score = (exactFaultMatch ? 100 : 0) + overlap.length +
        (sameMake ? 2 : 0) + (sameModel ? 3 : 0) + (sameEngine ? 4 : 0);
      return {
        id:candidate.id,
        title:[vehicle.year,vehicle.make,vehicle.model,vehicle.engine].filter(Boolean).join(" ") ||
          clean(candidate.complaint).slice(0,80) || "Verified case",
        rootCause:clean(candidate.rootCause),
        repairPerformed:clean(candidate.repairPerformed),
        matchingCodes,
        sharedTerms:overlap.slice(0,6),
        sameVehicleFamily,
        sameEngine,
        sameSystem:true,
        matchReason,
        score,
        sourceSystem:candidateSystem,
        caveat:"Reference only. Confirm exact configuration, test conditions and physical evidence; a prior repair is not proof of the current cause."
      };
    })
    .filter(Boolean)
    .sort((a,b) => b.score-a.score)
    .slice(0,3);
}
function shutdownRecommendation(record, steps) {
  const entries=record.entries||{};
  const completed=steps.map((step,index)=>({step,index,entry:entries[step.id]||{}}))
    .filter(item=>populated(item.entry.choice));
  const latest=completed.at(-1);
  if(!latest) return {
    stepId:steps[0]?.id,reason:"No shutdown test result has been recorded yet.",
    action:"Start by documenting whether the engine cuts cleanly, hesitates, resets the dash, and whether temperature or vibration changes the event.",
    state:"hold"
  };
  const answer=clean(latest.entry.choice).toLowerCase();
  const go=(id,reason,action)=>({stepId:id,reason,action,state:"next"});
  const hold=(reason,action)=>({stepId:latest.step.id,reason,action,state:"hold"});
  const next=id=>steps.find(item=>item.id===id);
  if(latest.step.id==="shutdown_pattern"){
    if(answer.includes("not yet reproduced")||answer.includes("behavior unclear"))
      return hold("The shutdown pattern has not been established.","Capture whether the engine cuts cleanly or hesitates, whether the dash resets, operating temperature/load and restart behavior. Reproduce only in a safe controlled setting before selecting a component.");
    return go("engine_architecture","The shutdown behavior is characterized.","Identify the exact engine model/serial, fuel system and electronic or mechanical control architecture from the data plate and authorized service information.");
  }
  if(latest.step.id==="engine_architecture"){
    if(answer.includes("unknown")||answer.includes("unavailable")||answer.includes("not identified"))
      return hold("The engine/control architecture is not confirmed.","Pause system-specific testing. Identify the engine and control family from the data plate and authorized service information; do not guess at sensor type, pinout or test values.");
    if(answer.includes("positively identified"))
      return go("shutdown_fault_scan","The engine/control architecture is positively identified.","Capture active and inactive controller faults and event data before clearing anything. No warning lamp does not rule out stored faults.");
    return hold("The engine/control architecture is not proven.","Confirm the engine serial/model and whether fuel/shutdown control is electronic or mechanical before selecting a system-specific test.");
  }
  if(latest.step.id==="shutdown_fault_scan"){
    if(answer.includes("relevant engine speed")||answer.includes("timing")||answer.includes("synchronization fault"))
      return hold("An engine speed/timing/synchronization fault is present and needs its own fault-specific diagnosis.","Attach the exact code, controller, status and event data. Follow the matching OEM fault tree and correlate the fault timestamp with the shutdown before moving to power/ground or fuel tests.");
    if(answer.includes("ecm power")||answer.includes("ignition")||answer.includes("communication fault"))
      return hold("The ECM power/ignition/voltage/communication path is implicated.","Use WiringHound General Electrical or J1939 Network as appropriate. Verify ECM power, grounds, switched feeds and communication at the exact boundaries under load; do not condemn the ECM before its feeds and network are proven.");
    if(answer.includes("fuel-control")||answer.includes("shutdown-device"))
      return hold("A fuel-control or shutdown-device fault is present.","Use the confirmed engine/fuel-system architecture and the matching OEM fault tree to test command, supply and actual device response. Never bypass the shutdown device.");
    if(answer.includes("no relevant faults found")&&answer.includes("scan completed"))
      return go("power_ground_integrity","The complete scan found no relevant fault that explains the shutdown.","Verify battery, engine and ECM power/ground paths with loaded voltage-drop tests at the exact OEM test points.");
    if(answer.includes("controller unavailable")||answer.includes("scan incomplete"))
      return hold("The controller scan is incomplete or the engine controller is unavailable.","Restore compatible diagnostic communication and repeat the scan. Record whether the ECM loses power or communication during the event; no warning lamp does not prove there are no stored faults.");
    return hold("The shutdown fault scan has not produced a conclusive result.","Complete the full compatible controller scan, attach all codes and event data, and identify whether the ECM remains online during shutdown.");
  }
  if(latest.step.id==="power_ground_integrity"){
    if(answer.includes("abnormal")||answer.includes("unstable")||answer.includes("excessive drop"))
      return hold("A power or ground abnormality was found; downstream sensor and fuel-control conclusions may be unreliable.","Localize the affected cable, eyelet, stud, splice, fuse, relay or ground path. Repair only the confirmed defect, then repeat the same loaded voltage-drop test before advancing.");
    if(answer.includes("not tested")||answer.includes("unavailable"))
      return hold("Power and ground integrity has not been established.","Obtain the correct diagram, test points and OEM limits, then perform loaded checks. Do not treat visual inspection or unloaded continuity as proof.");
    if(answer.includes("verified within exact oem limits under load")||answer.includes("connection repaired; repeat loaded test now passes"))
      return go("engine_speed_timing_signal","Power and ground paths have been verified under load.","Monitor engine RPM/synchronization and the correct timing signal during the failure window. Check connector retention and harness condition without assuming a sensor type or generic resistance value.");
    return hold("The ECM power/ground checks are inconclusive.","Record the loaded test points, meter lead locations, actual voltage drops and exact OEM limits before moving to timing or fuel-control tests.");
  }
  if(latest.step.id==="engine_speed_timing_signal"){
    if(answer.includes("drops out")||answer.includes("implausible"))
      return hold("Timing/speed evidence is abnormal during the event.","Localize the signal loss with the correct wiring diagram and approved test method. Identify sensor type before testing; repair the confirmed circuit defect and repeat the signal check. Do not replace the sensor solely from the symptom.");
    if(answer.includes("connector, terminal or harness defect physically found"))
      return hold("A connector, terminal or harness defect is visible but has not yet been repaired and retested.","Localize the exact terminal or harness damage, complete the approved repair and repeat the same signal test through the original shutdown conditions. Do not replace the sensor unless the OEM test proves it failed.");
    if(answer.includes("connector")&&answer.includes("defect repaired")&&answer.includes("signal retest passes"))
      return go("shutdown_repair_verification","The timing-signal connector/harness defect was repaired and the signal retest passed.","Repeat the original shutdown conditions and verify the engine remains running, ECM communication stays stable and no relevant faults return.");
    if(answer.includes("signal remains stable through the shutdown event"))
      return go("fuel_control_delivery","Timing/speed data remained stable through the shutdown event.","Evaluate fuel-control command/actual operation and fuel delivery using the confirmed engine/fuel-system architecture and exact OEM procedure.");
    if(answer.includes("data unavailable")||answer.includes("event not reproduced"))
      return hold("The timing/speed signal has not been evaluated through the failure event.","Capture the correct live data or approved signal test during the cold/warm failure window. Record if the controller remains online; a normal reading outside the event does not clear an intermittent signal.");
    return hold("The timing/speed signal result is inconclusive.","Use the exact engine-specific procedure and capture the signal through the shutdown event before moving to fuel-control tests.");
  }
  if(latest.step.id==="fuel_control_delivery"){
    if(answer.includes("command")&&answer.includes("drops out"))
      return hold("Fuel-control command or actual shutdown-device actuation drops out.","Compare command and actual response at the device using the exact control architecture and wiring diagram. Verify its power, ground, command and mechanical response; never bypass a shutdown device.");
    if(answer.includes("fuel delivery outside"))
      return hold("Fuel delivery is outside the exact engine-specific specification.","Follow the confirmed fuel-system pinpoint procedure to distinguish supply restriction, air ingress, filter, pump or control faults. Record the test point and OEM limit; do not apply generic fuel-pressure values.");
    if(answer.includes("defect isolated and repaired")&&answer.includes("retest passes"))
      return go("shutdown_repair_verification","A fuel-control/delivery defect was isolated, repaired and retested successfully.","Repeat the original cold/warm and load conditions when safe, then confirm the shutdown does not recur and the controller scan remains clear.");
    if(answer.includes("remain stable within applicable criteria"))
      return hold("Fuel-control and delivery checks appear normal, but the shutdown cause remains unresolved.","Do not advance to repair verification. Continue the exact OEM unexpected-shutdown pinpoint procedure using the event data and remaining engine-control/mechanical evidence; preserve what has been ruled out.");
    if(answer.includes("not tested")||answer.includes("unavailable"))
      return hold("Fuel control and delivery have not been verified.","Confirm architecture and authorized specifications before testing the shutoff device, fuel pressure, restriction or air ingress.");
    return hold("Fuel-control and delivery results are inconclusive.","Use the confirmed engine/fuel-system architecture and OEM pinpoint procedure; do not bypass shutdown devices or infer a failed part.");
  }
  if(latest.step.id==="shutdown_repair_verification"){
    if(answer.includes("original shutdown condition no longer occurs")&&answer.includes("repair verified"))
      return {stepId:latest.step.id,reason:"The original shutdown condition no longer occurs and the repair has been verified.",action:"Review the before/after evidence and confirm the original cold/warm/load conditions were repeated. Promote the case only with a supported cause and documented verification.",state:"review"};
    if(answer.includes("symptom still occurs"))
      return hold("The engine still shuts down after the attempted repair.","The cause is not resolved. Preserve the new event data and return to the earliest test that did not pass or the next OEM pinpoint branch; do not repeat the same repair without new evidence.");
    if(answer.includes("retest incomplete")||answer.includes("original conditions not repeated")||answer.includes("cause remains unconfirmed"))
      return hold("The shutdown repair has not been verified under the original failure conditions.","Keep the case open. Repeat the original cold/warm, load and vibration conditions when safe, complete the loaded electrical checks and post-repair scan, and document any remaining unknowns.");
    return hold("The shutdown verification result is incomplete.","Do not close the case until the original symptom has been retested and the cause/repair are supported by evidence.");
  }
  return hold("The unexpected-shutdown workflow step is not recognized.","Return to the active shutdown step and verify that the correct workflow version is loaded.");
}
function powertrainRecommendation(record, steps) {
  if (!Array.isArray(steps) || !steps.length) return null;
  const entries = record.entries || {};
  const recorded = steps.map((step,index)=>({step,index,entry:entries[step.id]||{}}))
    .filter(item=>populated(item.entry.choice) || Object.values(item.entry.measurements||{}).some(populated) || populated(item.entry.notes))
    .sort((a,b)=>{
      const ta=Date.parse(a.entry.updatedAt||a.entry.recordedAt||"");
      const tb=Date.parse(b.entry.updatedAt||b.entry.recordedAt||"");
      return Number.isFinite(ta)&&Number.isFinite(tb)&&ta!==tb ? ta-tb : a.index-b.index;
    });
  const latest = recorded.at(-1);
  if (!latest) {
    const first=steps[0];
    return {stepId:first.id,reason:"No test result has been recorded yet.",action:"Start with this test. Record the actual observation, test conditions, measurement, units and applicable specification.",state:"hold"};
  }
  const {step,index,entry}=latest;
  const choice=lower(entry.choice);
  const detail=lower([entry.notes,entry.measurements?.actual,entry.measurements?.condition,entry.measurements?.testPoints].filter(Boolean).join(" "));
  const resultText=choice+" "+detail;
  const hold=(reason,action)=>({stepId:step.id,reason,action,state:"hold"});
  const next=steps[index+1];
  const go=(target,reason,action)=>({stepId:target.id,reason,action,state:"next"});
  // Check Engine Light requires an attached scan and a reviewed primary fault before testing.
  if(record.workflowId==="check_engine_light"){
    if(step.id==="complaint"){
      if(/check engine light confirmed on; fault code\(s\) retrieved and attached/i.test(choice)){
        const attachedFaults=Object.values(record.entries||{}).flatMap(item=>Array.isArray(item?.faultCodes)?item.faultCodes:[]);
        if(!attachedFaults.length) return hold(
          "The selected result says fault codes were retrieved and attached, but no fault-code records are attached to this case.",
          "Use the FAULT CODES / SCAN DATA panel to add or import the actual codes. Include reporting controller and active/inactive status, then repeat this step. Do not proceed using a statement that codes were attached when the case contains none."
        );
        return go(steps.find(item=>item.id==="prioritize"),"The Check Engine Light is confirmed and the case contains attached fault-code evidence.","Review all attached codes together, including controller, status and event data. Identify the primary fault before selecting a component test.");
      }
      if(/check engine light on; scan attempted but no fault codes retrieved/i.test(choice)) return hold(
        "The lamp is on, but the scan did not retrieve any fault codes.",
        "Record which controllers were scanned and which could not communicate. Verify diagnostic-tool connection and controller power/communication as appropriate, then repeat the complete scan. Do not invent a fault code or start a code-specific test without one."
      );
      if(/check engine light not illuminated/i.test(choice)) return hold(
        "The Check Engine Light and related warning were not reproduced.",
        "Clarify the driver's actual complaint and preserve any event history. If the concern is not a warning-lamp/fault-code complaint, use the appropriate complaint-triage or subsystem workflow instead of continuing this CEL path."
      );
      if(/unable to verify lamp or complete scan/i.test(choice)) return hold(
        "The lamp state or complete controller scan has not been verified.",
        "Complete the lamp check and full scan, record the controllers covered and attach the scan report. An incomplete scan is not a no-fault result."
      );
    }
    if(step.id==="prioritize"){
      if(/one fault clearly leads the investigation/i.test(choice))
        return go(steps.find(item=>item.id==="test"),"A primary fault candidate has been identified from the attached evidence.","Open the matching code-specific guided path or current OEM fault tree. Verify the exact engine/calibration applicability before performing the first pinpoint test.");
      if(/several faults appear related/i.test(choice)) return hold(
        "Several attached faults appear related and the primary fault has not been established.",
        "Compare timestamps, occurrence counts, reporting controllers, freeze-frame and symptom correlation. Separate primary faults from consequence codes; select the earliest/most directly supported fault before proceeding."
      );
      if(/shared power \/ ground \/ network issue/i.test(choice)) return hold(
        "The fault pattern points to a shared electrical supply, ground or network issue.",
        "Stop the generic engine fault test. Use WiringHound General Electrical or J1939 Network as appropriate, attach the affected controllers/codes and verify the shared feed or network boundary before returning to engine-specific diagnosis."
      );
      if(/evidence does not yet identify a direction/i.test(choice)) return hold(
        "The attached fault data does not yet identify a defensible primary direction.",
        "Review freeze-frame/event data, reporting controller, fault status and symptom timing. Obtain the missing vehicle-specific information or use the code-specific OEM fault tree; do not select a component by code description alone."
      );
    }
    if(step.id==="test"){
      if(/fault isolated and repaired per oem procedure/i.test(choice))
        return go(steps.find(item=>item.id==="verify"),"The fault was isolated and repaired using the applicable OEM procedure.","Repeat the original operating conditions, verify the warning and symptom are resolved, and rescan the relevant controllers. Preserve before/after measurements.");
      if(/test confirms a physical \/ circuit fault/i.test(choice)) return hold(
        "A physical or circuit fault is indicated, but the repair has not yet been completed and verified.",
        "Localize the exact defect with the OEM pinpoint test. Record the failed measurement, connector/pin or circuit boundary and applicable limit; repair only the confirmed defect, then select the repaired result."
      );
      if(/test points to a different system/i.test(choice)) return hold(
        "The test evidence points to a different system than the current fault path.",
        "Stop this fault-specific sequence and open the correct system workflow or matching DTC path. Attach the test result and evidence supporting the new direction; do not continue the wrong fault tree."
      );
      if(/test results are within specification/i.test(choice)) return hold(
        "The performed test passed, but the Check Engine Light fault remains unresolved.",
        "Continue the next discriminating test in the current OEM fault tree. Record what the passing result rules out and what remains untested; do not treat one passing test as a completed diagnosis."
      );
      if(/required test or service information unavailable/i.test(choice)) return hold(
        "The required fault-specific test or service information is unavailable.",
        "Obtain the current OEM procedure and confirm engine/calibration applicability before continuing. Do not substitute generic limits or guess at connector pins."
      );
    }
    if(step.id==="verify"){
      if(/repair complete; verification pending|cause remains unconfirmed|no repair required/i.test(choice)) return hold(
        "The fault has not been verified as resolved under the original conditions.",
        "Keep the case open. Complete the repair or obtain the missing evidence, then repeat the original operating conditions and post-repair scan. Do not mark the case repaired while the warning or relevant fault remains unresolved."
      );
    }
  }
  // General complaint triage is a routing workflow, not a component-diagnosis shortcut.
  if(record.workflowId==="complaint_triage"){
    if(step.id==="complaint_baseline"){
      if(/driver description needs clarification/i.test(choice)) return hold(
        "The complaint is not specific enough to choose a reliable diagnostic path.",
        "Clarify the observable symptom with the driver: what happens, when it happens, what still works, warning messages and exact operating conditions. Do not guess at a subsystem."
      );
      if(/unable to reproduce; no event data available/i.test(choice)) return hold(
        "The complaint could not be reproduced and no event data is available.",
        "Obtain a more precise driver description and operating conditions. Reproduce only when safe, then capture the event data; do not continue with unsupported assumptions."
      );
      if(/complaint reproduced and conditions documented|intermittent pattern documented but not reproduced|unable to reproduce; event data available/i.test(choice))
        return go(steps.find(item=>item.id==="controller_scan"),"The complaint is sufficiently described or supported by stored event data.","Capture a complete scan of the relevant controllers and preserve exact codes, status and event data before selecting the next system.");
    }
    if(step.id==="controller_scan"){
      if(/relevant active fault\(s\) identified; not yet reviewed/i.test(choice)) return hold(
        "Relevant active faults have been found but have not been reviewed.",
        "Attach each code with source controller, active/inactive status and event data. Use the applicable code-specific guided path or OEM fault tree before continuing generic triage."
      );
      if(/multiple unrelated faults; primary not identified/i.test(choice)) return hold(
        "Multiple faults are present and the primary event has not been identified.",
        "Compare occurrence counts, timestamps, source controllers and freeze-frame data. Separate primary faults from secondary/consequence codes and select the earliest or most directly related fault for focused diagnosis."
      );
      if(/scan incomplete|controller not communicating/i.test(choice)) return hold(
        "The controller scan is incomplete.",
        "Restore communication with the missing controller(s), verify diagnostic-tool connection and repeat the complete scan. Do not treat an incomplete scan as no-fault evidence."
      );
      if(/active faults reviewed; no primary cause established|only inactive \/ historic faults|no relevant faults found after complete scan/i.test(choice))
        return go(steps.find(item=>item.id==="data_review"),"The available scan has been reviewed and no uninvestigated primary active fault remains.","Compare live data directly related to the complaint using the exact vehicle/engine/emissions specifications and original operating conditions.");
    }
    if(step.id==="data_review"){
      if(/data points toward a specific subsystem/i.test(choice))
        return go(steps.find(item=>item.id==="targeted_inspection"),"The measured data points toward a specific subsystem.","Select the dedicated workflow for that system and perform one discriminating OEM pinpoint test. Record the exact test location, value and applicable limit.");
      if(/data is implausible or inconsistent/i.test(choice)) return hold(
        "The live data is implausible or internally inconsistent.",
        "Compare the suspect parameter with related sensors and known operating conditions. Verify sensor power, ground, signal and network data only as directed by the OEM procedure; do not condemn a sensor from a plausibility concern alone."
      );
      if(/values appear within applicable specification/i.test(choice))
        return go(steps.find(item=>item.id==="targeted_inspection"),"The selected data appears within the applicable specification, but the complaint remains unresolved.","Inspect only the subsystem supported by the symptom and event history. If no subsystem is supported, return for more discriminating data rather than replacing parts.");
      if(/more data or vehicle information required/i.test(choice)) return hold(
        "The data review cannot be completed with the information available.",
        "Identify the missing vehicle configuration, parameter, operating condition or OEM specification. Obtain that information before selecting a component or test."
      );
    }
    if(step.id==="targeted_inspection"){
      if(/specific subsystem isolated for focused diagnosis/i.test(choice))
        return go(steps.find(item=>item.id==="triage_verify"),"A specific subsystem has been isolated for focused diagnosis.","Name the dedicated workflow or OEM fault tree and the next test. Preserve the supporting evidence and continue the focused diagnosis; this triage result does not prove a component failed.");
      if(/physical evidence found; cause not yet confirmed/i.test(choice)) return hold(
        "Physical evidence is present, but the cause has not been confirmed.",
        "Perform the subsystem-specific pinpoint test that proves whether the observed condition caused the complaint. Record measurements and OEM limits before recommending repair."
      );
      if(/no subsystem isolated/i.test(choice)) return hold(
        "The available evidence does not isolate a subsystem.",
        "Return to the complaint conditions and gather a discriminating live-data measurement or event record. Do not choose a system or component by guesswork."
      );
      if(/vehicle-specific information still needed/i.test(choice)) return hold(
        "Vehicle-specific information is still missing.",
        "Confirm the VIN/build, engine, emissions family, system variant and applicable service-document revision before using a test procedure or specification."
      );
    }
    if(step.id==="triage_verify"){
      if(/more evidence required|complaint not reproduced; follow-up needed/i.test(choice)) return hold(
        "The diagnostic direction is not yet supported by enough evidence.",
        "Keep the case open, identify the missing measurement or reproduction condition and continue the focused OEM diagnostic path. Do not mark a component failed."
      );
    }
  }
  // Engine low-power/derate is a powertrain path, separate from WiringHound vehicle power loss.
  if(record.workflowId==="engine_power_loss"){
    if(step.id==="conditions"){
      if(/complaint not reproduced; event data available/i.test(choice))
        return go(steps.find(item=>item.id==="codes"),"The low-power event is intermittent, but stored operating/event data is available.","Use the event data to identify load, RPM, speed, temperature and torque-limit state when power dropped. Capture the full controller scan and determine which controller requested derate.");
      if(/complaint not reproduced; no event data available/i.test(choice)) return hold(
        "The low-power complaint is not present and no event data is available.",
        "Obtain the driver's exact operating conditions and reproduce the concern only when safe. Capture load, RPM, speed, temperature, warning message and torque-limit state when it occurs; do not guess at a failed component."
      );
      return go(steps.find(item=>item.id==="codes"),"The low-power/derate operating conditions are defined.","Scan all relevant controllers and identify the source of any torque reduction or derate request before testing air or fuel components.");
    }
    if(step.id==="codes"){
      if(/active derate request identified; reason not isolated|relevant fault without derate; not yet diagnosed/i.test(choice)) return hold(
        "A derate request or relevant active fault is present, but its cause has not been isolated.",
        "Attach the fault codes and identify the requesting controller, torque limit, inhibit reason and event sequence. Follow the relevant code-specific OEM diagnostic path before proceeding to general air/fuel tests."
      );
      if(/controller data unavailable/i.test(choice)) return hold(
        "The source of the torque reduction cannot be established because controller data is unavailable.",
        "Restore communication with the missing controller(s), repeat the complete scan and retrieve torque-limit/derate request data. Do not assume the engine itself initiated the derate."
      );
      if(/active faults reviewed; no primary cause established|no active faults found after complete scan/i.test(choice))
        return go(steps.find(item=>item.id==="airfuel"),"The complete controller scan is reviewed and no uninvestigated primary active fault explains the power loss.","Compare the applicable air-path, turbo-control and fuel-supply data under the load/RPM conditions that produced the complaint.");
    }
    if(step.id==="airfuel"){
      if(choice==="original symptom resolved after confirmed correction") return go(steps.find(item=>item.id==="verify"),"The original symptom is reported resolved after correction.","Record the confirmed cause and complete the OEM post-repair verification under original conditions.");
      if(/air-path discrepancy/i.test(choice)) return go(steps.find(item=>item.id==="air_isolate"),
        "The air-path data does not agree with the expected engine operation.",
        "Use the exact engine-specific pinpoint procedure to distinguish intake restriction, charge-air leak, turbo actuator/control response and sensor plausibility. Compare commanded/actual values at the specified load and RPM; do not condemn the turbo from a boost discrepancy alone."
      );
      if(/fuel delivery discrepancy/i.test(choice)) return go(steps.find(item=>item.id==="delivery_isolate"),
        "The fuel-delivery data does not agree with the expected engine operation.",
        "Identify whether the discrepancy is on the low-pressure supply or high-pressure rail side, then follow the matching engine/serial-specific OEM test. Record the test point, commanded/actual values and operating conditions; do not replace a pump or injector from a broad symptom."
      );
      if(/sensor plausibility issue/i.test(choice)) return go(steps.find(item=>item.id==="plausibility_isolate"),
        "One or more engine sensor values may be implausible.",
        "Compare the suspect value with related sensors and known operating conditions using the OEM plausibility procedure. Verify sensor power, ground, signal and harness only as directed by the wiring diagram; record the measured values before considering replacement."
      );
      if(/no discrepancy identified/i.test(choice))
        return go(steps.find(item=>item.id==="exhaust"),"The reviewed air/fuel values agree with the applicable specification under the recorded conditions.","Review exhaust/after-treatment temperatures, differential pressure, regeneration state and fault data for a supported restriction or derate cause.");
    }
    if(["air_isolate","delivery_isolate","plausibility_isolate"].includes(step.id)){
      if(choice==="defect isolated and corrected") return go(steps.find(item=>item.id==="airfuel"),"A correction has been recorded.","Repeat the original data checks under the same conditions; select the actual result.");
      return hold("The indicated defect remains unverified or repair is pending.","Complete the authorized isolation and repair, or obtain the missing OEM procedure.");
    }
    if(step.id==="exhaust"){
      if(/aftertreatment issue supported by data/i.test(choice)) return hold(
        "The evidence points to an after-treatment fault or derate.",
        "Stop the generic engine power-loss sequence and open the Aftertreatment Fault workflow or the specific active-code guided path. Attach the supporting faults, temperatures, pressure and regeneration data; never force a regeneration or bypass an inhibit."
      );
      if(/exhaust restriction suspected/i.test(choice)) return hold(
        "The evidence suggests an exhaust restriction, but it has not been confirmed.",
        "Perform the exact engine/emissions-specific restriction test at the specified operating condition. Verify pressure sensor/tubes and compare measured values with the OEM limit; do not condemn the DPF or exhaust component from suspicion alone."
      );
      if(/values within specification but power loss unresolved/i.test(choice)) return hold(
        "The reviewed exhaust/after-treatment values are within specification, but the power-loss cause remains unresolved.",
        "Do not advance to repair verification without a confirmed cause. Capture additional event data and continue the OEM low-power pinpoint procedure for remaining air, fuel, engine-control or mechanical causes supported by the evidence."
      );
      if(/more data required/i.test(choice)) return hold(
        "The exhaust/after-treatment review is incomplete.",
        "Identify the missing sensor, pressure, regeneration or operating-condition data and obtain the exact engine/emissions-specific specification before proceeding."
      );
    }
    if(step.id==="verify"){
      if(/post-repair fault remains active|verification pending|cause unconfirmed|load verification not safe/i.test(choice)) return hold(
        "Power restoration has not been verified under the original load conditions or a related fault remains active.",
        "Keep the case open. Resolve the remaining fault or safety limitation, then complete the OEM post-repair scan and safe load verification. Do not claim the derate is repaired without evidence."
      );
    }
  }
  // Transmission/drivetrain decisions require measured evidence and safe verification.
  if(record.workflowId==="drivetrain_fault"){
    if(step.id==="complaint"){
      if(/complaint not reproduced; event data available/i.test(choice))
        return go(steps.find(item=>item.id==="codes"),"The symptom is intermittent, but stored event data is available.","Use the event record to identify the gear, speed, load and temperature at the time of failure. Capture the full transmission and related-controller scan before attempting a live test.");
      if(/complaint not reproduced; no event data available/i.test(choice)) return hold(
        "The reported drivetrain complaint is not present and no event data is available.",
        "Do not guess at a transmission fault. Obtain the operating details from the driver and reproduce the concern only when safe and under the OEM test conditions; capture event data when it occurs."
      );
      return go(steps.find(item=>item.id==="codes"),"The operating complaint is defined and ready for fault review.","Scan the transmission and related controllers. Record active/inactive status, event data and any torque or shift inhibits before choosing a component test.");
    }
    if(step.id==="codes"){
      if(/relevant active fault\(s\) found; not yet diagnosed/i.test(choice)) return hold(
        "Relevant active transmission/drivetrain faults have not yet been evaluated.",
        "Attach the complete codes with reporting controller, status and event data. Follow the applicable code-specific OEM diagnostic path first; do not treat an active fault as a routine pass."
      );
      if(/related controller data unavailable/i.test(choice)) return hold(
        "The controller data needed to understand the event is unavailable.",
        "Restore communication with the missing controller, verify the diagnostic-tool connection and repeat the scan. Confirm whether a torque/shift inhibit or related controller fault is present before continuing."
      );
      if(/active faults reviewed; no primary cause established|only inactive \/ historic faults|no relevant faults retrieved after complete scan/i.test(choice))
        return go(steps.find(item=>item.id==="data"),"The complete scan has been reviewed and no uninvestigated primary active fault remains.","Compare commanded and actual gear, input/output speed, clutch state, torque request/inhibit and applicable pressure/temperature data under the original event conditions.");
    }
    if(step.id==="data"){
      if(/command and actual state disagree/i.test(choice)) return hold(
        "The transmission is not achieving the commanded operating state.",
        "Record the requested gear, actual gear, shift state and torque/shift inhibit source. Follow the exact transmission OEM pinpoint procedure to verify the relevant input signals, enable conditions and control outputs; do not condemn the TCM from a command/actual mismatch alone."
      );
      if(/speed \/ ratio evidence abnormal/i.test(choice)) return hold(
        "Input/output speed or gear-ratio evidence is abnormal.",
        "Compare input and output speed against the OEM ratio chart for the commanded gear and exact operating conditions. Verify the relevant speed-sensor signals and circuits using the correct diagram; do not apply a generic ratio or RPM threshold."
      );
      if(/pressure \/ temperature evidence abnormal/i.test(choice)) return hold(
        "Pressure or temperature data is outside the expected operating range.",
        "Use the exact transmission model/calibration procedure to verify the pressure or temperature measurement at the specified test point and operating state. Confirm sensor plausibility and fluid temperature; do not infer an internal failure from one data value."
      );
      if(/data agrees with expected operation/i.test(choice))
        return go(steps.find(item=>item.id==="inspection"),"The recorded commanded/actual data agrees with the expected operation, but the reported complaint still needs a targeted physical inspection.","Inspect only the subsystem implicated by the complaint and event history. Check fluid/leaks, external wiring/connectors, mounts and driveline components before considering internal transmission tests.");
      if(/more data required/i.test(choice)) return hold(
        "The transmission operating data is incomplete.",
        "Identify the missing commanded/actual parameter, operating condition or OEM specification. Capture the correct data under the original event conditions before moving to physical inspection."
      );
    }
    if(step.id==="inspection"){
      if(/defect isolated and corrected per oem procedure/i.test(choice))
        return go(steps.find(item=>item.id==="verify"),"The indicated driveline/transmission defect was isolated and corrected using the OEM procedure.","Complete the required setup/relearn if applicable, then verify operation under the original conditions when safe. Preserve before/after values and the post-repair scan.");
      if(/leak \/ fluid issue found/i.test(choice)) return hold(
        "A fluid or leak concern has been observed but is not yet isolated.",
        "Verify fluid type, level and condition using the exact transmission temperature and fill/check procedure. Locate the leak source and repair only the confirmed issue; do not overfill or substitute fluid."
      );
      if(/mechanical driveline defect found/i.test(choice)) return hold(
        "A mechanical driveline concern has been observed but is not yet localized.",
        "Secure the vehicle and isolate the affected joint, shaft, mount, bearing or driveline component using the OEM inspection procedure. Record the physical evidence and measurements before recommending repair."
      );
      if(/control \/ electrical issue indicated/i.test(choice)) return hold(
        "The evidence points to a transmission control or electrical issue.",
        "Use the correct wiring diagram and pinpoint test to verify module power/ground, network communication, relevant inputs and commanded outputs under load. Do not replace a controller until its feeds, grounds and inputs are proven."
      );
      if(/internal transmission concern supported/i.test(choice)) return hold(
        "The evidence may indicate an internal transmission concern, but it is not yet confirmed.",
        "Complete the OEM hydraulic, clutch or internal pinpoint tests for this transmission model and calibration. Record measured values and limits; do not recommend unit replacement from a symptom or generic data mismatch."
      );
      if(/no defect confirmed/i.test(choice)) return hold(
        "The inspection did not confirm a physical cause while the drivetrain complaint remains unresolved.",
        "Return to the primary fault/event data and complete the next discriminating OEM test. Do not close the case or recommend transmission replacement by elimination."
      );
    }
    if(step.id==="verify"){
      if(/post-repair fault remains active/i.test(choice)) return hold(
        "A related transmission/drivetrain fault remains active after repair.",
        "Keep the case open. Preserve the post-repair scan and return to the applicable OEM code-specific diagnostic path to determine why the fault remains."
      );
      if(/repair complete; verification pending|cause remains unconfirmed|road test \/ verification not yet safe/i.test(choice)) return hold(
        "The repair has not been verified under the original conditions or the vehicle is not safe for a road test.",
        "Do not mark the repair complete. Resolve the safety concern or obtain the approved stationary verification method, then complete the OEM post-repair checks and document any deferred test."
      );
    }
  }
  // After-treatment paths must distinguish fault priority, data anomalies and repair verification.
  if(record.workflowId==="aftertreatment_fault"){
    if(step.id==="complaint"){
      if(/complaint not currently present; event data available/i.test(choice))
        return go(steps.find(item=>item.id==="codes"),"The symptom is not active now, but stored event data is available for diagnosis.","Use the stored event/freeze-frame data and the operating conditions when the fault occurred. Capture the complete controller scan and correlate fault timestamps before selecting live tests.");
      if(/complaint not currently present/i.test(choice)) return hold(
        "The after-treatment complaint is not currently active or reproducible.",
        "Preserve the event/freeze-frame data, driver message and conditions when the fault occurred. Do not force a regeneration or advance on an unverified symptom; reproduce the complaint only under the OEM-approved conditions."
      );
      return go(steps.find(item=>item.id==="codes"),"The after-treatment complaint is defined and ready for controller-fault review.","Capture the complete scan, reporting controller, active/inactive status, occurrence count and freeze-frame/event data. Identify primary faults before selecting component tests.");
    }
    if(step.id==="codes"){
      if(/active after-treatment fault\(s\) present; not yet diagnosed/i.test(choice)) return hold(
        "Primary active after-treatment faults have not yet been evaluated.",
        "Attach every relevant SPN/FMI or OEM code with controller and status. Run the matching code-specific guided diagnostic or current OEM fault tree before continuing this generic path. Do not treat active codes as a routine pass."
      );
      if(/multiple related faults; primary not identified/i.test(choice)) return hold(
        "Multiple related faults are present and the primary fault has not been identified.",
        "Review event order, occurrence counts, controller source and freeze-frame data. Separate primary faults from consequence codes and diagnose the primary code first; preserve all related codes in the case."
      );
      if(/scan incomplete|controller not communicating/i.test(choice)) return hold(
        "The after-treatment fault picture is incomplete.",
        "Restore communication with the missing controller(s), verify the diagnostic-tool connection and repeat the complete OEM-designated scan. Do not infer that no relevant faults exist from an incomplete scan."
      );
      if(/active faults reviewed; no primary cause established|only inactive \/ historic faults|no relevant faults found after complete scan/i.test(choice))
        return go(steps.find(item=>item.id==="data"),"The complete scan has been reviewed and no uninvestigated primary active fault remains.","Compare the applicable sensor, pressure, dosing and regeneration data under the exact operating conditions and calibration-specific limits.");
    }
    if(step.id==="data"){
      if(choice==="original symptom resolved after confirmed correction") return go(steps.find(item=>item.id==="verify"),"The original symptom is reported resolved after correction.","Record the confirmed cause and complete the OEM post-repair verification under original conditions.");
      if(/sensor or data plausibility concern/i.test(choice)) return go(steps.find(item=>item.id==="after_sensor_isolate"),
        "One or more after-treatment sensor values may be implausible.",
        "Compare the suspect value with related sensors and ambient/engine conditions using the OEM plausibility test. Verify the sensor's wiring, connector, supply and ground only as directed by the wiring diagram; record actual values and limits before considering replacement."
      );
      if(/pressure \/ restriction evidence/i.test(choice)) return go(steps.find(item=>item.id==="after_pressure_isolate"),
        "The data indicates a possible exhaust or after-treatment restriction.",
        "Verify the differential-pressure sensor and both pressure tubes/ports for blockage, damage, leaks or incorrect routing. Compare the measured pressure with the exact OEM limit at the specified engine speed/load and regeneration state; do not condemn the DPF from a single reading."
      );
      if(/dosing \/ def system concern/i.test(choice)) return go(steps.find(item=>item.id==="after_dosing_isolate"),
        "The dosing/DEF data indicates a possible supply, quality or control concern.",
        "Follow the engine-specific DEF/dosing pinpoint procedure. Verify fluid quality and level, tank temperature where relevant, commanded dosing, supply pressure and electrical control using OEM limits. Do not command a dosing test or replace the doser unless the procedure authorizes it."
      );
      if(/values appear within specification/i.test(choice))
        return go(steps.find(item=>item.id==="inspection"),"The reviewed data is within the applicable specification, but the complaint still needs a physical/evidence check.","Inspect only the subsystem implicated by the original codes and event data. Look for exhaust leaks, tube/port issues, connector or harness damage, DEF supply condition or other documented evidence.");
      if(/more data required/i.test(choice)) return hold(
        "The after-treatment data review is incomplete.",
        "Identify the missing parameter, operating condition or OEM specification. Capture the correct commanded/actual values and event data before moving to physical inspection."
      );
    }
    if(["after_sensor_isolate","after_pressure_isolate","after_dosing_isolate"].includes(step.id)){
      if(choice==="defect isolated and corrected") return go(steps.find(item=>item.id==="data"),"A correction has been recorded.","Repeat the original data checks under the same conditions; select the actual result.");
      return hold("The indicated defect remains unverified or repair is pending.","Complete the authorized isolation and repair, or obtain the missing OEM procedure.");
    }
    if(step.id==="inspection"){
      if(/defect isolated and corrected per oem procedure/i.test(choice))
        return go(steps.find(item=>item.id==="verify"),"The indicated defect was isolated and corrected using the OEM procedure.","Perform only the authorized post-repair routine. Re-scan the relevant controllers and repeat the original operating conditions to confirm the fault does not return.");
      if(/physical defect found|leak \/ restriction evidence found|electrical or connector concern found/i.test(choice)) return hold(
        "A physical, leak/restriction or electrical concern has been observed but is not yet isolated and verified.",
        "Localize the exact defect with the relevant OEM pinpoint test. Record the location, measurement and evidence; repair only the confirmed defect, then select the corrected option after the repair is complete. Do not replace a component based on a broad inspection finding."
      );
      if(/no physical defect confirmed/i.test(choice)) return hold(
        "The inspection did not confirm a physical cause while the after-treatment complaint remains unresolved.",
        "Do not close the case or replace parts by elimination. Return to the primary DTC's current OEM fault tree and complete the next discriminating test using the correct calibration-specific limits."
      );
      if(/inspection incomplete/i.test(choice)) return hold(
        "The indicated subsystem inspection is incomplete.",
        "Complete the OEM-directed inspection and record the actual location, condition and test result. An incomplete inspection is not a pass."
      );
    }
    if(step.id==="verify"){
      if(/post-repair fault remains active/i.test(choice)) return hold(
        "The original or a related after-treatment fault remains active after repair.",
        "Do not close the case as repaired. Preserve the post-repair scan and event data, then return to the applicable code-specific OEM diagnostic path to identify why the fault remains."
      );
      if(/repair complete; verification pending|cause remains unconfirmed|procedure inhibited \/ not authorized/i.test(choice)) return hold(
        "The after-treatment repair has not been fully verified or the required service procedure is inhibited.",
        "Keep the case open. Confirm all OEM enable conditions and complete the authorized post-repair verification; never force a regeneration or bypass an inhibit. Record the remaining unknowns."
      );
    }
  }
  // Crank/no-start is a staged powertrain path. Failed checks stay focused;
  // optional fuel isolation/retest stages are required only when the low side fails.
  if(record.workflowId==="crank_no_start"){
    if(step.id==="codes"){
      if(/relevant active faults present/i.test(choice)) return hold(
        "Active faults are present and have not yet been evaluated for this no-start.",
        "Attach every relevant code with controller, active/inactive status and event data. Run the matching code-specific guided path where available. Only continue after the faults have been reviewed and you have recorded whether they explain the no-start."
      );
      if(/controllers not communicating|scan incomplete/i.test(choice)) return hold(
        "The controller scan is incomplete; the available fault list may be misleading.",
        "Restore communication with the missing controller(s), verify diagnostic-tool connection and power/ground as applicable, then repeat the full scan. Do not advance as though no relevant faults exist."
      );
      if(/active faults reviewed; none explain no-start|no relevant faults found/i.test(choice))
        return go(steps.find(item=>item.id==="enable"),"The available controller scan is complete and no primary no-start fault remains to be evaluated.","Check the start-enable state, cranking engine-speed signal, cam/crank synchronization and only the interlocks fitted to this vehicle. Record the source controller and actual live-data values.");
    }
    if(step.id==="enable"){
      if(choice==="start enable missing") return go(steps.find(item=>item.id==="enable_isolate"),"Start authorization is denied.","Identify the inhibit reason and trace the relevant input.");
      if(choice==="engine speed / sync data abnormal") return go(steps.find(item=>item.id==="sync_isolate"),"Cranking speed or synchronization is abnormal.","Isolate the speed or synchronization fault using the OEM procedure.");
      if(/enable and sync appear valid/i.test(choice))
        return go(steps.find(item=>item.id==="fuel"),"Start authorization and synchronization appear valid under the recorded cranking conditions.","Verify low-pressure fuel supply during cranking with the exact engine/serial-specific test point and specification. Record actual pressure, units and test conditions.");
      if(/data unavailable/i.test(choice)) return hold(
        "Start authorization or synchronization has not been proven.",
        "Obtain the correct OEM live-data parameters and start-enable procedure for this engine/controller combination. Do not treat unavailable data as a pass."
      );
    }
    if(step.id==="enable_isolate"||step.id==="sync_isolate"){
      if(["inhibit cause corrected","speed or synchronization cause corrected"].includes(choice)) return go(steps.find(item=>item.id==="enable"),"A correction was recorded; repeat authorization and synchronization checks.","Repeat the original cranking live-data test before proceeding.");
      return hold("The abnormal condition is not yet resolved.","Keep the case open and obtain the required OEM procedure or isolate the remaining cause.");
    }
    if(step.id==="fuel"){
      if(/supply outside specification|air \/ restriction evidence/i.test(choice))
        return go(steps.find(item=>item.id==="fuel_isolation"),"The low-pressure fuel supply did not pass during cranking; isolate the supply-side cause before moving to air/mechanical checks.","Follow the exact engine/serial-specific low-pressure pinpoint sequence to separate pump output, filter/line restriction, tank pickup/vent restriction and air ingress. Do not use generic pressure limits or replace a component from this result alone.");
      if(/fuel supply meets specification/i.test(choice))
        return go(steps.find(item=>item.id==="injection_check")||steps.find(item=>item.id==="air_exhaust"),"Fuel supply was verified within the applicable OEM specification during cranking.","Confirm injection architecture and verify injection delivery and authorization using the exact vehicle-specific procedure before mechanical checks.");
      if(/not tested/i.test(choice)) return hold(
        "Fuel supply has not been tested during cranking.",
        "Perform the OEM low-pressure supply test at the specified test point and conditions. Record the actual value and applicable limit; do not advance on an untested fuel system."
      );
    }
    if(step.id==="fuel_isolation"){
      if(/defect confirmed and corrected/i.test(choice))
        return go(steps.find(item=>item.id==="fuel_retest"),"A low-pressure supply defect was isolated and corrected; it must be verified under the original cranking conditions.","Repeat the same low-pressure supply test during cranking. Compare the measured value with the engine-specific limit before proceeding.");
      if(/defect identified; repair pending/i.test(choice)) return hold(
        "A fuel-supply defect has been identified but not corrected.",
        "Complete the approved repair and retain the before-repair evidence. Do not continue the no-start path until the low-pressure supply has been retested."
      );
      if(/no low-side cause isolated/i.test(choice)) return hold(
        "The low-pressure supply remains abnormal, but the cause is not isolated.",
        "Continue the current OEM pinpoint sequence. Verify the test setup, pump command/output, filter and line restriction, tank pickup/vent and air ingress only as prescribed for this engine. Record each discriminating result; do not guess or replace parts."
      );
      if(/procedure \/ specification unavailable/i.test(choice)) return hold(
        "The required low-pressure pinpoint procedure or specification is unavailable.",
        "Obtain current engine/serial-specific OEM service information before continuing. Keep the no-start diagnosis open; do not infer a failed component."
      );
    }
    if(step.id==="fuel_retest"){
      if(/fuel supply meets oem specification under cranking conditions/i.test(choice))
        return go(steps.find(item=>item.id==="injection_check")||steps.find(item=>item.id==="air_exhaust"),"The corrected low-pressure supply now meets the OEM specification during cranking.","Confirm injection architecture and verify injection delivery and authorization using the exact vehicle-specific procedure before mechanical checks.");
      if(/supply remains outside oem specification|air \/ restriction evidence remains/i.test(choice))
        return go(steps.find(item=>item.id==="fuel_isolation"),"The repeat cranking test still shows an abnormal low-pressure supply.","Return to the low-pressure pinpoint tests. The repair has not restored the required supply; isolate the remaining delivery, restriction or air-ingress cause.");
      if(/retest incomplete|conditions not reproduced/i.test(choice)) return hold(
        "The repaired fuel supply has not been verified under the original cranking conditions.",
        "Repeat the exact OEM test with the same test point, equipment and cranking conditions. Do not advance until the low-pressure result is conclusive."
      );
    }
    if(step.id==="injection_check"){
      if(choice==="injection delivery and authorization meet oem criteria") return go(steps.find(item=>item.id==="air_exhaust"),"Injection prerequisites meet applicable criteria.","Check air, exhaust and mechanical prerequisites.");
      if(choice==="injection delivery or authorization abnormal") return go(steps.find(item=>item.id==="injection_isolate"),"Injection delivery or authorization is abnormal.","Follow the architecture-specific pinpoint procedure.");
      return hold("Injection prerequisites remain unverified.","Confirm the engine architecture and obtain applicable OEM data.");
    }
    if(step.id==="injection_isolate"){
      if(choice==="injection defect corrected") return go(steps.find(item=>item.id==="injection_check"),"A correction was recorded.","Repeat the original injection test.");
      return hold("Injection cause remains unresolved.","Continue the authorized pinpoint procedure; do not infer a failed component.");
    }
    if(step.id==="air_exhaust"){
      if(/concern isolated and corrected; prerequisites now pass/i.test(choice))
        return go(steps.find(item=>item.id==="verify"),"The indicated air/exhaust/mechanical concern was isolated and corrected; confirm the original no-start is resolved.","Record the confirmed physical cause and repair, then repeat the original crank/start conditions. Save the post-repair scan and the measurements that proved the prerequisite now passes.");
      if(/restriction or mechanical concern found/i.test(choice)) return hold(
        "An intake, exhaust or mechanical abnormality is indicated but has not been isolated.",
        "Use the engine-specific OEM pinpoint test to identify whether the concern is intake restriction, exhaust restriction, valve/compression/timing or another supported mechanical issue. Record the exact measurement and limit; do not condemn a turbocharger or engine from a broad symptom."
      );
      if(/data points to another system/i.test(choice)) return hold(
        "The no-start evidence points outside the checks in this workflow.",
        "Stop this generic sequence and follow the relevant system-specific or fault-code-guided path. Attach the supporting code/live-data evidence and preserve the original no-start conditions; do not continue to a repair recommendation here."
      );
      if(/no abnormality identified/i.test(choice)) return hold(
        "The listed prerequisites did not reveal a cause; the no-start remains unresolved.",
        "Do not mark the engine diagnosed. Preserve cranking data and continue the exact OEM no-start pinpoint procedure for remaining fuel-control, sensor plausibility, ECM power/ground or mechanical checks supported by the evidence."
      );
      if(/further evidence needed/i.test(choice)) return hold(
        "The air, exhaust and mechanical checks are not conclusive.",
        "Identify the missing engine-specific test, measurement or operating condition and complete it before advancing. Do not treat an incomplete inspection as normal."
      );
    }
    if(step.id==="verify"){
      if(/repair pending verification|cause unconfirmed/i.test(choice)) return hold(
        "The no-start cause or repair has not been verified.",
        "Keep the case open. Complete the repair or obtain the missing evidence, then recreate the original cranking/no-start conditions and record the post-repair scan and restart result."
      );
    }
  }
  // Mack P016F00 CBR gates: a coexisting P009B-13 takes priority; K010 filter checks
  // are only prescribed when the code combination and vehicle applicability are confirmed.
  if(step.id==="p016f_eprv_scope"){
    if(choice==="current oem conversion procedure confirmed applicable; original eprv fitted")return go(steps.find(item=>item.id==="p016f_eprv_repair"),"Current OEM applicability was confirmed by the technician.","Follow the authorized repair instructions; complete the hardware requirements before programming.");
    if(choice==="conversion already completed or current oem procedure directs different repair")return go(steps.find(item=>item.id==="p016f_eprv_alternate"),"The current configuration requires its applicable diagnostic path.","Confirm installed hardware, software and the OEM circuit procedure.");
    return hold("Current vehicle applicability or hardware remains unconfirmed.","Verify VIN-specific OEM repair information and installed configuration.");
  }
  if(["p016f_eprv_repair","p016f_eprv_alternate"].includes(step.id)){
    if(choice==="authorized repair completed; hardware and software requirements satisfied")return go(steps.find(item=>item.id==="p016f_eprv_retest"),"The authorized repair was reported complete.","Save a fresh scan, repeat the original conditions and update fault statuses.");
    return hold("EPRV repair is incomplete or not authorized.","Complete only the applicable authorized procedure before retesting.");
  }
  if(step.id==="p016f_eprv_retest"){
    if(choice==="p009b inactive after repair; reassess p016f")return go(steps.find(item=>item.id==="p016f_confirm"),"Repeat scan observation recorded.","Update both code statuses from the fresh scan and reassess P016F.");
    if(choice==="p009b remains active or intermittent")return go(steps.find(item=>item.id==="p016f_eprv_scope"),"The P009B concern remains active.","Reassess hardware, configuration and the current OEM fault tree.");
    return hold("The repeat scan is incomplete.","Capture current fault statuses and original operating conditions.");
  }
  if(step.id==="p016f_confirm"){
    const attachedFaults=Object.values(record.entries||{}).flatMap(item=>Array.isArray(item?.faultCodes)?item.faultCodes:[]);
    const normalizeCode=value=>clean(value).toUpperCase().replace(/[^A-Z0-9]/g,"");
    const statusesFor=code=>attachedFaults.filter(item=>normalizeCode(item.code)===code).map(item=>clean(item.status).toLowerCase());
    const statusKnown=statuses=>statuses.length>0&&statuses.every(status=>["active","inactive","intermittent"].includes(status));
    const statusActive=statuses=>statuses.some(status=>status==="active"||status==="intermittent");
    const p016fStatuses=statusesFor("P016F00");
    if(choice==="both faults inactive after eprv repair; original conditions reproduced"){
      const p009b=statusesFor("P009B13");
      if(record.entries?.p016f_eprv_retest?.choice!=="P009B inactive after repair; reassess P016F"||!statusKnown(p016fStatuses)||!statusKnown(p009b)||statusActive(p016fStatuses)||statusActive(p009b))return hold("The repeat scan does not yet establish both faults as inactive after the EPRV repair.","Complete the EPRV repair and repeat scan stages, then update both fault statuses from the fresh scan. Do not infer a pass.");
      return go(steps.find(item=>item.id==="p016f_verify"),"Both faults were reported inactive after the recorded EPRV retest.","Verify the original conditions, compare before/after rail-pressure data and document the actual repair.");
    }
    if(!statusKnown(p016fStatuses)) return hold(
      p016fStatuses.length
        ? "P016F-00 is attached, but its current active/inactive status is still unknown."
        : "P016F-00 has not been attached to this case.",
      p016fStatuses.length
        ? "Use the inline “Confirm related fault status from the current scan” controls above this test to mark P016F-00 active, intermittent or inactive. Then save the test result again; do not guess the status."
        : "Attach P016F-00 from the current controller scan, identify its reporting controller and set its active/inactive status. Do not use the P016F-specific path while code identity or status is unknown."
    );
    if(!statusActive(p016fStatuses)) return hold(
      "P016F-00 is only recorded as inactive/historic.",
      "Confirm whether the original fault is still present or can be reproduced. Use the stored event data and current PTT Guided Diagnostics; do not treat a historic code as a current active fuel-pressure failure."
    );
    const p009bStatuses=statusesFor("P009B13");
    // An attached related code with unknown status is not a reason to stop the primary P016F path.
    // Only take the P009B precedence branch when the technician confirms it is active/intermittent.
    const p009bActive=statusActive(p009bStatuses);
    const vehicle=record.vehicle||{};
    const p009bYear=Number(vehicle.year||0);
    const p009bEngine=[vehicle.engine,vehicle.engineModel,vehicle.engineMake].filter(Boolean).join(" ").toUpperCase();
    const p009bEmissions=clean(vehicle.emissions||vehicle.emissionsFamily).toUpperCase().replace(/\s/g,"");
    const k947Eligible=clean(vehicle.make).toLowerCase().includes("mack")&&p009bYear>=2018&&p009bYear<=2019&&/\b(?:MP7|MP8|11L|13L)\b/i.test(p009bEngine)&&/US17\+OBD(16|18)/.test(p009bEmissions);
    const p009bHoldReason="P009B-13 is active/intermittent and must be diagnosed before continuing the related P016F pressure path.";
    const p009bHoldAction="Review Mack FSB 237-021 revision 2 and service campaign S7567 for the OEM EPRV conversion (hardware 85156544, software 85156014). FSB candidate production range: 2016-11-14 through 2020-05-04, MP7/MP8, applicable US17–US19 configurations. The September 2023 S7567 campaign record has a narrower build range ending 2018-12-20 and listed expiration 2024-12-31; verify current coverage separately. Confirm exact build date, emissions, current campaign/bulletin applicability and whether the conversion was already performed. Use the current authorized procedure for P009B-13; do not assume valve replacement or conversion eligibility from a fault alone. Inspect rail-pressure sensor/harness applicability per OEM instructions. Do not program the conversion before completing its required hardware work. After the repair, rescan and reassess P016F-00."+(k947Eligible?" Historical K94743326 scope may be relevant only if still applicable to the original hardware and current OEM instructions.":" Do not apply K94743326 pinouts or replacement instructions outside its verified scope.");
    if(p009bActive&&!/P009B-13 is also active/i.test(choice)) return go(steps.find(item=>item.id==="p016f_eprv_scope"),p009bHoldReason,p009bHoldAction);
    if(/P009B-13 is also active/i.test(choice)){
      if(!p009bActive) return hold(
        "The selected result says P009B-13 is active, but no attached P009B-13 fault is confirmed active/intermittent.",
        "Attach P009B-13 and verify its status in the current scan. If it is inactive/historic, do not select the active EPRV-precedence branch."
      );
      return go(steps.find(item=>item.id==="p016f_eprv_scope"),p009bHoldReason,p009bHoldAction);
    }
    if(/vehicle, emissions or engine applicability unknown|outside listed cbr scope/i.test(choice))
      return hold("The Mack CBR applicability is not established.",
        "Stop before using the CBR-directed path. Confirm VIN, model, year, engine family/serial, common-rail configuration and emissions generation in PTT, then retrieve the current applicable Mack procedure.");
    if(/PTT version below 2\.7\.85|current guided diagnostics unavailable|PTT unavailable or below 2\.7\.85/i.test(choice)){
      const triggerCodes=["P008700","P016F00","P228F00"];
      const triggerStatuses=triggerCodes.map(statusesFor);
      const triggerSetAttached=triggerStatuses.every(statuses=>statuses.length>0);
      const triggerSetNotInactive=triggerStatuses.every(statuses=>!statuses.some(status=>status==="inactive"));
      const modelText=clean(vehicle.model||vehicle.chassis).toUpperCase();
      const engineText=[vehicle.engine,vehicle.engineModel,vehicle.engineMake].filter(Boolean).join(" ").toUpperCase();
      const year=Number(vehicle.year||0);
      const emissions=clean(vehicle.emissions||vehicle.emissionsFamily).toUpperCase().replace(/\s/g,"");
      const modelEligible=/\b(?:TE|LR|MRU|AN|CHU|CXU|GR|GU|PI)(?:\b|[0-9])|\b(?:ANTHEM|GRANITE|PINNACLE|TERRAPRO)\b/i.test(modelText);
      const engineEligible=/\b(?:MP7|MP8|11L|13L)\b/i.test(engineText);
      const emissionsEligible=/US17\+OBD(16|18|19)/.test(emissions);
      if(triggerSetAttached&&triggerSetNotInactive&&year>=2018&&modelEligible&&engineEligible&&emissionsEligible)
        return go(steps.find(item=>item.id==="p016f_cbr_filter"),
          "PTT is unavailable, but the three K01029637 trigger codes are attached and the entered Mack model/year/engine/emissions meet its candidate scope.",
          "Continue with the K01029637 physical inspection and required photo documentation. Confirm common-rail configuration and exact VIN/build applicability before using the bulletin. After the inspection, use an authorized current engine/serial-specific OEM service procedure for pressure testing; do not invent a substitute for PTT.");
      return go(steps.find(item=>item.id==="p016f_low_side"),
        "PTT is unavailable or below the version specified in the historical CBR update. The PTT-only branch is skipped; the diagnosis can continue using an equivalent authorized OEM procedure.",
        "Use an authorized current Mack/Volvo service procedure from the applicable service-information portal for this exact engine family and serial number. If you do not have an equivalent procedure, record that limitation and obtain it before pressure testing. Do not use generic pressure limits, guessed test ports or high-pressure line loosening.");
    }
    const k010Codes=["P008700","P016F00","P228F00"];
    const k010Statuses=k010Codes.map(statusesFor);
    const hasK010Combination=k010Statuses.every(statuses=>statuses.length>0);
    const k010ExplicitlyInactive=k010Statuses.some(statuses=>statuses.some(status=>status==="inactive"));
    if(/P0087-00, P016F-00 and P228F-00 all present/i.test(choice)){
      if(!hasK010Combination) return hold(
        "The selected CBR option says all three trigger codes are present, but the complete P0087-00 / P016F-00 / P228F-00 set is not attached to this case.",
        "Attach the full scan-report fault set and confirm each code's controller and active/inactive status. Do not use the K01029637 filter inspection path until all three trigger codes are documented."
      );
      if(k010ExplicitlyInactive) return hold(
        "At least one K01029637 trigger code is marked inactive/historic.",
        "The selected CBR option says all three codes are present, but one is marked inactive. Recheck the current scan and select the correct branch; unknown related-code status does not need to be changed to active."
      );
      const vehicle = record.vehicle || {};
      const modelText = clean(vehicle.model || vehicle.chassis).toUpperCase();
      const engineText = [vehicle.engine,vehicle.engineModel,vehicle.engineMake].filter(Boolean).join(" ").toUpperCase();
      const year = Number(vehicle.year || 0);
      const emissions = clean(vehicle.emissions || vehicle.emissionsFamily).toUpperCase().replace(/\s/g,"");
      const modelEligible = /\b(?:TE|LR|MRU|AN|CHU|CXU|GR|GU|PI)(?:\b|[0-9])|\b(?:ANTHEM|GRANITE|PINNACLE|TERRAPRO)\b/i.test(modelText);
      const engineEligible = /\b(?:MP7|MP8|11L|13L)\b/i.test(engineText);
      const emissionsEligible = /US17\+OBD(16|18|19)/.test(emissions);
      if(!clean(vehicle.make).toLowerCase().includes("mack") || year < 2018 || !modelEligible || !engineEligible || !emissionsEligible)
        return hold(
          "The vehicle details entered in the case do not establish K01029637 applicability.",
          "Before using the CBR filter inspection, verify the Mack model code, model year (2018 or newer), MP7/MP8 or 11L/13L engine family, and US17+OBD16/18/19 emissions from VIN/build data. If any item is outside scope or unknown, do not apply K01029637; use current PTT Guided Diagnostics and the correct vehicle-specific procedure."
        );
      return go(steps.find(item=>item.id==="p016f_cbr_filter"),"The full K01029637 code combination is attached with active/intermittent status and the entered model/year/engine/emissions meet the bulletin's candidate scope; confirm common-rail configuration in the OEM build data.",
        "Follow CBR K01029637 only after the VIN/build confirms common-rail configuration and exact applicability: inspect the fuel-tank vent filter and both hose connections, then remove and inspect the secondary fuel-filter lip seal. Photograph the required locations and attach them to the eService case.");
    }
    if(/P016F-00 present; K01029637 combination not present/i.test(choice)){
      if(hasK010Combination&&k010Statuses.every(statuses=>statuses.length>0&&statuses.every(status=>status==="active"||status==="intermittent"))) return hold(
        "All three K01029637 trigger codes are attached with active/intermittent status, but the selected result says the combination is not present.",
        "Review the complete scan and select the K01029637 applicability option if the VIN/build scope is confirmed. Do not bypass the CBR trigger combination by selecting the low-side-only path."
      );
      // The technician's explicit scan review is sufficient here; unknown statuses on
      // supporting codes must not block the P016F low-side diagnostic path.
      return go(steps[steps.findIndex(item=>item.id==="p016f_low_side")],"P016F00 is confirmed active/intermittent and the K01029637 three-code trigger is not present as an active combination.","Use current PTT Guided Diagnostics or an authorized current Mack/Volvo service procedure for this exact engine and emissions configuration. Begin with the specified low-side supply checks; do not apply the K01029637 lip-seal CBR as though its code combination were met.");
    }
  }
  if(step.id==="p016f_cbr_filter"){
    if(/inspection or required photos|incomplete/i.test(choice))
      return hold("The CBR inspection and documentation are incomplete.",
        "Complete the vent-filter and connection inspection, inspect the secondary-filter lip seal, photograph both vent connections, filter top and date code, and attach findings to the eService case before proceeding.");
    if(/restriction or damage found|lip seal damaged/i.test(choice))
      return hold("A CBR inspection abnormality was found; the fuel supply/filter condition needs to be resolved and documented.",
        "Record the exact defect and photos in the Mack eService case. Follow the CBR and current Mack parts/service direction for correction. After the repair, repeat the prescribed fuel-pressure diagnostics; do not assume the defect alone proves the entire cause.");
    if(/both cbr inspection areas checked; no defect found/i.test(choice))
      return go(steps[steps.findIndex(item=>item.id==="p016f_low_side")],"The CBR vent-filter and secondary-filter lip-seal inspections found no defect.",
        "Continue with PTT or an authorized current engine/serial-specific OEM service procedure. Verify low-side supply pressure under the fault conditions using the exact specification.");
  }
  // P016F00: a verified low-side pass must advance to high-side rail-pressure testing.
  if(step.id==="p016f_low_side"){
    if(/low-side pressure meets oem specification under the fault conditions/i.test(choice))
      return go(steps.find(item=>item.id==="p016f_high_side"),"Low-side supply pressure was verified within the applicable OEM specification under the conditions that set the fault.","The low side has passed. Move to the high-pressure system: compare commanded and actual rail pressure together under the same operating conditions. Record both values, units and OEM limits.");
    if(/below oem specification|pressure unstable|air \/ restriction evidence/i.test(choice))
      return go(steps.find(item=>item.id==="p016f_low_side_isolate"),"The low-side supply has not passed; a supply-side abnormality must be isolated before high-side conclusions.","Stay on the low side. Follow the exact engine-specific PTT or authorized OEM pinpoint procedure to separate supply/transfer-pump output, filter or line restriction, tank pickup/vent restriction and air ingress. Change one condition at a time and record the measured response; do not replace a pump or filter from the pressure result alone.");
    if(/incomplete|specification unavailable/.test(choice))
      return hold("Low-side pressure has not been proven within specification.","Obtain the correct engine/serial-specific pressure specification and test point, then repeat the low-side test under the conditions that set P016F00. Do not treat missing data as a pass.");
  }
  if(step.id==="p016f_low_side_isolate"){
    if(/defect confirmed and corrected/i.test(choice))
      return go(steps.find(item=>item.id==="p016f_low_side_retest"),"A low-side supply defect was isolated and corrected; it now needs a repeat pressure test.","Repeat the same low-side pressure test at the same test point and operating conditions. Compare the actual value with the exact engine/serial-specific OEM specification before moving to rail-pressure diagnosis.");
    if(/defect identified; repair pending|component or restriction identified but not corrected/i.test(choice))
      return hold("A low-side defect has been identified but has not been corrected.","Complete the approved repair first. Do not proceed to high-side testing until the low-side supply is repaired and rechecked under the original fault conditions.");
    if(/no low-side cause isolated/i.test(choice))
      return hold("The low-side pressure is abnormal, but the cause has not been isolated.","Continue the applicable PTT or authorized OEM low-pressure pinpoint tests. Verify test equipment and connections, supply/transfer-pump command and output, filter condition, tank pickup/vent, line restriction and air ingress only as prescribed for this engine. Record each result; do not guess or replace parts.");
    if(/incomplete|procedure unavailable|specification unavailable/i.test(choice))
      return hold("The low-side isolation procedure is incomplete or unavailable.","Obtain current engine/serial-specific Mack service information and complete the prescribed low-pressure pinpoint tests. Keep the case open; do not infer a failed component.");
  }
  if(step.id==="p016f_low_side_retest"){
    if(/low-side pressure meets oem specification under the original fault conditions/i.test(choice))
      return go(steps.find(item=>item.id==="p016f_high_side"),"The repaired low-side supply now meets the OEM specification under the original fault conditions.","Proceed to commanded-versus-actual rail-pressure testing. Preserve the before/after low-side readings and continue with the exact engine-specific OEM high-pressure procedure.");
    if(/below oem specification|pressure unstable|air \/ restriction evidence/i.test(choice))
      return go(steps.find(item=>item.id==="p016f_low_side_isolate"),"The repeat test still shows an abnormal low-side supply.","Return to the low-side pinpoint tests. The repair has not restored the specified supply pressure; isolate the remaining restriction, delivery or air-ingress cause before proceeding.");
    if(/incomplete|specification unavailable|original fault conditions not reproduced/i.test(choice))
      return hold("The repaired low-side supply has not been verified under the original fault conditions.","Repeat the specified pressure test with the correct test equipment, operating conditions and engine-specific limit. Do not advance until the low-side result is conclusive.");
  }
  if(step.id==="p016f_high_side"){
    if(/actual rail pressure falls below commanded|cannot track target/.test(choice))
      return go(steps[index+1],"Actual rail pressure is not following the commanded target despite a verified low-side supply.","Continue with the OEM high-pressure pinpoint tests to distinguish pump output, metering/pressure control and injector/rail leakage. Do not replace a component from this discrepancy alone.");
    if(/tracks commanded within oem specification/.test(choice))
      return go(steps[steps.findIndex(item=>item.id==="p016f_verify")],"Actual rail pressure tracked the commanded target within the applicable specification during the test.","The pressure-control fault was not reproduced in the high-side data. Preserve the event data and investigate sensor plausibility/intermittent conditions if the fault remains or returns; do not condemn the high-pressure pump.");
    if(/implausible|sensor \/ circuit concern/.test(choice))
      return hold("Rail-pressure data is implausible or points to a sensor/circuit concern.","Verify the rail-pressure sensor supply, ground and signal using the exact wiring diagram and OEM test procedure. Confirm scan-tool data against the approved physical test method before replacing the sensor.");
    if(/incomplete|specification unavailable/.test(choice))
      return hold("High-side rail-pressure performance has not been established.","Obtain the correct commanded/actual rail-pressure parameters, test conditions and engine-specific limits. Do not infer a high-pressure failure without those values.");
  }
  if(step.id==="p016f_high_side_isolate"){
    if(/a specific high-pressure control \/ delivery fault is isolated|sensor signal or circuit fault is isolated/i.test(choice))
      return hold(
        "A high-pressure or sensor-circuit fault has been isolated, but the repair is not yet documented as complete.",
        "Record the exact failed OEM pinpoint test, component/circuit, measured result and applicable specification. Complete the authorized repair first, then select the repaired outcome. Do not advance to final verification merely because a fault was isolated."
      );
    if(/specific high-pressure fault repaired|sensor circuit repaired/i.test(choice))
      return go(steps.find(item=>item.id==="p016f_verify"),
        "The isolated high-pressure or sensor-circuit defect has been repaired and is ready for verification.",
        "Repeat the original commanded-versus-actual rail-pressure test under the same operating conditions, compare before/after values with the exact OEM limits, and rescan EMS for P016F00. Preserve the repair evidence.");
    if(/repair pending/i.test(choice))
      return hold("The isolated high-pressure or sensor-circuit fault is awaiting repair.",
        "Complete the authorized repair and document the part/circuit, OEM procedure and supporting measurements before selecting the repaired outcome.");
    if(/no abnormality found/i.test(choice))
      return hold("The prescribed high-pressure pinpoint tests did not isolate a fault, but the original P016F00 concern remains unresolved.",
        "Do not move to repair verification. Recheck whether the original fault conditions were reproduced, preserve event data and continue the current engine/serial-specific OEM diagnostic tree for intermittent rail-pressure control, sensor plausibility and leakage causes. Keep the cause unconfirmed until a discriminating test supports it.");
  }
  // Explicit branches for the Mack P205B64 applicability gate and final repeat test.
  // These decisions remain inside the shared recommendation engine.
  if(step.id==="p205b_applicability"){
    if(/none of the listed yellow|inactive|historic/.test(choice)) return {
      stepId:step.id,reason:"No listed yellow UQLS fault is active/confirmed.",
      action:"Do not troubleshoot or replace the UQLS under CBR 2107-22. Save the scan report and use applicable guided diagnostics for any green codes or other symptoms.",
      state:"review"
    };
    if(/AN\(4\)|PR\(4\)|unknown|stop/.test(choice)) return hold(
      "The 2026 Mack CBR applicability has not been established or this variant is excluded.",
      "Stop this guided path. Confirm the VIN, exact chassis variant and emissions generation, then retrieve the applicable Mack procedure. Do not carry on with CBR 2107-22."
    );
    if(/at least one listed yellow UQLS fault active\/confirmed and applicability verified/i.test(choice)) {
      const scope=mackUqlsScope(record.vehicle||{});
      if(!hasActiveMackUqlsFault(record)) return hold(
        "No attached listed yellow UQLS fault is marked Active or Confirmed in the scan evidence.",
        "Attach the complete scan and select at least one of the nine CBR-listed UQLS faults with its reporting controller and Active/Confirmed status. A manually selected applicability answer without matching scan evidence is not sufficient."
      );
      if(!scope.valid) return hold(
        "The entered vehicle identity does not establish the Mack CBR 2107-22 scope.",
        "Confirm the exact Mack model/chassis variant and emissions generation from VIN/build data. AN(4) and PR(4) are excluded; valid scope is model year 2017–2024 and US17–US22 with OBD2016–OBD2023. Do not continue this CBR path with missing or out-of-scope vehicle data."
      );
      return go(steps[index+1],"At least one listed yellow UQLS fault is active/confirmed and the entered vehicle identity fits the CBR scope.",
        "Inspect both UQLS harness connector halves for damaged pins/wires, corrosion and water intrusion.");
    }
  }
  if(step.id==="p205b_connector"){
    if(/no pin, wire, corrosion or moisture damage found/i.test(choice)) return go(
      steps[index+1],"The UQLS connector and harness inspection found no visible damage.",
      "Proceed to DEF quality verification with Mack refractometer part 88890105. Compare the reading with the current Mack specification and record the actual result."
    );
    if(/damage, corrosion or water intrusion found/i.test(choice)) return hold(
      "Physical damage or contamination was found at the UQLS connector or harness.",
      "Stop the routine sequence. Photograph and localize the defect, inspect the affected terminals, seals and wiring, and follow applicable Mack repair procedure TSB 258-040 if replacement is required."
    );
  }
  if(step.id==="p205b_result"){
    if(!hasActiveMackUqlsFault(record)) return {stepId:"p205b_applicability",reason:"No attached listed yellow UQLS fault is marked Active or Confirmed in the scan evidence.",action:"Attach the complete scan and select at least one of the nine CBR-listed UQLS faults with its reporting controller and Active/Confirmed status. Do not make a CBR replacement decision from a manually selected answer alone.",state:"hold"};
    const scope=mackUqlsScope(record.vehicle||{});
    if(!scope.valid) return {stepId:"p205b_applicability",reason:"The entered vehicle identity does not establish the Mack CBR 2107-22 scope.",action:"Confirm the exact Mack model/chassis variant and emissions generation from VIN/build data. AN(4) and PR(4) are excluded; accepted emissions families are US17+OBD16/18/19, US20+OBD20, US21+OBD21 and US22+OBD2023. Do not make a CBR replacement decision with missing or out-of-scope vehicle data.",state:"hold"};
    // The final CBR decision is gated by every required preceding stage. A direct
    // final-step selection cannot stand in for the applicability and repeat-test evidence.
    const required=[
      {id:"p205b_applicability",pattern:/at least one listed yellow UQLS fault active\/confirmed and applicability verified/i,reason:"The bulletin applicability and at least one active/confirmed yellow UQLS fault have not been established.",action:"Confirm the exact Mack VIN/chassis variant and emissions scope, then attach the full scan showing at least one listed yellow UQLS fault active/confirmed. Do not use the CBR replacement decision until this gate passes."},
      {id:"p205b_connector",pattern:/no pin, wire, corrosion or moisture damage found/i,reason:"The required UQLS connector and harness inspection has not passed.",action:"Inspect both UQLS connector halves and visible harness using the approved procedure. Photograph and repair any confirmed defect before continuing."},
      {id:"p205b_quality",pattern:/DEF quality acceptable per Mack specification/i,reason:"DEF quality has not been confirmed acceptable.",action:"Test a clean DEF sample with the specified Mack refractometer and compare the actual reading with the current Mack acceptance specification. Correct contamination/quality concerns and repeat the check."},
      {id:"p205b_freeze",pattern:/tank is not frozen/i,reason:"The DEF tank has not been confirmed free of freezing.",action:"Verify tank condition using the approved Mack service method. If frozen or suspected frozen, stop and follow the approved thaw/service procedure; do not use improvised heat."},
      {id:"p205b_fill",pattern:/tank adequately filled per Mack procedure/i,reason:"The DEF tank fill level has not been confirmed adequate.",action:"Verify the fill level using the current Mack procedure for this configuration and record how it was checked."}
    ];
    for(const requiredStage of required){
      const prior=entries[requiredStage.id]||{};
      if(!requiredStage.pattern.test(clean(prior.choice))) return {
        stepId:requiredStage.id,reason:requiredStage.reason,action:requiredStage.action,state:"hold"
      };
    }
    const cycleChoice=clean(entries.p205b_cycle?.choice);
    const returned=/repeat sequence completed; one or more listed yellow UQLS faults returned active\/confirmed/i.test(cycleChoice);
    const noneReturned=/repeat sequence completed; none of the nine listed yellow UQLS faults returned active/i.test(cycleChoice);
    if(!returned&&!noneReturned) return {
      stepId:"p205b_cycle",reason:"The prescribed two-cycle repeat-fault check has not been completed and documented.",
      action:"Complete both Mack-prescribed high-idle runs, the 15-second key-off interval and a fresh scan. Record the final status of all nine listed yellow UQLS faults before making a replacement decision.",state:"hold"
    };
    if(/^(?!.*\b(?:none|no|did not)\b).*(?:listed yellow UQLS faults returned active\/confirmed|yellow faults returned|yellow UQLS faults returned)/i.test(choice)){
      if(!returned) return {stepId:"p205b_cycle",reason:"The final selection says a yellow fault returned, but the recorded repeat-test result does not confirm that outcome.",action:"Reconcile the final scan with the repeat-test entry. Record each listed yellow code's actual active/confirmed status and select the matching final result.",state:"hold"};
      return {
        stepId:step.id,title:"Replace DEF Level / UQLS sensor",
        reason:"One or more of the nine yellow UQLS faults returned after the prescribed repeat test.",
        action:"RECOMMENDATION: Replace the DEF Level / UQLS sensor. The Mack CBR 2107-22 replacement criteria are met because a listed yellow UQLS fault returned active/confirmed after the prescribed repeat checks. Confirm the VIN, chassis variant and emissions generation remain within the bulletin scope. Follow the current Mack Impact replacement procedure and TSB 258-040 for sensor replacement and wire routing. Save the before-and-after scan results. This is a bulletin-directed repair recommendation; verify the repair with the prescribed post-repair checks.",
        state:"review"
      };
    }
    if(/none .*yellow.*faults.*returned|none of the nine listed yellow UQLS faults returned active|did not return active|yellow faults did not return/i.test(choice)){
      if(!noneReturned) return {stepId:"p205b_cycle",reason:"The final selection says no yellow faults returned, but the recorded repeat-test result reports an active/confirmed yellow fault.",action:"Reconcile the final selection with the fresh scan and repeat-test record. Do not suppress a returned active/confirmed fault.",state:"hold"};
      return {
        stepId:step.id,title:"No UQLS replacement indicated",reason:"None of the nine listed yellow UQLS faults returned active after the prescribed repeat test.",
        action:"Do not replace the UQLS under this procedure. Save the final scan report and release/continue service according to the shop's verification process.",
        state:"review"
      };
    }
    if(/uncertain|another fault/.test(choice)) return hold(
      "The repeat-test result is not conclusive.",
      "Do not replace the UQLS yet. Record the remaining active codes and repeat/complete the applicable diagnostic procedure."
    );
  }
  if (!populated(entry.choice)) return hold(
    "Measurements or notes were saved without a selected observation.",
    "Choose the observation that accurately describes the test, or explicitly record why the test could not be completed. Do not infer pass/fail from free text."
  );
  if (/not tested|not completed|incomplete|unable|unavailable|inconclusive|uncertain|unclear|not identified|more data|required information|cannot determine|not reproduced|needs clarification/.test(choice)) {
    return hold("The latest result is incomplete or inconclusive: "+step.title+".",
      "Do not advance as though this test passed. Identify the missing test condition, service information or measurement, complete the check if safe, and record the actual result."
    );
  }
  if (/abnormal|outside (?:the )?spec|below (?:the )?(?:spec|specification|limit)|above (?:the )?(?:spec|specification|limit)|implausible|discrepancy|drop.?out|missing|failed|failure|restriction evidence|pressure below|fault found|damage found|physical evidence|corrosion|unstable|excessive|not within/.test(resultText)) {
    return hold("The latest finding may be abnormal and needs to be isolated before the workflow moves on.",
      "Stay with this finding. Confirm the test setup and vehicle-specific limit, localize the affected circuit or subsystem, and perform a discriminating follow-up test. Record what changed and do not replace a component from this result alone."
    );
  }
  if (record.status === "ready-for-review" || record.finishedEarly || step.terminal || !next) {
    return {stepId:step.id,reason:"The investigation has reached a review point.",action:"Review the physical cause, repair details and before/after verification evidence. Keep the outcome unverified if the original complaint has not been retested.",state:"review"};
  }
  const explicitNext=typeof step.next==="string" ? steps.find(item=>item.id===step.next) : null;
  const target=explicitNext||next;
  return go(target,"The recorded observation supports moving to the next diagnostic stage.",
    "Perform "+target.title+" using the exact vehicle-specific procedure. Record actual values, units, test points and operating conditions. If the result is abnormal or unclear, stop and investigate that finding rather than continuing."
  );
}
function recommendationFor(record, steps, system) {
  if(record.workflowId==="sensor_circuit") return sensorRecommendation(record,steps);
  if(record.workflowId==="starting_system") return startingRecommendation(record,steps);
  if (record.workflowId === "unexpected_shutdown") return shutdownRecommendation(record,steps);
  if (system === "electrical") return recommendNextStep(record, steps);
  return powertrainRecommendation(record,steps);
}
function workflowCaution(workflowId) {
  if (workflowId === "power_loss") return "A complete-power-loss event can involve battery source, high-current connections, master disconnects, main distribution, grounds or switched feeds. Follow the exact vehicle wiring diagram and OEM test procedure. Do not bridge high-current components or bypass circuit protection.";
  const normalized = workflowId === "j1939_network" ? "j1939_dropout" : workflowId;
  return powertrainWorkflows[normalized]?.caution ||
    "Use the exact vehicle-specific service information, wiring diagram and approved test procedure.";
}

export function analyzeDiagnosticCase(caseRecord = {}, steps = [], options = {}) {
  const entries = caseRecord.entries || {};
  const evidence = summarizeEvidence(entries);
  const vehicle = caseRecord.vehicle || {};
  const missingVehicle = ["make","model","engine"].filter(key => !populated(vehicle[key]));
  const canonicalVehicleContext = buildVehicleContext(vehicle);
  const system = getSystem(caseRecord);
  const recommendation = recommendationFor(caseRecord, steps, system);
  const current = steps.find(step => step.id === recommendation?.stepId) || null;
  const recommendationContext = recommendationEvidence(caseRecord, steps, recommendation || {});
  const currentEntry = entries[steps[caseRecord.currentStep || 0]?.id] || {};
  const measurementOnly = !populated(currentEntry.choice) && Object.values(currentEntry.measurements || {}).some(populated);
  const blocked = measurementOnly || recommendation?.state === "hold";
  const status = blocked ? "evidence-needed" :
    recommendation?.state === "review" ? "review-required" :
    evidence.stagesWithObservations ? "guided" : "ready-to-start";
  const limitations = [
    "Recommendations are workflow guidance, not a confirmed diagnosis.",
    "A fault code or single measurement does not prove a component has failed.",
    "Vehicle-specific specifications, topology and OEM procedures must be verified."
  ];
  if (missingVehicle.length) limitations.push("Vehicle context is incomplete: add " + missingVehicle.join(", ") + " when known.");
  if (measurementOnly) limitations.push("Measurements were entered without a selected observation; no result has been inferred from free text.");
  const matches = verifiedCaseMatches(caseRecord, Array.isArray(options.relatedCases) ? options.relatedCases : []);
  return {
    version:2,engine:"shared-core-with-specialist-adapters",system,
    specialist:specialistFor(system),status,workflowId:caseRecord.workflowId || "",
    recommendation:recommendation ? {
      stepId:recommendation.stepId,stepTitle:recommendation.title || current?.title || recommendation.stepId,
      reason:recommendation.reason,action:recommendation.action,state:recommendation.state || "next",
      explanation:recommendationContext.explanation,latestFinding:recommendationContext.latestFinding,
      evidenceTrail:recommendationContext.evidenceTrail
    } : null,
    evidence,evidenceQuality:evidenceQuality(caseRecord,evidence),
    vehicleContext:{...canonicalVehicleContext,make:clean(vehicle.make),model:clean(vehicle.model),engine:clean(vehicle.engine),missing:missingVehicle,missingIdentityFields:canonicalVehicleContext.missing},
    crossSystemSignals:crossSystemSignals(caseRecord,system),
    verifiedCaseMatches:matches,
    knowledgePolicy:"Only technician-marked verified cases with a recorded cause and repair can appear as references. References never override current evidence or OEM procedures.",
    caution:workflowCaution(caseRecord.workflowId),
    limitations,
    relatedCaseCount:Array.isArray(options.relatedCases) ? options.relatedCases.length : 0
  };
}
