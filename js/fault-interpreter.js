import { globalFaultLibrary } from "./database.js";
import additions from "../data/fault-overrides.json" with { type: "json" };

const FMI_MEANINGS = {
  0:"Data valid but above the normal operating range (most severe level)",
  1:"Data valid but below the normal operating range (most severe level)",
  2:"Data erratic, intermittent or incorrect",
  3:"Voltage above normal or shorted high",
  4:"Voltage below normal or shorted low",
  5:"Current below normal or open circuit",
  6:"Current above normal or shorted to ground",
  7:"Mechanical system not responding properly or out of adjustment",
  8:"Abnormal frequency, pulse width or period",
  9:"Abnormal update rate",
  10:"Abnormal rate of change",
  11:"Failure mode not identifiable from the available data",
  12:"Bad intelligent device or component",
  13:"Out of calibration",
  14:"Special instructions",
  15:"Data valid but above normal range (least severe level)",
  16:"Data valid but above normal range (moderately severe level)",
  17:"Data valid but below normal range (least severe level)",
  18:"Data valid but below normal range (moderately severe level)",
  19:"Received network data in error",
  20:"Data drifted high",
  21:"Data drifted low",
  31:"Condition exists"
};

const library = { ...globalFaultLibrary, ...(additions.faults || {}) };
const normalize = value => String(value || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
function parseInput(raw) {
  const value = String(raw || "").trim().toUpperCase();
  if (!value) return null;
  const p = value.match(/P[0-9A-F]{4}(?:[-_ ]?[0-9A-F]{2})?/);
  const spn = value.match(/SPN\s*[:#=-]?\s*(\d+)/i) || value.match(/\b(\d{1,6})\s*[,/ ]+\s*(?:FMI\s*)?(\d{1,2})\b/i);
  const fmi = value.match(/FMI\s*[:#=-]?\s*(\d{1,2})/i);
  let pCode = p ? p[0].replace(/[-_ ]/g, "") : "";
  let spnValue = spn ? Number(spn[1]) : null;
  let fmiValue = fmi ? Number(fmi[1]) : (spn && spn[2] ? Number(spn[2]) : null);
  if (pCode && pCode.length === 7) pCode = pCode.slice(0,5) + pCode.slice(5);
  return { pCode, spn: Number.isInteger(spnValue) ? spnValue : null, fmi: Number.isInteger(fmiValue) ? fmiValue : null };
}
function findRecord(parsed) {
  if (!parsed) return null;
  const entries = Object.entries(library);
  if (parsed.pCode) {
    const target = normalize(parsed.pCode);
    const found = entries.find(([key, record]) =>
      normalize(key) === target || normalize(record.p_code) === target ||
      (target.length === 5 && normalize(record.p_code).startsWith(target))
    );
    if (found) return { id: found[0], record: found[1] };
  }
  if (parsed.spn !== null && parsed.fmi !== null) {
    const found = entries.find(([, record]) => Number(record.spn) === parsed.spn && Number(record.fmi) === parsed.fmi);
    if (found) return { id: found[0], record: found[1] };
  }
  return null;
}
export function interpretFaultCode(raw) {
  const parsed = parseInput(raw);
  if (!parsed) return { status:"empty", title:"Enter a fault code", description:"Add an OEM code or an SPN/FMI pair to see what IronKnuckle can identify.", detail:"", caution:"" };
  const match = findRecord(parsed);
  const fmiMeaning = parsed.fmi !== null ? (FMI_MEANINGS[parsed.fmi] || "No generic FMI explanation is available in this reference.") : "";
  if (match) {
    return {
      status:"library-match",
      title: match.record.p_code || match.id,
      description: match.record.description || "A matching library record exists, but it has no description.",
      detail: parsed.spn !== null && parsed.fmi !== null ? `SPN ${parsed.spn} · FMI ${parsed.fmi}${fmiMeaning ? " — " + fmiMeaning : ""}` : (fmiMeaning ? `Generic FMI reference: ${fmiMeaning}` : "Matched an existing IronKnuckle fault-library entry."),
      caution:"This is an existing prototype-library entry, not a verified OEM definition. Confirm the code, controller, engine, emissions generation and calibration in approved service information. No repair or root cause is inferred."
    };
  }
  if (parsed.spn !== null && parsed.fmi !== null) {
    return {
      status:"generic-only",
      title:`SPN ${parsed.spn} · FMI ${parsed.fmi}`,
      description:"No exact SPN/FMI record is currently in the IronKnuckle library.",
      detail:fmiMeaning || "No generic FMI explanation is available in this reference.",
      caution:"The FMI describes the type of failure indication, not the failed component. The SPN meaning must be confirmed for the reporting controller and vehicle. Do not select parts from this generic interpretation."
    };
  }
  return {
    status:"not-found",
    title:"No exact library match",
    description:"IronKnuckle does not currently have a matching definition for this code.",
    detail:"Check the spelling and enter the full OEM code, or enter the SPN and FMI as separate values (for example: SPN 3515 FMI 4).",
    caution:"Code meanings can vary by manufacturer, controller, engine family, emissions generation and calibration. Use the OEM diagnostic tool and approved service information."
  };
}
