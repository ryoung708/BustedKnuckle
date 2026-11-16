import assert from "node:assert/strict";
import { analyzeDiagnosticCase } from "../js/diagnostic-brain.js";

const steps = [
  {id:"baseline",title:"Baseline"},
  {id:"resistance",title:"Resistance"},
  {id:"addon",title:"Add-on isolation"},
  {id:"verify",title:"Verify"}
];
const base = {workflowId:"j1939_network",vehicle:{make:"Mack",model:"Anthem",engine:"MP8"},entries:{}};
const empty = analyzeDiagnosticCase(base,steps);
assert.equal(empty.status,"ready-to-start");
assert.equal(empty.recommendation.stepId,"baseline");
assert.equal(empty.evidence.stagesWithObservations,0);

const measuredOnly = analyzeDiagnosticCase({...base,currentStep:0,entries:{baseline:{measurements:{actual:"0.4 V",condition:"Key ON"}}}},steps);
assert.equal(measuredOnly.status,"evidence-needed");
assert.match(measuredOnly.limitations.join(" "),/no result has been inferred/i);

const branch = analyzeDiagnosticCase({...base,entries:{baseline:{choice:"Multiple modules offline",updatedAt:"2026-11-16T10:00:00Z",measurements:{actual:"0.4 V",testPoints:"CAN H to ground"}}}},steps);
assert.equal(branch.recommendation.stepId,"resistance");
assert.equal(branch.evidence.stagesWithObservations,1);
assert.equal(branch.evidence.stagesWithMeasurements,1);
assert.ok(branch.caution.length>20);

const missingVehicle = analyzeDiagnosticCase({workflowId:"light_inop",vehicle:{},entries:{}},steps);
assert.deepEqual(missingVehicle.vehicleContext.missing,["make","model","engine"]);
assert.match(missingVehicle.limitations.join(" "),/Vehicle context is incomplete/);

console.log("IronKnuckle Diagnostic Brain tests passed.");
