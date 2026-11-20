// Shared additive case envelope used by Diagnostic Command Center and WiringHound.
// The original workspace payload is preserved for backward compatibility.
export function createCaseRecord(raw, sourceApp) {
  if (!raw || typeof raw !== "object" || !raw.id) throw new TypeError("A saved case with an id is required.");
  const vehicle = raw.vehicle && typeof raw.vehicle === "object" ? raw.vehicle : {};
  const entries = raw.entries && typeof raw.entries === "object" ? raw.entries : {};
  return {
    ...raw,
    caseEnvelope: {
      schema: "ironknuckle.case",
      schemaVersion: 1,
      sourceApp: sourceApp === "wiringhound" ? "wiringhound" : "diagnostic_command_center",
      caseId: String(raw.id),
      createdAt: raw.createdAt || null,
      updatedAt: raw.updatedAt || null,
      vehicle: {
        year: String(vehicle.year || ""),
        make: String(vehicle.make || ""),
        model: String(vehicle.model || ""),
        vinLast6: String(vehicle.vinLast6 || ""),
        engineManufacturer: String(vehicle.engineManufacturer || vehicle.engineMake || ""),
        engineModel: String(vehicle.engineModel || vehicle.engine || ""),
        engineModel: String(vehicle.engineModel || vehicle.engine || ""),
        engine: String(vehicle.engine || vehicle.engineModel || ""),
        transmissionManufacturer: String(vehicle.transmissionManufacturer || vehicle.transmissionMake || ""),
        transmissionModel: String(vehicle.transmissionModel || vehicle.transmission || ""),
        emissionsFamily: String(vehicle.emissionsFamily || vehicle.emissions || ""),
        emissions: String(vehicle.emissions || vehicle.emissionsFamily || "")
      },
      complaint: String(raw.complaint || ""),
      workflowId: String(raw.workflowId || ""),
      status: String(raw.status || "in-progress"),
      verification: String(raw.verification || "unverified"),
      rootCause: String(raw.rootCause || ""),
      repairPerformed: String(raw.repairPerformed || ""),
      entryCount: Object.keys(entries).length,
      entries,
      evidenceCount: Object.values(entries).reduce((total, entry) => total + (Array.isArray(entry?.evidence) ? entry.evidence.length : 0), 0),
      reviewState: raw.verification === "verified" && raw.rootCause && raw.repairPerformed ? "candidate_for_review" : "unreviewed"
    }
  };
}
