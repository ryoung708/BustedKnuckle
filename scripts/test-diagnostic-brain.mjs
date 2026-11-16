import assert from "node:assert/strict";
import { analyzeDiagnosticCase } from "../js/diagnostic-brain.js";

const electricalSteps = [
  {id:"baseline",title:"Baseline"},
  {id:"resistance",title:"Resistance"},
  {id:"addon",title:"Add-on isolation"},
  {id:"verify",title:"Verify"}
];
const powertrainSteps = [
  {id:"complaint",title:"Define complaint"},
  {id:"inspect",title:"Inspect"},
  {id:"verify",title:"Verify"}
];
const base = {workflowId:"j1939_network",vehicle:{make:"Mack",model:"Anthem",engine:"MP8"},entries:{}};
const empty = analyzeDiagnosticCase(base,electricalSteps);
assert.equal(empty.status,"ready-to-start");
assert.equal(empty.recommendation.stepId,"baseline");
assert.equal(empty.specialist.id,"wiringhound");
assert.equal(empty.evidence.stagesWithObservations,0);

const measuredOnly = analyzeDiagnosticCase({...base,currentStep:0,entries:{baseline:{measurements:{actual:"0.4 V",condition:"Key ON"}}}},electricalSteps);
assert.equal(measuredOnly.status,"evidence-needed");
assert.match(measuredOnly.limitations.join(" "),/no result has been inferred/i);

const branch = analyzeDiagnosticCase({...base,entries:{baseline:{choice:"Multiple modules offline",updatedAt:"2026-11-16T10:00:00Z",measurements:{actual:"0.4 V",testPoints:"CAN H to ground"}}}},electricalSteps);
assert.equal(branch.recommendation.stepId,"resistance");
assert.equal(branch.evidence.stagesWithObservations,1);
assert.equal(branch.evidence.stagesWithMeasurements,1);
assert.ok(branch.caution.length>20);

const missingVehicle = analyzeDiagnosticCase({workflowId:"light_inop",vehicle:{},entries:{}},electricalSteps);
assert.deepEqual(missingVehicle.vehicleContext.missing,["make","model","engine"]);
assert.equal(missingVehicle.specialist.id,"wiringhound");
assert.match(missingVehicle.limitations.join(" "),/Vehicle context is incomplete/);

const powertrain = analyzeDiagnosticCase({
  workflowId:"crank_no_start",
  vehicle:{make:"Mack",model:"Anthem",engine:"MP8"},
  complaint:"Cranks but will not start; intermittent J1939 communication loss reported.",
  entries:{complaint:{choice:"Cranks but will not start"}}
},powertrainSteps);
assert.equal(powertrain.specialist.id,"powertrain");
assert.equal(powertrain.crossSystemSignals[0].system,"electrical");
assert.match(powertrain.crossSystemSignals[0].action,/do not assume/i);
assert.equal(powertrain.recommendation.stepId,"inspect");

const verifiedReference = {
  id:"verified-001",workflowId:"crank_no_start",
  vehicle:{make:"Mack",model:"Anthem",engine:"MP8"},
  complaint:"Cranks but will not start",
  entries:{complaint:{choice:"Cranks but will not start",faultCodes:[{code:"SPN 123 FMI 4"}]}},
  rootCause:"Corroded engine harness connector",
  repairPerformed:"Repaired connector and verified start",
  verification:"verified",status:"confirmed"
};
const currentWithCode = {
  workflowId:"crank_no_start",
  vehicle:{make:"Mack",model:"Anthem",engine:"MP8"},
  complaint:"Cranks but will not start",
  entries:{complaint:{choice:"Cranks but will not start",faultCodes:[{code:"SPN 123 FMI 4"}]}}
};
const withReference = analyzeDiagnosticCase(currentWithCode,powertrainSteps,{relatedCases:[verifiedReference]});
assert.equal(withReference.verifiedCaseMatches.length,1);
assert.equal(withReference.verifiedCaseMatches[0].id,"verified-001");
assert.match(withReference.verifiedCaseMatches[0].caveat,/not proof/i);

const unverified = {...verifiedReference,id:"draft-002",verification:"unverified"};
const noUnverifiedReference = analyzeDiagnosticCase(currentWithCode,powertrainSteps,{relatedCases:[unverified]});
assert.equal(noUnverifiedReference.verifiedCaseMatches.length,0);

console.log("IronKnuckle Diagnostic Brain v2 specialist and knowledge tests passed.");
