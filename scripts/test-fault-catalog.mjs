import assert from "node:assert/strict";
import { interpretFaultCode, parseFaultInput } from "../js/fault-interpreter.js";
import { createFaultSubmission, saveFaultSubmission, exportFaultSubmissions, getFaultSubmissionCount } from "../js/fault-submissions.js";

const generic = interpretFaultCode("P0100");
assert.equal(generic.status,"standardized-obd");
assert.match(generic.description,/airflow/i);
assert.equal(generic.codeType,"obd2");
assert.match(generic.source,/APR2002/);
assert.ok(generic.sourceUrl);

const dpf = interpretFaultCode("P2002");
assert.equal(dpf.status,"standardized-obd");
assert.match(dpf.description,/Particulate filter/i);
assert.match(dpf.source,/Appendix B/);

const reductant = interpretFaultCode("P2037");
assert.equal(reductant.status,"standardized-obd");
assert.match(reductant.description,/Reductant/i);

const egt = interpretFaultCode("P2080");
assert.equal(egt.status,"standardized-obd");
assert.match(egt.description,/Exhaust gas temperature/i);

const egr = interpretFaultCode("P0401");
assert.equal(egr.status,"standardized-obd");
assert.match(egr.description,/EGR/i);

const manufacturerCode = interpretFaultCode("P1496");
assert.equal(manufacturerCode.status,"not-found");
assert.match(manufacturerCode.description,/manufacturer-controlled/i);
assert.equal(interpretFaultCode("P3400").status,"not-found");
assert.match(interpretFaultCode("P3400").description,/reserved range/i);

const publicSpn = interpretFaultCode("SPN 100");
assert.equal(publicSpn.status,"public-spn");
assert.match(publicSpn.description,/oil pressure/i);
assert.match(publicSpn.source,/1033423/);
assert.ok(publicSpn.sourceUrl);

const spnFmi = interpretFaultCode("SPN 100 FMI 4");
assert.equal(spnFmi.status,"public-spn");
assert.match(spnFmi.detail,/FMI 4/);
assert.match(spnFmi.detail,/Voltage is lower than expected/i);

const slashFormat = parseFaultInput("11/1049/3");
assert.equal(slashFormat.sourceAddress,11);
assert.equal(slashFormat.spn,1049);
assert.equal(slashFormat.fmi,3);
const slashInterpretation = interpretFaultCode("11/1049/3");
assert.equal(slashInterpretation.status,"public-spn");
assert.match(slashInterpretation.detail,/Source address 11 \(Brake system controller/i);

const unknownSpn = interpretFaultCode("SPN 999999 FMI 4");
assert.equal(unknownSpn.status,"generic-fmi-only");
assert.match(unknownSpn.detail,/Voltage is lower than expected/i);

const prototype = interpretFaultCode("P205B-64");
assert.equal(prototype.status,"prototype-unverified");
assert.match(prototype.caution,/Unverified prototype/i);

const unknown = interpretFaultCode("P0000-00");
assert.equal(unknown.status,"not-found");
assert.equal(interpretFaultCode("").status,"empty");

assert.throws(()=>createFaultSubmission({code:"SPN 1"}),/description or technician observation/i);
const sample=createFaultSubmission({code:"SPN 100 FMI 4",codeType:"j1939",manufacturer:"Mack",notes:"Measured value intermittent during road test"});
assert.equal(sample.reviewStatus,"pending-review");
assert.equal(sample.confidence,"unverified");
assert.equal(sample.manufacturer,"Mack");

const memory=new Map();
const storage={getItem:k=>memory.get(k)||null,setItem:(k,v)=>memory.set(k,v),removeItem:k=>memory.delete(k)};
const saved=saveFaultSubmission({code:"P0100",description:"Airflow circuit code",codeType:"obd2"},storage);
assert.equal(saved.reviewStatus,"pending-review");
assert.equal(getFaultSubmissionCount(storage),1);
assert.match(exportFaultSubmissions(storage),/fault-definition-submissions/);
console.log("FAULT CATALOG AND SUBMISSION TESTS PASSED");
