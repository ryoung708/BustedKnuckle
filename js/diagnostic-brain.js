// IronKnuckle Diagnostic Brain v2
// One shared reasoning core with system-specific specialist adapters.
// Evidence-first rules only. Cross-system cues are prompts to investigate, never causal diagnoses.
import { recommendNextStep } from "./wiringhound-decision-engine.js";
import { workflows as powertrainWorkflows } from "./diagnostic-engine.js";

const clean = value => String(value ?? "").trim();
const lower = value => clean(value).toLowerCase();
const populated = value => clean(value).length > 0;
const electricalWorkflowIds = new Set([
  "j1939_network","j1939_dropout","light_inop","general_electrical",
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
  if(latest.step.id==="shutdown_pattern") return go("engine_architecture",
    "The shutdown behavior is documented; the next decision depends on the engine's actual fuel/control architecture.",
    "Identify the exact engine model/serial and confirm whether its fuel and shutdown controls are electronic or mechanical before selecting pinouts or specifications.");
  if(latest.step.id==="engine_architecture"){
    if(answer.includes("unknown")||answer.includes("unavailable")||answer.includes("not identified"))
      return hold("The engine/control architecture is not confirmed.",
        "Pause system-specific testing. Identify the engine and control family from the data plate and authorized service information; do not guess at sensor type, pinout or test values.");
    return go("shutdown_fault_scan","The engine/control architecture is identified.",
      "Capture active and inactive controller faults and event data before clearing anything. No warning lamp does not rule out stored faults.");
  }
  if(latest.step.id==="shutdown_fault_scan") return go("power_ground_integrity",
    "Stored events have been captured; verify the electrical foundation before condemning timing or fuel components.",
    "Inspect and test battery, engine and controller power/grounds under load. Record test points and compare only with the exact OEM limits.");
  if(latest.step.id==="power_ground_integrity"){
    if(answer.includes("abnormal")||answer.includes("unstable"))
      return hold("A power or ground abnormality was found; downstream sensor and fuel-control conclusions may be unreliable.",
        "Localize the affected cable, eyelet, stud, splice, fuse, relay or ground path. Repair only the confirmed defect, then repeat the same loaded voltage-drop test before advancing.");
    if(answer.includes("not tested")||answer.includes("unavailable"))
      return hold("Power and ground integrity has not been established.",
        "Obtain the correct diagram, test points and OEM limits, then perform loaded checks. Do not treat visual inspection or unloaded continuity as proof.");
    return go("engine_speed_timing_signal","Power and ground paths have been verified under load.",
      "Monitor engine RPM/synchronization and the correct timing signal during the failure window. Check connector retention and harness condition without assuming a sensor type or generic resistance value.");
  }
  if(latest.step.id==="engine_speed_timing_signal"){
    if(answer.includes("drops out")||answer.includes("defect physically"))
      return hold("Timing/speed evidence is abnormal or a physical connector/harness defect is present.",
        "Localize the signal loss with the correct wiring diagram and approved test method. Repair the confirmed circuit defect and repeat the signal check; do not replace the sensor solely from the symptom.");
    if(answer.includes("unavailable")||answer.includes("not reproduced"))
      return hold("The timing/speed signal has not been evaluated through the failure event.",
        "Capture the correct live data or approved signal test during the cold/warm failure window. Record if the controller remains online.");
    return go("fuel_control_delivery","Timing/speed data remained stable through the shutdown event.",
      "Now evaluate the fuel-control/shutdown device and fuel delivery using the confirmed system architecture and engine-specific service specifications.");
  }
  if(latest.step.id==="fuel_control_delivery"){
    if(answer.includes("drops out")||answer.includes("outside"))
      return hold("Fuel-control or delivery evidence is abnormal.",
        "Isolate the exact control circuit or fuel-delivery fault using the correct engine-specific procedure. Do not bypass shutdown devices or use generic pressure/voltage values.");
    if(answer.includes("not tested")||answer.includes("unavailable"))
      return hold("Fuel control and delivery have not been verified.",
        "Confirm architecture and authorized specifications before testing the shutoff device, fuel pressure, restriction or air ingress.");
    return go("shutdown_repair_verification","Power/ground, timing/speed and fuel-control checks have not identified an abnormality.",
      "Repeat the original conditions, capture any event data, and document the remaining unknowns. Do not declare a component failed without confirming evidence.");
  }
  if(latest.step.id==="shutdown_repair_verification") return {
    stepId:latest.step.id,reason:"The verification result is recorded.",
    action:answer.includes("no longer occurs")
      ? "Review the evidence and confirm the original cold/warm conditions were repeated. Mark the case verified only when the repair is supported by the before/after results."
      : "Keep the case unverified. Record the remaining symptom or repeat-test plan; do not promote an unconfirmed cause to the diagnostic knowledge base.",
    state:"review"
  };
  return null;
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
      if(/start enable missing/i.test(choice)) return hold(
        "The engine is not being granted start authorization.",
        "Identify the controller that is withholding start enable and the exact inhibit reason. Verify the relevant configured interlock input at its source and at the receiving controller using the OEM diagram/live data. Check neutral/park, clutch/brake, PTO or immobilizer only if fitted; do not bypass an interlock."
      );
      if(/engine speed \/ sync data abnormal/i.test(choice)) return hold(
        "Cranking speed or synchronization data is abnormal.",
        "Use the engine-specific procedure to verify the crankshaft and camshaft speed/synchronization signals during cranking. Compare scan data with the approved physical test method, then inspect the supported sensor circuit, connector, harness or mechanical timing evidence. Do not invent a universal RPM or waveform limit."
      );
      if(/enable and sync appear valid/i.test(choice))
        return go(steps.find(item=>item.id==="fuel"),"Start authorization and synchronization appear valid under the recorded cranking conditions.","Verify low-pressure fuel supply during cranking with the exact engine/serial-specific test point and specification. Record actual pressure, units and test conditions.");
      if(/data unavailable/i.test(choice)) return hold(
        "Start authorization or synchronization has not been proven.",
        "Obtain the correct OEM live-data parameters and start-enable procedure for this engine/controller combination. Do not treat unavailable data as a pass."
      );
    }
    if(step.id==="fuel"){
      if(/supply outside specification|air \/ restriction evidence/i.test(choice))
        return go(steps.find(item=>item.id==="fuel_isolation"),"The low-pressure fuel supply did not pass during cranking; isolate the supply-side cause before moving to air/mechanical checks.","Follow the exact engine/serial-specific low-pressure pinpoint sequence to separate pump output, filter/line restriction, tank pickup/vent restriction and air ingress. Do not use generic pressure limits or replace a component from this result alone.");
      if(/fuel supply meets specification/i.test(choice))
        return go(steps.find(item=>item.id==="air_exhaust"),"Fuel supply was verified within the applicable OEM specification during cranking.","Proceed to the engine-specific intake, exhaust and mechanical prerequisite checks. Preserve the fuel reading and the conditions under which it passed.");
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
        return go(steps.find(item=>item.id==="air_exhaust"),"The corrected low-pressure supply now meets the OEM specification during cranking.","Continue to the intake, exhaust and mechanical prerequisite checks. Preserve the before/after fuel readings and conditions.");
      if(/supply remains outside oem specification|air \/ restriction evidence remains/i.test(choice))
        return go(steps.find(item=>item.id==="fuel_isolation"),"The repeat cranking test still shows an abnormal low-pressure supply.","Return to the low-pressure pinpoint tests. The repair has not restored the required supply; isolate the remaining delivery, restriction or air-ingress cause.");
      if(/retest incomplete|conditions not reproduced/i.test(choice)) return hold(
        "The repaired fuel supply has not been verified under the original cranking conditions.",
        "Repeat the exact OEM test with the same test point, equipment and cranking conditions. Do not advance until the low-pressure result is conclusive."
      );
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
  if(step.id==="p016f_confirm"){
    if(/P009B-13 is also active/i.test(choice)) return hold(
      "P009B-13 is present with P016F00; Mack CBR K94743326 says diagnose the EPRV circuit fault first.",
      "Pause this P016F00 sequence. Follow the applicable K94743326 procedure for the confirmed chassis/emissions: inspect the EMS EA-to-VC1-to-EPRV wiring and connector, perform the specified de-energized continuity checks, repair any open/high resistance, or follow the bulletin's replacement direction when no wiring issue is found. Then verify whether P016F00 remains."
    );
    if(/vehicle, emissions or engine applicability unknown|outside listed cbr scope/i.test(choice))
      return hold("The Mack CBR applicability is not established.",
        "Stop before using the CBR-directed path. Confirm VIN, model, year, engine family/serial, common-rail configuration and emissions generation in PTT, then retrieve the current applicable Mack procedure.");
    if(/PTT version below 2\.7\.85|current guided diagnostics unavailable/i.test(choice))
      return hold("The published CBR guidance requires current Premium Tech Tool Guided Diagnostics.",
        "Update/confirm PTT 2.7.85 or newer as directed by K40914241, then load the latest guided diagnostic for the exact vehicle. Do not replace it with an invented generic pinpoint test.");
    if(/P0087-00, P016F-00 and P228F-00 all present/i.test(choice)){
      const attachedCodes = new Set(Object.values(record.entries || {}).flatMap(item =>
        Array.isArray(item?.faultCodes) ? item.faultCodes.map(fault =>
          clean(fault.code).toUpperCase().replace(/[^A-Z0-9]/g,"")) : []));
      const hasK010Combination = ["P008700","P016F00","P228F00"].every(code=>attachedCodes.has(code));
      if(!hasK010Combination) return hold(
        "The selected CBR option says all three trigger codes are present, but the complete P0087-00 / P016F-00 / P228F-00 set is not attached to this case.",
        "Attach the full scan-report fault set and confirm each code's controller and active/inactive status. Do not use the K01029637 filter inspection path until all three trigger codes are documented."
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
      return go(steps.find(item=>item.id==="p016f_cbr_filter"),"The full K01029637 code combination is attached and the entered model/year/engine/emissions meet the bulletin's candidate scope; confirm common-rail configuration in the OEM build data.",
        "Follow CBR K01029637 only after the VIN/build confirms common-rail configuration and exact applicability: inspect the fuel-tank vent filter and both hose connections, then remove and inspect the secondary fuel-filter lip seal. Photograph the required locations and attach them to the eService case.");
    }
    if(/P016F-00 present; K01029637 combination not present/i.test(choice))
      return go(steps[steps.findIndex(item=>item.id==="p016f_low_side")],"P016F00 is confirmed but the K01029637 three-code trigger is not present.",
        "Use the latest applicable PTT Guided Diagnostics (K40914241) for this engine and emissions configuration. Begin with the specified low-side supply checks; do not apply the K01029637 lip-seal CBR as though its code combination were met.");
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
        "Continue with current PTT Guided Diagnostics. Verify low-side supply pressure under the fault conditions using the exact engine-specific specification.");
  }
  // P016F00: a verified low-side pass must advance to high-side rail-pressure testing.
  if(step.id==="p016f_low_side"){
    if(/low-side pressure meets oem specification under the fault conditions/i.test(choice))
      return go(steps.find(item=>item.id==="p016f_high_side"),"Low-side supply pressure was verified within the applicable OEM specification under the conditions that set the fault.","The low side has passed. Move to the high-pressure system: compare commanded and actual rail pressure together under the same operating conditions. Record both values, units and OEM limits.");
    if(/below oem specification|pressure unstable|air \/ restriction evidence/i.test(choice))
      return go(steps.find(item=>item.id==="p016f_low_side_isolate"),"The low-side supply has not passed; a supply-side abnormality must be isolated before high-side conclusions.","Stay on the low side. Follow the exact engine-specific PTT pinpoint procedure to separate supply/transfer-pump output, filter or line restriction, tank pickup/vent restriction and air ingress. Change one condition at a time and record the measured response; do not replace a pump or filter from the pressure result alone.");
    if(/incomplete|specification unavailable/.test(choice))
      return hold("Low-side pressure has not been proven within specification.","Obtain the correct engine/serial-specific pressure specification and test point, then repeat the low-side test under the conditions that set P016F00. Do not treat missing data as a pass.");
  }
  if(step.id==="p016f_low_side_isolate"){
    if(/defect confirmed and corrected/i.test(choice))
      return go(steps.find(item=>item.id==="p016f_low_side_retest"),"A low-side supply defect was isolated and corrected; it now needs a repeat pressure test.","Repeat the same low-side pressure test at the same test point and operating conditions. Compare the actual value with the exact engine/serial-specific OEM specification before moving to rail-pressure diagnosis.");
    if(/defect identified; repair pending|component or restriction identified but not corrected/i.test(choice))
      return hold("A low-side defect has been identified but has not been corrected.","Complete the approved repair first. Do not proceed to high-side testing until the low-side supply is repaired and rechecked under the original fault conditions.");
    if(/no low-side cause isolated/i.test(choice))
      return hold("The low-side pressure is abnormal, but the cause has not been isolated.","Continue the applicable PTT low-pressure pinpoint tests. Verify test equipment and connections, supply/transfer-pump command and output, filter condition, tank pickup/vent, line restriction and air ingress only as prescribed for this engine. Record each result; do not guess or replace parts.");
    if(/incomplete|procedure unavailable|specification unavailable/i.test(choice))
      return hold("The low-side isolation procedure is incomplete or unavailable.","Obtain current engine/serial-specific Mack service information and complete the prescribed low-pressure pinpoint tests. Keep the case open; do not infer a failed component.");
  }
  if(step.id==="p016f_low_side_retest"){
    if(/low-side pressure meets oem specification under the original fault conditions/i.test(choice))
      return go(steps.find(item=>item.id==="p016f_high_side"),"The repaired low-side supply now meets the OEM specification under the original fault conditions.","Proceed to commanded-versus-actual rail-pressure testing. Preserve the before/after low-side readings and continue with the exact PTT high-pressure procedure.");
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
    if(/at least one listed yellow UQLS fault active\/confirmed and applicability verified/i.test(choice)) return go(
      steps[index+1],"At least one listed yellow UQLS fault is active/confirmed and the truck was confirmed within the bulletin scope.",
      "Inspect both UQLS harness connector halves for damaged pins/wires, corrosion and water intrusion."
    );
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
    if(/^(?!.*\b(?:none|no|did not)\b).*(?:listed yellow UQLS faults returned active\/confirmed|yellow faults returned|yellow UQLS faults returned)/i.test(choice)) return {
      stepId:step.id,title:"Replace DEF Level / UQLS sensor",
      reason:"One or more of the nine yellow UQLS faults returned after the prescribed repeat test.",
      action:"RECOMMENDATION: Replace the DEF Level / UQLS sensor. The Mack CBR 2107-22 replacement criteria are met because a listed yellow UQLS fault returned active/confirmed after the prescribed repeat checks. Confirm the VIN, chassis variant and emissions generation remain within the bulletin scope. Follow the current Mack Impact replacement procedure and TSB 258-040 for sensor replacement and wire routing. Save the before-and-after scan results. This is a bulletin-directed repair recommendation; verify the repair with the prescribed post-repair checks.",
      state:"review"
    };
    if(/none .*yellow.*faults.*returned|none of the nine listed yellow UQLS faults returned active|did not return active|yellow faults did not return/i.test(choice)) return {
      stepId:step.id,title:"No UQLS replacement indicated",reason:"None of the nine listed yellow UQLS faults returned active after the prescribed repeat test.",
      action:"Do not replace the UQLS under this procedure. Save the final scan report and release/continue service according to the shop's verification process.",
      state:"review"
    };
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
    vehicleContext:{make:clean(vehicle.make),model:clean(vehicle.model),engine:clean(vehicle.engine),missing:missingVehicle},
    crossSystemSignals:crossSystemSignals(caseRecord,system),
    verifiedCaseMatches:matches,
    knowledgePolicy:"Only technician-marked verified cases with a recorded cause and repair can appear as references. References never override current evidence or OEM procedures.",
    caution:workflowCaution(caseRecord.workflowId),
    limitations,
    relatedCaseCount:Array.isArray(options.relatedCases) ? options.relatedCases.length : 0
  };
}
