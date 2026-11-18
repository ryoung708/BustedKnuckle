const STORE = "ironknuckle.faultSubmissions.v1";
const ALLOWED_TYPES = new Set(["obd2","j1939","oem","unknown"]);
function readQueue(storage = globalThis.localStorage) {
  try { const value = JSON.parse(storage?.getItem(STORE) || "[]"); return Array.isArray(value) ? value : []; }
  catch { return []; }
}
export function createFaultSubmission(input = {}) {
  const code = String(input.code || "").trim().toUpperCase();
  const codeType = ALLOWED_TYPES.has(input.codeType) ? input.codeType : "unknown";
  if (!code) throw new Error("Enter the fault code or SPN first.");
  if (!String(input.description || "").trim() && !String(input.notes || "").trim()) {
    throw new Error("Add a description or technician observation so the review team has something useful to evaluate.");
  }
  return {
    id: "fault-sub-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2,8),
    code, codeType,
    manufacturer: String(input.manufacturer || "").trim(),
    controller: String(input.controller || "").trim(),
    engineFamily: String(input.engineFamily || "").trim(),
    modelYear: String(input.modelYear || "").trim(),
    emissions: String(input.emissions || "").trim(),
    description: String(input.description || "").trim(),
    source: String(input.source || "").trim(),
    notes: String(input.notes || "").trim(),
    rootCause: String(input.rootCause || "").trim(),
    repair: String(input.repair || "").trim(),
    verification: String(input.verification || "unverified"),
    reviewStatus: "pending-review",
    submittedAt: new Date().toISOString(),
    confidence: "unverified",
    promotionNote: "Local technician submission. Not a trusted catalog definition until independently reviewed."
  };
}
export function saveFaultSubmission(input, storage = globalThis.localStorage) {
  if (!storage) throw new Error("Local browser storage is unavailable.");
  const item = createFaultSubmission(input);
  const queue = readQueue(storage);
  queue.push(item);
  storage.setItem(STORE, JSON.stringify(queue));
  return item;
}
export function exportFaultSubmissions(storage = globalThis.localStorage) {
  return JSON.stringify({
    product:"IronKnuckle",
    type:"fault-definition-submissions",
    schemaVersion:1,
    exportedAt:new Date().toISOString(),
    reviewStatus:"pending-review",
    submissions:readQueue(storage)
  }, null, 2);
}
export function getFaultSubmissionCount(storage = globalThis.localStorage) {
  return readQueue(storage).length;
}
export function clearFaultSubmissions(storage = globalThis.localStorage) {
  storage?.removeItem(STORE);
}
