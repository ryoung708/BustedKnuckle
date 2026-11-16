// IronKnuckle Diagnostic Brain v1
// Shared evidence orchestration for WiringHound and Diagnostic Command Center.
// Deterministic recommendations only: this module does not diagnose or condemn components.
import { recommendNextStep } from "./wiringhound-decision-engine.js";
import { workflows } from "./diagnostic-engine.js";

const clean = value => String(value ?? "").trim();
const populated = value => clean(value).length > 0;

function summarizeEvidence(entries = {}) {
  const rows = Object.entries(entries).map(([stepId, entry]) => ({stepId, ...(entry || {})}));
  const observed = rows.filter(row => populated(row.choice));
  const measured = rows.filter(row => {
    const m = row.measurements || {};
    return [m.actual, m.testPoints, m.condition, m.canH, m.canL, m.voltage, m.resistance]
      .some(populated);
  });
  const notes = rows.filter(row => populated(row.notes));
  const faultCodes = rows.flatMap(row => Array.isArray(row.faultCodes) ? row.faultCodes : []);
  return {
    stagesWithObservations: observed.length,
    stagesWithMeasurements: measured.length,
    stagesWithNotes: notes.length,
    faultCodeCount: faultCodes.length,
    observations: observed.map(row => ({stepId: row.stepId, choice: clean(row.choice)})),
    hasPhysicalFinding: observed.some(row => /damage|corrosion|fault found|defect found|isolated to a segment/i.test(clean(row.choice)))
  };
}

function workflowCaution(workflowId) {
  const normalized = workflowId === "j1939_network" ? "j1939_dropout" : workflowId;
  return workflows[normalized]?.caution ||
    "Use the exact vehicle-specific service information, wiring diagram and approved test procedure.";
}

export function analyzeDiagnosticCase(caseRecord = {}, steps = [], options = {}) {
  const entries = caseRecord.entries || {};
  const evidence = summarizeEvidence(entries);
  const vehicle = caseRecord.vehicle || {};
  const missingVehicle = ["make", "model", "engine"].filter(key => !populated(vehicle[key]));
  const workflowId = caseRecord.workflowId || "";
  const recommendation = recommendNextStep(caseRecord, steps);
  const current = steps.find(step => step.id === recommendation?.stepId) || null;
  const currentEntry = entries[steps[caseRecord.currentStep || 0]?.id] || {};
  const measurementOnly = !populated(currentEntry.choice) &&
    Object.values(currentEntry.measurements || {}).some(populated);
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

  return {
    version: 1,
    engine: "rule-based-evidence-orchestrator",
    status,
    workflowId,
    recommendation: recommendation ? {
      stepId: recommendation.stepId,
      stepTitle: current?.title || recommendation.stepId,
      reason: recommendation.reason,
      action: recommendation.action,
      state: recommendation.state || "next"
    } : null,
    evidence,
    vehicleContext: {
      make: clean(vehicle.make), model: clean(vehicle.model), engine: clean(vehicle.engine),
      missing: missingVehicle
    },
    caution: workflowCaution(workflowId),
    limitations,
    relatedCaseCount: Array.isArray(options.relatedCases) ? options.relatedCases.length : 0,
    relatedCasePolicy: "Related cases are reference material only; they do not override current test evidence or OEM procedures."
  };
}
