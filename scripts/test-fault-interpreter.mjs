import assert from "node:assert/strict";
import { interpretFaultCode } from "../js/fault-interpreter.js";

const knownP = interpretFaultCode("P205B-64");
assert.equal(knownP.status, "library-match");
assert.match(knownP.description, /Reductant/i);
assert.match(knownP.caution, /not a verified OEM definition/i);

const knownSpn = interpretFaultCode("SPN 3515 FMI 4");
assert.equal(knownSpn.status, "library-match");
assert.match(knownSpn.detail, /Voltage below normal/i);

const generic = interpretFaultCode("SPN 999999 FMI 4");
assert.equal(generic.status, "generic-only");
assert.match(generic.detail, /Voltage below normal/i);
assert.match(generic.caution, /SPN meaning must be confirmed/i);

const unknown = interpretFaultCode("P0000-00");
assert.equal(unknown.status, "not-found");
assert.match(unknown.caution, /approved service information/i);

assert.equal(interpretFaultCode("").status, "empty");
console.log("FAULT INTERPRETER TESTS PASSED");
