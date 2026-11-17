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
  "short_ground","short_power","open_circuit","voltage_drop","intermittent"
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
    .map(f => lower(f.code).replace(/\\s+/g, ""))
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
function recommendationFor(record, steps, system) {
  if (system === "electrical") return recommendNextStep(record, steps);
  if (!Array.isArray(steps) || !steps.length) return null;
  const entries = record.entries || {};
  const index = Math.max(0,Math.min(Number(record.currentStep)||0,steps.length-1));
  const current = steps[index];
  const currentEntry = entries[current?.id] || {};
  const hasMeasurements = Object.values(currentEntry.measurements || {}).some(populated);
  if (hasMeasurements && !populated(currentEntry.choice))
    return {stepId:current.id,reason:"Measurements were entered without a selected observation.",action:"Select the observation that matches the actual test result, or leave this stage open and explain what remains unknown.",state:"hold"};
  if (record.status === "ready-for-review" || record.finishedEarly || index >= steps.length-1)
    return {stepId:current?.id,reason:"The technician has reached a review point or finished the workflow early.",action:"Review the physical cause, repair details and verification evidence. Do not promote an unverified cause to a diagnosis.",state:"review"};
  const next = steps[index+1];
  return next ? {stepId:next.id,reason:populated(currentEntry.choice) ? "The current observation is recorded; continue with the next powertrain workflow stage." : "No observation is recorded for the current stage.",action:populated(currentEntry.choice) ? "Perform the next check using the exact vehicle-specific procedure and record the conditions and result." : "Complete or explicitly defer the current check before treating later evidence as meaningful.",state:populated(currentEntry.choice) ? "next" : "hold"} : null;
}
function workflowCaution(workflowId) {
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
      reason:recommendation.reason,action:recommendation.action,state:recommendation.state || "next"
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
