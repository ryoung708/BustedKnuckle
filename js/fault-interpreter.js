import { globalFaultLibrary } from "./database.js";
import additions from "../data/fault-overrides.json" with { type: "json" };
import fmiReference from "../data/standard-fmi-reference.json" with { type: "json" };

const FMI_MEANINGS = fmiReference.entries || {};
const FMI_SOURCE_NOTE = "Generic FMI reference: plain-language paraphrase of SAE J1939/73 failure-mode concepts; verify the applicable edition and OEM implementation.";

const library = { ...globalFaultLibrary, ...(additions.faults || {}) };
const normalize = value => String(value || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
function parseInput(raw) {
  const value = String(raw || "").trim().toUpperCase();
  if (!value) return null;
  const p = value.match(/P[0-9A-F]{4}(?:[-_ ]?[0-9A-F]{2})?/);
  const spn = value.match(/SPN\s*[:#=-]?\s*(\d+)/i) || value.match(/\b(\d{1,6})\s*[,/ ]+\s*(?:FMI\s*)?(\d{1,2})\b/i);
  const fmi = value.match(/FMI\s*[:#=-]?\s*(\d{1,2})/i);
  let pCode = p ? p[0].replace(/[-_ ]/g, "") : "";
  const spnValue = spn ? Number(spn[1]) : null;
  const fmiValue = fmi ? Number(fmi[1]) : (spn && spn[2] ? Number(spn[2]) : null);
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
    const matches = entries.filter(([, record]) => Number(record.spn) === parsed.spn && Number(record.fmi) === parsed.fmi);
    // Do not silently choose the first result if the pair is ambiguous across the prototype library.
    if (matches.length === 1) return { id: matches[0][0], record: matches[0][1] };
  }
  return null;
}
export function interpretFaultCode(raw) {
  const parsed = parseInput(raw);
  if (!parsed) return { status:"empty", title:"Enter a fault code", description:"Add an OEM code or an SPN/FMI pair to see what IronKnuckle can identify.", detail:"", source:"", caution:"" };
  const match = findRecord(parsed);
  const fmiMeaning = parsed.fmi !== null ? (FMI_MEANINGS[String(parsed.fmi)] || "No generic FMI explanation is available in this reference.") : "";
  if (match) {
    return {
      status:"library-match",
      title: match.record.p_code || match.id,
      description: match.record.description || "A matching library record exists, but it has no description.",
      detail: parsed.spn !== null && parsed.fmi !== null ? `SPN ${parsed.spn} · FMI ${parsed.fmi}${fmiMeaning ? " — " + fmiMeaning : ""}` : (fmiMeaning ? `Generic FMI reference: ${fmiMeaning}` : "Matched an existing IronKnuckle fault-library entry."),
      source: parsed.fmi !== null ? FMI_SOURCE_NOTE : "Definition source has not yet been independently verified.",
      caution:"This is an existing prototype-library entry, not a verified OEM definition. Confirm the code, controller, engine, emissions generation and calibration in approved service information. No repair or root cause is inferred."
    };
  }
  if (parsed.spn !== null && parsed.fmi !== null) {
    return {
      status:"generic-only",
      title:`SPN ${parsed.spn} · FMI ${parsed.fmi}`,
      description:"No exact SPN/FMI record is currently in the IronKnuckle library.",
      detail:fmiMeaning || "No generic FMI explanation is available in this reference.",
      source:FMI_SOURCE_NOTE,
      caution:"The FMI describes the type of failure indication, not the failed component. The SPN meaning must be confirmed for the reporting controller and vehicle. Do not select parts from this generic interpretation."
    };
  }
  return {
    status:"not-found",
    title:"No exact library match",
    description:"IronKnuckle does not currently have a matching definition for this code.",
    detail:"Check the spelling and enter the full OEM code, or enter the SPN and FMI as separate values (for example: SPN 3515 FMI 4).",
    source:"No verified definition source is currently attached to this code.",
    caution:"Code meanings can vary by manufacturer, controller, engine family, emissions generation and calibration. Use the OEM diagnostic tool and approved service information."
  };
}
