import assert from "node:assert/strict";
import {getMackP205B64Guidance,MACK_UQLS_YELLOW_CODES} from "../js/oem-fault-guidance.js";
import {analyzeDiagnosticCase} from "../js/diagnostic-brain.js";
const codes=["P205B64","P203A13","P203C00","P206A13","P206C00","P206B64","P205A13","P205C00","P204364"];
assert.deepEqual(Object.keys(MACK_UQLS_YELLOW_CODES),codes);
for (const code of codes) {
 const plan=getMackP205B64Guidance({code},{make:"Mack",model:"Anthem",year:"2022",emissions:"US17+OBD16"});
 assert.ok(plan,code+" should launch the Mack UQLS bulletin workflow");
 assert.equal(plan.steps.length,7);
 assert.deepEqual(plan.relatedFaultCodes,codes);
 assert.match(plan.steps[0].instruction,new RegExp(code));
 assert.match(plan.steps[5].instruction,/ANY of the nine listed yellow UQLS faults/i);
 assert.match(plan.steps[6].instruction,/ANY of the nine yellow UQLS faults/i);
}
assert.match(getMackP205B64Guidance({code:"P203A13"},{make:"Mack"}).steps[0].instruction,/Reductant Level Sensor/);
assert.equal(getMackP205B64Guidance({code:"P203A13"},{make:"Volvo"}),null);
assert.equal(getMackP205B64Guidance({code:"P205A13"},{make:"Mack"}).steps[0].choices[0],"At least one listed yellow UQLS fault active/confirmed and applicability verified");
const plan=getMackP205B64Guidance({code:"P205B64"},{make:"Mack"});
const steps=plan.steps;
const base={workflowId:"fault_guidance_p205b64",vehicle:{make:"Mack",model:"Anthem",engine:"MP8"},entries:{}};
const stopped=analyzeDiagnosticCase({...base,entries:{p205b_applicability:{choice:"AN(4), PR(4), or emissions applicability unknown — stop"}}},steps);
assert.equal(stopped.recommendation.state,"hold");
assert.match(stopped.recommendation.action,/Stop this guided path/i);
const inactive=analyzeDiagnosticCase({...base,entries:{p205b_applicability:{choice:"None of the listed yellow UQLS faults active/confirmed — no troubleshooting required"}}},steps);
assert.equal(inactive.recommendation.state,"review");
const active=analyzeDiagnosticCase({...base,entries:{p205b_applicability:{choice:"At least one listed yellow UQLS fault active/confirmed and applicability verified"}}},steps);
assert.equal(active.recommendation.stepId,"p205b_connector");
const cleanConnector=analyzeDiagnosticCase({...base,entries:{
 p205b_applicability:{choice:"At least one listed yellow UQLS fault active/confirmed and applicability verified"},
 p205b_connector:{choice:"No pin, wire, corrosion or moisture damage found"}
}},steps);
assert.equal(cleanConnector.recommendation.stepId,"p205b_quality");
assert.equal(cleanConnector.recommendation.state,"next");
const damagedConnector=analyzeDiagnosticCase({...base,entries:{
 p205b_applicability:{choice:"At least one listed yellow UQLS fault active/confirmed and applicability verified"},
 p205b_connector:{choice:"Damage, corrosion or water intrusion found"}
}},steps);
assert.equal(damagedConnector.recommendation.stepId,"p205b_connector");
assert.equal(damagedConnector.recommendation.state,"hold");
const result=analyzeDiagnosticCase({...base,entries:{
 p205b_applicability:{choice:"At least one listed yellow UQLS fault active/confirmed and applicability verified"},
 p205b_cycle:{choice:"Repeat sequence completed; one or more listed yellow UQLS faults returned active/confirmed"},
 p205b_result:{choice:"One or more listed yellow UQLS faults returned active/confirmed after repeat test"}
}},steps);
assert.equal(result.recommendation.state,"review");
assert.match(result.recommendation.action,/UQLS replacement/i);
console.log("Mack CBR 2107-22 all-nine-code workflow tests passed.");
