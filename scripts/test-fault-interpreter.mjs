import assert from "node:assert/strict";
import { interpretFaultCode, searchFaultSuggestions } from "../js/fault-interpreter.js";

const pSuggestions = searchFaultSuggestions("P", 8);
assert.ok(pSuggestions.length > 0);
assert.ok(pSuggestions.every(item => item.code.toUpperCase().startsWith("P")));
const narrowSuggestions = searchFaultSuggestions("P205B", 8);
assert.ok(narrowSuggestions.some(item => item.code === "P205B64"));
assert.equal(searchFaultSuggestions("", 8).length, 0);

const knownP = interpretFaultCode("P205B-64");
assert.equal(knownP.status, "oem-documented");
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
assert.equal(bareOem.status, "oem-documented");
assert.match(bareOem.description, /Reductant tank temperature/i);

const compactCaseP = interpretFaultCode("P245213");
assert.equal(compactCaseP.status, "oem-documented");
assert.match(compactCaseP.description, /DPF pressure sensor A circuit open/i);

const caseP = interpretFaultCode("P2452-13");
assert.equal(caseP.status, "oem-documented");
assert.match(caseP.description, /DPF pressure sensor A circuit open/i);
assert.equal(caseP.confidence, "case-derived-unverified");

const caseU = interpretFaultCode("U0100-87");
assert.equal(caseU.status, "oem-documented");
assert.match(caseU.description, /Lost communication with EMS/i);

const caseSpn = interpretFaultCode("11/790/9");
assert.equal(caseSpn.status, "oem-documented");
assert.match(caseSpn.description, /Wheel speed axle 1 right/i);

const casePsid = interpretFaultCode("PSID 14 FMI 3");
assert.equal(casePsid.status, "oem-documented");
assert.match(casePsid.description, /Right-front turn signal/i);
const compactPsid = interpretFaultCode("PSID14FMI3");
assert.equal(compactPsid.status, "oem-documented");

const casePid = interpretFaultCode("PID 84 FMI 9");
assert.equal(casePid.status, "oem-documented");
assert.match(casePid.description, /Vehicle speed/i);


const mackP008A00 = interpretFaultCode("Mack P008A00");
assert.equal(mackP008A00.status, "oem-documented");
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
  assert.equal(result.status, "oem-documented", code);
  assert.match(result.description, phrase, code);
  assert.equal(result.confidence, "case-derived-unverified", code);
}

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
