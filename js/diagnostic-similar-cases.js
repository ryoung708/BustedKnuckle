// Complaint-intake similarity search across technician local and private saved cases.
// Similarity is a retrieval aid only; it never infers a diagnosis.
const STOP = new Set(["this","that","with","from","when","where","what","have","been","were","will","your","into","then","than","only","both","after","before","under","over","there","their","they","them","does","did","could","would","should","fault","issue","case","test","check","reading","actual","vehicle","truck","engine","system","module","modules","found","not","yes","and","for","the","complaint","customer","reported"]);
const ELECTRICAL_IDS = /j1939|network|electrical|voltage|short|open_circuit|light_inop|intermittent|wiring|power_ground/i;
function text(value) { return String(value ?? "").trim(); }
function norm(value) { return text(value).toLowerCase(); }
function tokens(value) { return [...new Set(norm(value).split(/[^a-z0-9]+/).filter(word => word.length > 3 && !STOP.has(word)))]; }
function faultIdentities(record = {}) {
  const fromEntries = (record.entries ? Object.values(record.entries) : [])
    .flatMap(entry => Array.isArray(entry?.faultCodes) ? entry.faultCodes : []);
  const direct = Array.isArray(record.faultCodes) ? record.faultCodes : [];
  return [...fromEntries, ...direct].map(fault => {
    const item = typeof fault === "string" ? { code: fault } : (fault || {});
    const rawCode = text(item.code || item.faultCode || item.spn);
    const embeddedFmi = rawCode.match(/\bFMI\s*[:#-]?\s*(\d+)\b/i)?.[1] || "";
    const code = rawCode.toUpperCase().replace(/\bFMI\s*[:#-]?\s*\d+\b/ig, "").replace(/[^A-Z0-9]/g, "").replace(/^SPN/, "");
    const fmi = text(item.fmi || embeddedFmi).replace(/[^0-9]/g, "");
    const controller = norm(item.controller || item.module || item.ecu).replace(/[^a-z0-9]/g, "");
    return { code, fmi, controller, display: [rawCode || code, fmi ? "FMI " + fmi : "", text(item.controller || item.module || item.ecu)].filter(Boolean).join(" · ") };
  }).filter(item => item.code);
}
function matchFaultIdentities(current, candidate) {
  const matches = [];
  for (const a of current) for (const b of candidate) {
    if (a.code !== b.code) continue;
    if (a.fmi && b.fmi && a.fmi !== b.fmi) continue;
    if (a.controller && b.controller && a.controller !== b.controller) continue;
    matches.push({
      code: a.code,
      fmi: a.fmi || b.fmi,
      controller: a.controller || b.controller,
      score: 100 + (a.fmi && b.fmi ? 20 : 0) + (a.controller && b.controller ? 15 : 0)
    });
  }
  const unique = new Map();
  for (const match of matches) {
    const key = [match.code, match.fmi, match.controller].join("|");
    if (!unique.has(key) || unique.get(key).score < match.score) unique.set(key, match);
  }
  return [...unique.values()];
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
function hasUsefulOutcome(record = {}) { return Boolean(text(record.rootCause || record.confirmedCause || record.cause) && text(record.repairPerformed || record.repair || record.resolution)); }
export function findSimilarDiagnosticCases(current = {}, candidates = [], workflows = {}) {
  const complaint = complaintOf(current), currentTokens = tokens(complaint);
  const currentVehicle = vehicleOf(current), currentFaults = faultIdentities(current);
  const system = current.system || candidateSystem(current, workflows);
  return candidates.filter(candidate => candidate && candidate.id && candidate.id !== current.id).map(candidate => {
    const candidateComplaint = complaintOf(candidate);
    const candidateFaults = faultIdentities(candidate);
    const faultMatches = matchFaultIdentities(currentFaults, candidateFaults);
    // A fault-code-only lookup is valid; do not require complaint prose for it.
    if (!candidateComplaint && !faultMatches.length) return null;
    const candidateType = candidateSystem(candidate, workflows);
    if (system !== "general" && candidateType !== "general" && candidateType !== system) return null;
    const candidateTokens = tokens(candidateComplaint + " " + text(workflows[candidate.workflowId]?.title));
    const sharedTerms = currentTokens.filter(token => candidateTokens.includes(token));
    const vehicle = vehicleOf(candidate);
    const sameMake = Boolean(currentVehicle.make && norm(currentVehicle.make) === norm(vehicle.make));
    const sameModel = Boolean(currentVehicle.model && norm(currentVehicle.model) === norm(vehicle.model));
    const sameEngine = Boolean(currentVehicle.engine && norm(currentVehicle.engine) === norm(vehicle.engine));
    const sameVehicle = sameMake && sameModel;
    const thresholdMet = faultMatches.length > 0 || (sharedTerms.length >= 2 && (sameEngine || sameVehicle)) || sharedTerms.length >= 4;
    if (!thresholdMet) return null;
    const bestFaultScore = faultMatches.reduce((best, item) => Math.max(best, item.score), 0);
    const score = bestFaultScore + sharedTerms.length * 8 + (sameMake ? 5 : 0) + (sameModel ? 8 : 0) + (sameEngine ? 10 : 0) + (verified(candidate) && hasUsefulOutcome(candidate) ? 15 : 0);
    const cause = text(candidate.rootCause || candidate.confirmedCause || candidate.cause);
    const repair = text(candidate.repairPerformed || candidate.repair || candidate.resolution);
    const faultReason = faultMatches.length ? "Matching fault: " + faultMatches.map(item => [item.code, item.fmi ? "FMI " + item.fmi : "", item.controller].filter(Boolean).join(" · ")).join(", ") : "";
    return {id:String(candidate.id),title:[vehicle.year,vehicle.make,vehicle.model,vehicle.engine].filter(Boolean).join(" ") || candidateComplaint.slice(0,80) || "Saved diagnostic case",complaint:candidateComplaint,rootCause:cause,repairPerformed:repair,verified:verified(candidate) && hasUsefulOutcome(candidate),sharedTerms:sharedTerms.slice(0,6),faultMatches,matchReason:faultReason || sharedTerms.length + " shared symptom terms" + ((sameVehicle || sameEngine) ? " with matching vehicle / engine context." : "."),score};
  }).filter(Boolean).sort((a,b) => b.score-a.score).slice(0,5);
}
