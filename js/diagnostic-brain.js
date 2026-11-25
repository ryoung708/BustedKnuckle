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
    explanation = "The recorded workflow has reached a review point. Confirm the physical cause, repair and repeat-test evidence before closing the case.";
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
  // Explicit branches for the Mack P205B64 applicability gate and final repeat test.
  // These decisions remain inside the shared recommendation engine.
  if(step.id==="p205b_applicability"){
    if(/none of the listed yellow|inactive|historic/.test(choice)) return {
      stepId:step.id,reason:"No listed yellow UQLS fault is active/confirmed.",
      action:"Do not troubleshoot or replace the UQLS under CBR 2107-22. Save the scan report and use applicable guided diagnostics for any green codes or other symptoms.",
      state:"review"
    };
    if(/AN\\(4\\)|PR\\(4\\)|unknown|stop/.test(choice)) return hold(
      "The 2026 Mack CBR applicability has not been established or this variant is excluded.",
      "Stop this guided path. Confirm the VIN, exact chassis variant and emissions generation, then retrieve the applicable Mack procedure. Do not carry on with CBR 2107-22."
    );
    if(/at least one listed yellow UQLS fault active\\/confirmed and applicability verified/i.test(choice)) return go(
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
    if(/one or more listed yellow UQLS faults returned active\/confirmed|returned active\/confirmed/.test(choice)) return {
      stepId:step.id,reason:"One or more of the nine listed yellow UQLS faults returned active/confirmed after the prescribed repeat test.",
      action:"The applicable Mack CBR supports UQLS replacement at this point. Confirm the VIN/variant still matches the bulletin and use the current Mack Impact procedure plus TSB 258-040 for sensor replacement and wire routing. Record the before/after scan results.",
      state:"review"
    };
    if(/none of the nine listed yellow UQLS faults returned active|did not return active/.test(choice)) return {
      stepId:step.id,reason:"None of the nine listed yellow UQLS faults returned active after the prescribed repeat test.",
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
      stepId:recommendation.stepId,stepTitle:current?.title || recommendation.stepId,
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
