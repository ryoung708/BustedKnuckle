// Complaint-intake similarity search across technician local and private saved cases.
// Similarity is a retrieval aid only; it never infers a diagnosis.
const STOP = new Set(["this","that","with","from","when","where","what","have","been","were","will","your","into","then","than","only","both","after","before","under","over","there","their","they","them","does","did","could","would","should","fault","issue","case","test","check","reading","actual","vehicle","truck","engine","system","module","modules","found","not","yes","and","for","the","complaint","customer","reported"]);
const ELECTRICAL_IDS = /j1939|network|electrical|voltage|short|open_circuit|light_inop|intermittent|wiring|power_ground/i;
function text(value) { return String(value ?? "").trim(); }
function norm(value) { return text(value).toLowerCase(); }
function tokens(value) { return [...new Set(norm(value).split(/[^a-z0-9]+/).filter(word => word.length > 3 && !STOP.has(word)))]; }
function faultCodes(record = {}) {
  const fromEntries = (record.entries ? Object.values(record.entries) : [])
    .flatMap(entry => Array.isArray(entry?.faultCodes) ? entry.faultCodes : []);
  const direct = Array.isArray(record.faultCodes) ? record.faultCodes : [];
  return [...fromEntries, ...direct]
    .map(fault => norm(typeof fault === "string" ? fault : fault?.code).replace(/[^a-z0-9]/g, ""))
    .filter(Boolean);
}
function candidateSystem(record, workflows = {}) {
  const id = text(record.workflowId || record.workflow || record.pathId);
  if (ELECTRICAL_IDS.test(id)) return "electrical";
  const category = norm(workflows[id]?.category || record.category);
  if (/electrical|network/.test(category)) return "electrical";
  if (/engine|after.?treatment|drivetrain|powertrain|fuel|cooling|transmission/.test(category)) return "powertrain";
  const complaint = norm(record.complaint || record.symptom || record.customerComplaint);
  if (/j1939|can network|data link|voltage drop|short to ground|harness|lighting|no crank|starter/.test(complaint)) return "electrical";
  if (/dpf|def|regen|transmission|gearbox|low power|derate|engine/.test(complaint)) return "powertrain";
  return "general";
}
function vehicleOf(record = {}) {
  const v = record.vehicle || {};
  return {make:text(v.make || record.make || record.truckMake),model:text(v.model || record.model || record.truckModel),engine:text(v.engine || record.engine || record.engineModel),year:text(v.year || record.year || record.modelYear)};
}
function complaintOf(record = {}) { return text(record.complaint || record.symptom || record.customerComplaint || record.description); }
function verified(record = {}) { return record.verification === "verified" || record.status === "confirmed"; }
function hasUsefulOutcome(record = {}) { return Boolean(text(record.rootCause || record.confirmedCause || record.cause) || text(record.repairPerformed || record.repair || record.resolution)); }
export function findSimilarDiagnosticCases(current = {}, candidates = [], workflows = {}) {
  const complaint = complaintOf(current), currentTokens = tokens(complaint);
  if (currentTokens.length < 2) return [];
  const system = current.system || candidateSystem(current, workflows), currentVehicle = vehicleOf(current), currentCodes = new Set(faultCodes(current));
  return candidates.filter(candidate => candidate && candidate.id && candidate.id !== current.id).map(candidate => {
    const candidateComplaint = complaintOf(candidate);
    if (!candidateComplaint) return null;
    const candidateType = candidateSystem(candidate, workflows);
    if (system !== "general" && candidateType !== "general" && candidateType !== system) return null;
    const candidateTokens = tokens(candidateComplaint + " " + text(workflows[candidate.workflowId]?.title));
    const sharedTerms = currentTokens.filter(token => candidateTokens.includes(token));
    const vehicle = vehicleOf(candidate);
    const sameMake = Boolean(currentVehicle.make && norm(currentVehicle.make) === norm(vehicle.make));
    const sameModel = Boolean(currentVehicle.model && norm(currentVehicle.model) === norm(vehicle.model));
    const sameEngine = Boolean(currentVehicle.engine && norm(currentVehicle.engine) === norm(vehicle.engine));
    const sameVehicle = sameMake && sameModel;
    const candidateCodes = new Set(faultCodes(candidate));
    const exactCodes = [...currentCodes].filter(code => candidateCodes.has(code));
    const thresholdMet = exactCodes.length > 0 || (sharedTerms.length >= 2 && (sameEngine || sameVehicle)) || sharedTerms.length >= 4;
    if (!thresholdMet) return null;
    const score = exactCodes.length * 100 + sharedTerms.length * 8 + (sameMake ? 5 : 0) + (sameModel ? 8 : 0) + (sameEngine ? 10 : 0) + (verified(candidate) && hasUsefulOutcome(candidate) ? 15 : 0);
    const cause = text(candidate.rootCause || candidate.confirmedCause || candidate.cause);
    const repair = text(candidate.repairPerformed || candidate.repair || candidate.resolution);
    return {id:String(candidate.id),title:[vehicle.year,vehicle.make,vehicle.model,vehicle.engine].filter(Boolean).join(" ") || candidateComplaint.slice(0,80) || "Saved diagnostic case",complaint:candidateComplaint,rootCause:cause,repairPerformed:repair,verified:verified(candidate) && hasUsefulOutcome(candidate),sharedTerms:sharedTerms.slice(0,6),matchReason:exactCodes.length ? "Matching fault code: " + exactCodes.join(", ") : sharedTerms.length + " shared symptom terms" + ((sameVehicle || sameEngine) ? " with matching vehicle / engine context." : "."),score};
  }).filter(Boolean).sort((a,b) => b.score-a.score).slice(0,5);
}
