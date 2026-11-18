import assert from "node:assert/strict";
import { interpretFaultCode } from "../js/fault-interpreter.js";

const knownP = interpretFaultCode("P205B-64");
assert.equal(knownP.status, "library-match");
assert.match(knownP.description, /Reductant/i);
assert.match(knownP.caution, /not a verified OEM definition/i);
assert.match(knownP.source, /SAE J1939\/73/);

const knownSpn = interpretFaultCode("SPN 3515 FMI 4");
assert.equal(knownSpn.status, "library-match");
assert.match(knownSpn.detail, /Voltage is lower than expected/i);
assert.match(knownSpn.source, /plain-language paraphrase/i);

const generic = interpretFaultCode("SPN 999999 FMI 4");
assert.equal(generic.status, "generic-only");
assert.match(generic.detail, /Voltage is lower than expected/i);
assert.match(generic.caution, /SPN meaning must be confirmed/i);
assert.match(generic.source, /SAE J1939\/73/);

const unknownFmi = interpretFaultCode("SPN 999999 FMI 22");
assert.equal(unknownFmi.status, "generic-only");
assert.match(unknownFmi.detail, /No generic FMI explanation/i);

const conditionExists = interpretFaultCode("SPN 999999 FMI 31");
assert.match(conditionExists.detail, /A condition exists/i);

const unknown = interpretFaultCode("P0000-00");
assert.equal(unknown.status, "not-found");
assert.match(unknown.caution, /approved service information/i);

assert.equal(interpretFaultCode("").status, "empty");
console.log("FAULT INTERPRETER TESTS PASSED");
