import assert from "node:assert/strict";
import { interpretFaultCode, searchFaultSuggestions } from "../js/fault-interpreter.js";

const pSuggestions = searchFaultSuggestions("P", 8);
assert.ok(pSuggestions.length > 0);
assert.ok(pSuggestions.every(item => item.code.toUpperCase().startsWith("P")));
const narrowSuggestions = searchFaultSuggestions("P205B", 8);
assert.ok(narrowSuggestions.some(item => item.code === "P205B64"));
assert.equal(searchFaultSuggestions("", 8).length, 0);

const knownP = interpretFaultCode("Mack P205B-64");
assert.equal(knownP.status, "source-referenced");
assert.match(knownP.description, /Reductant/i);
assert.match(knownP.source, /UQLS/i);
assert.match(knownP.caution, /inactive code alone/i);

const knownSpn = interpretFaultCode("SPN 3515 FMI 4");
assert.equal(knownSpn.status, "generic-fmi-only");
assert.match(knownSpn.detail, /Voltage is lower than expected/i);
assert.match(knownSpn.source, /plain-language paraphrase/i);

const partialP = interpretFaultCode("P");
assert.equal(partialP.status, "incomplete");
assert.match(partialP.title, /Keep typing/i);

const bareOem = interpretFaultCode("P205B64");
assert.equal(bareOem.status, "manufacturer-required");
assert.match(bareOem.caution, /manufacturer-specific definition withheld/i);
const mackOem = interpretFaultCode("Mack P205B64");
assert.equal(mackOem.status, "source-referenced");
assert.match(mackOem.description, /Reductant tank temperature/i);
const wrongMake = interpretFaultCode("Volvo P205B64");
assert.equal(wrongMake.status, "not-found", "A Mack-only definition must not be shown for a Volvo");

const compactCaseP = interpretFaultCode("P245213");
assert.equal(compactCaseP.status, "manufacturer-required");
assert.match(compactCaseP.description, /DPF pressure sensor A circuit open/i);

const caseP = interpretFaultCode("Mack P2452-13");
assert.equal(caseP.status, "case-derived-unverified");
assert.match(caseP.description, /DPF pressure sensor A circuit open/i);
assert.equal(caseP.confidence, "case-derived-unverified");

const caseU = interpretFaultCode("Mack U0100-87");
assert.equal(caseU.status, "case-derived-unverified");
assert.match(caseU.description, /Lost communication with EMS/i);

const caseSpn = interpretFaultCode("Mack 11/790/9");
assert.equal(caseSpn.status, "case-derived-unverified");
assert.match(caseSpn.description, /Wheel speed axle 1 right/i);

const casePsid = interpretFaultCode("Mack PSID 14 FMI 3");
assert.equal(casePsid.status, "case-derived-unverified");
assert.match(casePsid.description, /Right-front turn signal/i);
const compactPsid = interpretFaultCode("PSID14FMI3");
assert.equal(compactPsid.status, "manufacturer-required");

const casePid = interpretFaultCode("Mack PID 84 FMI 9");
assert.equal(casePid.status, "case-derived-unverified");
assert.match(casePid.description, /Vehicle speed/i);


const mackP008A00 = interpretFaultCode("Mack P008A00");
assert.equal(mackP008A00.status, "case-derived-unverified");
assert.match(mackP008A00.description, /Low Pressure Fuel System Pressure/i);
assert.equal(mackP008A00.confidence, "case-derived-unverified");
assert.match(mackP008A00.scope, /Mack AN/);
const ambiguousP114000 = interpretFaultCode("Mack P114000");
assert.equal(ambiguousP114000.status, "ambiguous-oem");
const ambiguousP117900 = interpretFaultCode("Mack P117900");
assert.equal(ambiguousP117900.status, "ambiguous-oem");
for (const [code, phrase] of [
  ["Mack P008A00", /Low Pressure Fuel System Pressure/i],
  ["Mack P008700", /Fuel Rail\/System Pressure/i],
  ["Mack P016F00", /Closed Loop Fuel Pressure Control/i],
  ["Mack PSID 201 FMI 9", /Data link, MID144/i],
  ["Mack PSID 204 FMI 9", /Data link, MID136/i],
  ["Mack PSID 33 FMI 12", /high or low beam control/i],
  ["Mack P106063", /Clutch Plate Load/i],
  ["Mack P105594", /Brake Switch Status/i],
  ["Mack SID 244 FMI 12", /CC enable switch/i],
  ["Mack PPID 1592 FMI 12", /Cruise Control panel/i],
  ["Mack PSID 230 FMI 9", /Critical MSW Error/i]
]) {
  const result = interpretFaultCode(code);
  assert.equal(result.status, code==="Mack P016F00" ? "source-referenced" : "case-derived-unverified", code);
  assert.match(result.description, phrase, code);
  assert.equal(result.confidence, code==="Mack P016F00" ? "public-oem-reference" : "case-derived-unverified", code);
}

const mackP016fDefinition = interpretFaultCode("Mack P016F-00");
assert.equal(mackP016fDefinition.status, "source-referenced");
assert.equal(mackP016fDefinition.description, "Closed Loop Fuel Pressure Control At Limit - Pressure Too Low");
assert.match(mackP016fDefinition.source, /K40914241/);
assert.match(mackP016fDefinition.sourceUrl, /MC-10170161-9999\.pdf/);
assert.equal(mackP016fDefinition.confidence, "public-oem-reference");

const generic = interpretFaultCode("SPN 999999 FMI 4");
assert.equal(generic.status, "generic-fmi-only");
assert.match(generic.detail, /Voltage is lower than expected/i);
assert.match(generic.caution, /Confirm SPN assignment/i);
assert.match(generic.source, /SAE J1939\/73/);

const unknownFmi = interpretFaultCode("SPN 999999 FMI 22");
assert.equal(unknownFmi.status, "generic-fmi-only");
assert.match(unknownFmi.detail, /No generic FMI explanation/i);

const conditionExists = interpretFaultCode("SPN 999999 FMI 31");
assert.match(conditionExists.detail, /A condition exists/i);

const unknown = interpretFaultCode("P0000-00");
assert.equal(unknown.status, "not-found");
assert.match(unknown.caution, /vehicle-specific definition/i);

assert.equal(interpretFaultCode("").status, "empty");
console.log("FAULT INTERPRETER TESTS PASSED");
