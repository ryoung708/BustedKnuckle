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
assert.match(codeMatch[0].matchReason,/Matching SPN\/code/);

const codeOnly=findSimilarDiagnosticCases({system:"electrical",faultCodes:[{code:"SPN 168",fmi:"0",controller:"VECU"}]},[
  {id:"code-only",workflowId:"j1939_network",entries:{step:{faultCodes:[{code:"168",fmi:"0",controller:"VECU"}]}}}
],workflows);
assert.equal(codeOnly.length,1,"A code-only lookup should find a saved case without complaint text.");
assert.match(codeOnly[0].matchReason,/168.*FMI 0.*vecu/i);
const partialQualifier=findSimilarDiagnosticCases({system:"electrical",faultCodes:[{code:"SPN 168",fmi:"0",controller:"VECU"}]},[
  {id:"partial-qualifier",workflowId:"j1939_network",entries:{step:{faultCodes:[{code:"SPN 168"}]}}}
],workflows);
assert.equal(partialQualifier.length,1,"An SPN-only record may still be a useful partial match.");
assert.match(partialQualifier[0].matchReason,/not recorded on both cases/i,"The result must disclose when FMI/controller context is missing from one case.");

const wrongFmi=findSimilarDiagnosticCases({system:"electrical",faultCodes:[{code:"SPN 168",fmi:"0",controller:"VECU"}]},[
  {id:"wrong-fmi",workflowId:"j1939_network",entries:{step:{faultCodes:[{code:"SPN 168",fmi:"5",controller:"VECU"}]}}}
],workflows);
assert.equal(wrongFmi.length,0,"Different known FMIs must not be treated as an exact match.");

const wrongController=findSimilarDiagnosticCases({system:"electrical",faultCodes:[{code:"SPN 168",fmi:"0",controller:"VECU"}]},[
  {id:"wrong-controller",workflowId:"j1939_network",entries:{step:{faultCodes:[{code:"SPN 168",fmi:"0",controller:"ACM"}]}}}
],workflows);
assert.equal(wrongController.length,0,"Different known reporting controllers must not be treated as an exact match.");

const matches=findSimilarDiagnosticCases(current,candidates,workflows);
assert.equal(matches.length,2);
assert.equal(matches[0].id,"a");
assert.equal(matches[0].verified,true);
assert.equal(matches[1].id,"c");
assert.equal(matches[1].verified,false);
assert.equal(findSimilarDiagnosticCases({...current,complaint:"noise"},candidates,workflows).length,0);
const generationMatches=findSimilarDiagnosticCases({complaint:"Intermittent power loss and network dropout",system:"electrical",vehicle:{year:"2022",make:"Mack",model:"Anthem",engineMake:"Mack",engine:"MP8",transmissionMake:"Mack",transmissionModel:"mDRIVE",emissions:"US17"}},[
  {id:"same-generation",complaint:"Intermittent power loss and network dropout",workflowId:"j1939_network",vehicle:{year:"2022",make:"Mack",model:"Anthem",engineMake:"Mack",engine:"MP8",transmissionMake:"Mack",transmissionModel:"mDRIVE",emissions:"US17"}},
  {id:"other-year",complaint:"Intermittent power loss and network dropout",workflowId:"j1939_network",vehicle:{year:"2018",make:"Mack",model:"Anthem",engineMake:"Mack",engine:"MP8"}},
  {id:"same-badge-other-engine",complaint:"Intermittent power loss and network dropout",workflowId:"j1939_network",vehicle:{year:"2022",make:"Mack",model:"Anthem",engineMake:"Cummins",engine:"X15"}}
],workflows);
assert.equal(generationMatches[0].id,"same-generation");
assert.equal(generationMatches[0].vehicleMatch.sameVehicleGeneration,true);
const crossVehicle=findSimilarDiagnosticCases({system:"electrical",faultCodes:["SPN 168 FMI 0"],vehicle:{year:"2022",make:"Mack",model:"Anthem",engineMake:"Mack",engine:"MP8"}},[
 {id:"cross-platform",workflowId:"j1939_network",vehicle:{year:"2024",make:"Freightliner",model:"Cascadia",engineMake:"Detroit Diesel",engine:"DD15"},entries:{scan:{faultCodes:[{code:"SPN 168 FMI 0"}]}}}
],workflows);
assert.equal(crossVehicle.length,1);
assert.match(crossVehicle[0].matchReason,/Cross-vehicle code match only/i);
console.log("Complaint-intake similar-case tests passed.");
