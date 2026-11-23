import assert from "node:assert/strict";
import {findSimilarDiagnosticCases} from "../js/diagnostic-similar-cases.js";
import {workflows} from "../js/diagnostic-engine.js";

const current = {complaint:"Large voltage drop across the main disconnect switch",system:"electrical",vehicle:{make:"Mack",model:"Anthem",engine:"MP8"}};
const candidates = [
  {id:"a",complaint:"Voltage drop across main disconnect under load",workflowId:"voltage_drop",vehicle:{make:"Mack",model:"Anthem",engine:"MP8"},status:"confirmed",rootCause:"High resistance at disconnect",repairPerformed:"Replaced damaged disconnect"},
  {id:"b",complaint:"Transmission stuck in gear and will not shift",workflowId:"drivetrain_fault",vehicle:{make:"Mack",model:"Anthem",engine:"MP8"},status:"confirmed",rootCause:"Shift actuator issue",repairPerformed:"Repaired actuator"},
  {id:"c",complaint:"Large voltage drop across main disconnect",workflowId:"voltage_drop",vehicle:{make:"Mack",model:"Anthem",engine:"MP8"},status:"in-progress",rootCause:"",repairPerformed:""}
];
const codeMatch=findSimilarDiagnosticCases({...current,faultCodes:["SPN 5246 FMI 0"]},[
  {id:"d",complaint:"Unrelated symptom text",workflowId:"voltage_drop",vehicle:{make:"Volvo",model:"VNL",engine:"D13"},entries:{step:{faultCodes:[{code:"SPN 5246 FMI 0"}]}}}
],workflows);
assert.equal(codeMatch.length,1,"Exact fault-code matches should be found even when complaint wording differs.");
assert.match(codeMatch[0].matchReason,/Matching fault code/);

const matches=findSimilarDiagnosticCases(current,candidates,workflows);
assert.equal(matches.length,2);
assert.equal(matches[0].id,"a");
assert.equal(matches[0].verified,true);
assert.equal(matches[1].id,"c");
assert.equal(matches[1].verified,false);
assert.equal(findSimilarDiagnosticCases({...current,complaint:"noise"},candidates,workflows).length,0);
console.log("Complaint-intake similar-case tests passed.");
