import { globalFaultLibrary } from "./database.js";
import additions from "../data/fault-overrides.json" with { type: "json" };
import fmiReference from "../data/standard-fmi-reference.json" with { type: "json" };
import obdReference from "../data/obd2-standard-codes.json" with { type: "json" };
import j1939Reference from "../data/j1939-spn-reference.json" with { type: "json" };
import oemReference from "../data/oem-fault-catalog.json" with { type: "json" };

const FMI_MEANINGS = fmiReference.entries || {};
const FMI_SOURCE_NOTE = "Generic FMI reference: original plain-language paraphrase of SAE J1939/73 failure-mode concepts. Confirm current edition and OEM implementation.";
const legacyLibrary = { ...globalFaultLibrary, ...(additions.faults || {}) };
const obdByCode = new Map((obdReference.records || []).map(item => [normalize(item.code), item]));
const spnByNumber = new Map((j1939Reference.records || []).map(item => [Number(item.spn), item]));
const oemRecords = oemReference.records || [];
function normalize(value) { return String(value || "").toUpperCase().replace(/[^A-Z0-9]/g, ""); }

export function parseFaultInput(raw) {
  const value = String(raw || "").trim().toUpperCase();
  if (!value) return null;
  const proprietary = value.match(/\b(PSID|PPID|SID|PID)\s*[:#=-]?\s*(\d+)(?:\s*[/, ]*\s*(?:FMI\s*)?(\d{1,2}))?\b/i);
  if (proprietary) return {
    pCode:"", pSuffix:"", spn:null, fmi:proprietary[3] ? Number(proprietary[3]) : null,
    sourceAddress:null, proprietaryType:proprietary[1].toUpperCase(),
    proprietaryNumber:Number(proprietary[2])
  };
  const p = value.match(/\b[PU][0-9A-F]{4}(?:[-_ ]?[0-9A-F]{2})?\b/);
  const triple = value.match(/\b(\d{1,3})\s*[/, ]\s*(?:SPN\s*)?(\d{1,6})\s*[/, ]\s*(?:FMI\s*)?(\d{1,2})\b/i);
  const spnMatch = value.match(/SPN\s*[:#=-]?\s*(\d+)/i) || value.match(/\b(\d{1,6})\s*[,/ ]+\s*(?:FMI\s*)?(\d{1,2})\b/i);
  const fmiMatch = value.match(/FMI\s*[:#=-]?\s*(\d{1,2})/i);
  const pCode = p ? p[0].split(/[-_ ]/)[0] : "";
  const suffix = p && /[-_ ]/.test(p[0]) ? p[0].match(/[-_ ]([0-9A-F]{2})$/)?.[1] || "" : "";
  const spn = triple ? Number(triple[2]) : (spnMatch ? Number(spnMatch[1]) : null);
  const fmi = triple ? Number(triple[3]) : (fmiMatch ? Number(fmiMatch[1]) : (spnMatch?.[2] ? Number(spnMatch[2]) : null));
  const sourceAddress = triple ? Number(triple[1]) : null;
  return { pCode, pSuffix:suffix, spn:Number.isInteger(spn)?spn:null, fmi:Number.isInteger(fmi)?fmi:null, sourceAddress, proprietaryType:"", proprietaryNumber:null };
}

function findOemRecord(raw, parsed) {
  const supplied = normalize(raw);
  const candidates = oemRecords.filter(record => {
    const queryCode = parsed.proprietaryType
      ? parsed.proprietaryType + parsed.proprietaryNumber + (parsed.fmi !== null ? "FMI" + parsed.fmi : "")
      : parsed.pCode ? parsed.pCode + (parsed.pSuffix || "")
      : (parsed.spn !== null ? "SPN"+parsed.spn+(parsed.fmi !== null ? "FMI"+parsed.fmi : "") : "");
    const recordCode = normalize(record.code);
    // Match both the interpreted token and the exact normalized input. This keeps compact OEM forms
    // (for example P205B64) resolvable even if a parser normalization changes later.
    const codeMatch = recordCode === normalize(queryCode) || recordCode === supplied;
    if (!codeMatch) return false;
    const manufacturer = normalize(record.manufacturer);
    const manufacturerWasSpecified = oemRecords.some(item => item.manufacturer && supplied.includes(normalize(item.manufacturer)));
    return !manufacturer || !manufacturerWasSpecified || supplied.includes(manufacturer);
  });
  return candidates.length === 1 ? {record:candidates[0]} : {ambiguous:candidates.length > 1, count:candidates.length};
}
function legacyMatch(parsed) {
  const entries = Object.entries(legacyLibrary);
  if (parsed.pCode) {
    const target = normalize(parsed.pCode);
    const found = entries.find(([key, record]) => normalize(key) === target || normalize(record.p_code) === target || (target.length === 5 && normalize(record.p_code).startsWith(target)));
    if (found) return { id:found[0], record:found[1] };
  }
  if (parsed.spn !== null && parsed.fmi !== null) {
    const matches = entries.filter(([, record]) => Number(record.spn) === parsed.spn && Number(record.fmi) === parsed.fmi);
    if (matches.length === 1) return { id:matches[0][0], record:matches[0][1] };
  }
  return null;
}

function result(status,title,description,detail,source,caution,metadata={}) {
  return {status,title,description,detail,source,caution,...metadata};
}

export function interpretFaultCode(raw) {
  const parsed = parseFaultInput(raw);
  if (!parsed) return result("empty","Enter a fault code","Enter a generic OBD-II code, an SPN, or an SPN/FMI pair.","","","");
  const partial = normalize(raw);
  if (/^[PU][0-9A-F]{0,3}$/.test(partial)) return result("incomplete","Keep typing the fault code","This looks like the beginning of an OBD / OEM P-code, not a complete fault code yet.","Enter the full code before checking the catalog.","","");
  const fmiMeaning = parsed.fmi !== null ? (FMI_MEANINGS[String(parsed.fmi)] || "No generic FMI explanation is available in this reference.") : "";
  const oemMatch = findOemRecord(raw, parsed);
  if (oemMatch.ambiguous) return result("ambiguous-oem","Multiple OEM definitions match this code",
    "The code exists under more than one manufacturer record.",
    "Add the manufacturer and reporting controller to narrow the lookup.",
    "IronKnuckle OEM catalog", "Do not select a definition until the manufacturer/controller context is known.",
    {confidence:"ambiguous",codeType:"oem"});
  if (oemMatch.record) {
    const record=oemMatch.record;
    return result("oem-documented",record.code,record.description,
      [record.manufacturer,record.controller,record.engine_family].filter(Boolean).join(" · "),
      record.source_title || record.source_url || "OEM catalog source",
      record.caution || "Confirm model year, emissions generation and calibration applicability before acting.",
      {confidence:record.confidence||"unverified",sourceUrl:record.source_url||"",scope:record.vehicle_scope||"OEM-specific applicability",codeType:"oem"});
  }

  // An unsuffixed P-code is eligible for the standardized OBD-II table.
  // OEM/HD suffix forms are kept separate because the same base string can be used in an OEM translation.
  if (parsed.pCode && !parsed.pSuffix) {
    const obd = obdByCode.get(normalize(parsed.pCode));
    if (obd) return result("standardized-obd",obd.code,obd.description,
      obd.system+" · Generic standardized OBD-II baseline",
      obd.source_title+" ("+obd.source_edition+"), "+obd.source_page,
      obd.caution,{confidence:obd.confidence,sourceUrl:obd.source_url,scope:obd.vehicle_scope,codeType:"obd2"});
  }

  if (parsed.spn !== null) {
    const spn = spnByNumber.get(parsed.spn);
    if (spn) {
      const saName = parsed.sourceAddress!==null ? (j1939Reference.source_addresses?.[String(parsed.sourceAddress)] || "") : "";
      const detail = "SPN "+parsed.spn+(parsed.fmi!==null?" · FMI "+parsed.fmi+" — "+fmiMeaning:"")+(parsed.sourceAddress!==null?" · Source address "+parsed.sourceAddress+(saName?" ("+saName+")":""):"");
      return result("public-spn","SPN "+parsed.spn,spn.description,detail,
        spn.source_title+" · "+spn.source_page,
        spn.caution,{confidence:spn.confidence,sourceUrl:spn.source_url,scope:spn.vehicle_scope,codeType:"j1939",system:spn.system});
    }
  }

  if (parsed.pCode && parsed.pSuffix) {
    const legacy = legacyMatch(parsed);
    if (legacy) return result("prototype-unverified",legacy.record.p_code||legacy.id,
      legacy.record.description||"A matching prototype record exists but has no description.",
      parsed.fmi!==null?"FMI "+parsed.fmi+" — "+fmiMeaning:"Existing prototype library match",
      "Existing IronKnuckle prototype library; independent source not recorded.",
      "Unverified prototype entry. Confirm the exact OEM code, controller, engine family, model year, emissions generation and calibration in approved service information. Do not use this text alone to select parts.",
      {confidence:"unverified",codeType:"oem"});
  }

  if (parsed.spn !== null && parsed.fmi !== null) {
    return result("generic-fmi-only","SPN "+parsed.spn+" · FMI "+parsed.fmi,
      "No public SPN definition for this number is currently in the catalog.",
      fmiMeaning,FMI_SOURCE_NOTE,
      "FMI describes a failure-mode category, not the failed component. Confirm SPN assignment, controller and OEM diagnostic procedure before acting.",
      {confidence:"generic-reference-only",codeType:"j1939"});
  }

  if (parsed.pCode) {
    const prefix = parsed.pCode.slice(0,2);
    const numericCode=Number(parsed.pCode.slice(1));
    const manufacturerSpecific = prefix==="P1" || (prefix==="P3" && numericCode<=3399);
    const reserved = prefix==="P3" && numericCode>=3400;
    return result("not-found", "No catalog match for "+parsed.pCode,
      manufacturerSpecific?"This P-code is in a manufacturer-controlled range in the referenced code structure.":reserved?"This P-code falls in a reserved range in the referenced historical code structure.":"This code is not in the current IronKnuckle standardized-code seed list.",
      manufacturerSpecific?"Select the manufacturer and controller to research the OEM definition.":reserved?"No generic or OEM definition has been added for this reserved range.":"The code may be valid but has not yet been added to this catalog.",
      "SAE J2012 code-family structure; see source note.",
      "Do not assume a generic description for a manufacturer-controlled code. Confirm the vehicle-specific definition and service procedure.",
      {confidence:"unverified",codeType:manufacturerSpecific?"oem":"obd2"});
  }

  return result("not-found","No exact library match",
    "IronKnuckle does not yet have a matching definition for this entry.",
    "Enter an SPN by itself, SPN/FMI, SA/SPN/FMI (example 11/1049/3), or a P-code.",
    "No exact definition source is attached to this entry.",
    "Code meanings depend on system, controller, manufacturer and vehicle configuration. Use approved service information.");
}

export function searchFaultSuggestions(raw, limit=8) {
  const query=normalize(raw);
  if (!query) return [];
  const candidates=[];
  const add=(code,description,source,confidence,manufacturer="")=>{
    const normalized=normalize(code);
    if (!normalized || !normalized.startsWith(query)) return;
    candidates.push({code:String(code),description:String(description||"Description not yet available."),source:String(source||"IronKnuckle catalog"),confidence:String(confidence||"unverified"),manufacturer:String(manufacturer||"")});
  };
  // OEM and case-derived records are ranked first, followed by standardized OBD and public SPN data.
  oemRecords.forEach(r=>add(r.code,r.description,r.source_title,r.confidence,r.manufacturer));
  (obdReference.records||[]).forEach(r=>add(r.code,r.description,r.source_title,r.confidence,"Generic OBD-II"));
  (j1939Reference.records||[]).forEach(r=>add("SPN "+r.spn,r.description,r.source_title,r.confidence,"J1939"));
  Object.entries(legacyLibrary).forEach(([key,r])=>add(r.p_code||key,r.description,"Legacy IronKnuckle library","unverified"));
  const unique=new Map();
  candidates.forEach(item=>{const key=normalize(item.code);if(!unique.has(key))unique.set(key,item);});
  return [...unique.values()].slice(0,Math.max(1,Math.min(12,Number(limit)||8)));
}

export function getFaultCatalogStats() {
  return {
    obd2:(obdReference.records||[]).length,
    j1939:(j1939Reference.records||[]).length,
    oem:oemRecords.length,
    pendingLocal:0
  };
}
