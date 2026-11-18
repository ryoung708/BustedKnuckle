import assert from "node:assert/strict";
import { interpretFaultCode } from "../js/fault-interpreter.js";

const knownP = interpretFaultCode("P205B-64");
assert.equal(knownP.status, "oem-documented");
assert.match(knownP.description, /Reductant/i);
assert.match(knownP.source, /UQLS/i);
assert.match(knownP.caution, /inactive code alone/i);

const knownSpn = interpretFaultCode("SPN 3515 FMI 4");
assert.equal(knownSpn.status, "generic-fmi-only");
assert.match(knownSpn.detail, /Voltage is lower than expected/i);
assert.match(knownSpn.source, /plain-language paraphrase/i);

const bareOem = interpretFaultCode("P205B64");
assert.equal(bareOem.status, "oem-documented");
assert.match(bareOem.description, /Reductant tank temperature/i);

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

const casePid = interpretFaultCode("PID 84 FMI 9");
assert.equal(casePid.status, "oem-documented");
assert.match(casePid.description, /Vehicle speed/i);

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
