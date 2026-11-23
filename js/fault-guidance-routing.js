import { interpretFaultCode } from "./fault-interpreter.js";

export function classifyFaultGuidanceSystem(fault = {}, manufacturer = "") {
  const code = String(fault.code || "").trim();
  const catalog = interpretFaultCode((manufacturer ? manufacturer + " " : "") + code);
  const description = String(fault.description || catalog.description || "").toLowerCase();
  const text = [code, description, fault.controller || ""].join(" ").toLowerCase();
  if (/low pressure fuel|fuel (?:rail|system|supply).*pressure|pressure.*too low|fuel pressure/.test(text))
    return { system: "fuel_supply", description: catalog.description, confidence: catalog.confidence || "unverified" };
  if (/after.?treatment|def |reductant|nox|dpf|soot|exhaust gas temperature|egt|dos(er|ing)|scr|catalyst/.test(text) || /^p20|^p22|^p24/i.test(code))
    return { system: "aftertreatment", description: catalog.description, confidence: catalog.confidence || "unverified" };
  if (/circuit|open|short|voltage|current|electrical|sensor/.test(text))
    return { system: "electrical", description: catalog.description, confidence: catalog.confidence || "unverified" };
  if (/boost|turbo|intake|air flow|manifold/.test(text))
    return { system: "air_boost", description: catalog.description, confidence: catalog.confidence || "unverified" };
  return { system: "general", description: catalog.description, confidence: catalog.confidence || "unverified" };
}
