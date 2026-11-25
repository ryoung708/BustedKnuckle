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
assert.match(branch.recommendation.explanation,/Multiple modules offline/);
assert.match(branch.recommendation.explanation,/0.4 V/);
assert.match(branch.recommendation.explanation,/CAN H to ground/);
assert.equal(branch.recommendation.evidenceTrail.length,1);
assert.equal(branch.recommendation.latestFinding.stepTitle,"Baseline");

const history = analyzeDiagnosticCase({
  ...base,currentStep:2,
  entries:{
    baseline:{choice:"Multiple modules offline",updatedAt:"2026-11-16T10:00:00Z",measurements:{condition:"Key ON",testPoints:"CAN H to ground",actual:"0.4 V"},notes:"Both controllers dropped offline"},
    resistance:{choice:"Approximately 60Ω under this test setup",updatedAt:"2026-11-16T11:00:00Z",measurements:{condition:"Key OFF",testPoints:"CAN H to CAN L",actual:"60 ohms"},notes:"ELD still connected"}
  }
},electricalSteps);
assert.equal(history.recommendation.stepId,"addon");
assert.equal(history.recommendation.evidenceTrail.length,2);
assert.match(history.recommendation.explanation,/Approximately 60Ω/);
assert.match(history.recommendation.explanation,/60 ohms/);
assert.match(history.recommendation.explanation,/Key OFF/);
assert.match(history.recommendation.explanation,/Resistance/);

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

// Powertrain recommendations now consume the latest submitted result instead of
// blindly returning the next array position.
const crankSteps = [
  {id:"codes",title:"Scan controllers"},
  {id:"enable",title:"Check start authorization and synchronization"},
  {id:"fuel",title:"Verify fuel supply and delivery"},
  {id:"air_exhaust",title:"Check air and mechanical prerequisites"},
  {id:"verify",title:"Confirm root cause",terminal:true}
];
const noStartBase = {workflowId:"crank_no_start",vehicle:{make:"Cummins",model:"N14",engine:"N14"},complaint:"Cranks but will not start"};
const incomplete = analyzeDiagnosticCase({...noStartBase,currentStep:1,entries:{codes:{choice:"Scan incomplete"}}},crankSteps);
assert.equal(incomplete.recommendation.stepId,"codes");
assert.equal(incomplete.recommendation.state,"hold");
assert.match(incomplete.recommendation.action,/Do not advance/i);
const abnormalFuel = analyzeDiagnosticCase({...noStartBase,currentStep:3,entries:{codes:{choice:"Relevant active faults present"},enable:{choice:"Enable and sync appear valid"},fuel:{choice:"Supply pressure below specification",measurements:{actual:"Below engine-specific limit",condition:"Cranking"}}}},crankSteps);
assert.equal(abnormalFuel.recommendation.stepId,"fuel");
assert.equal(abnormalFuel.recommendation.state,"hold");
assert.match(abnormalFuel.recommendation.action,/localize the affected circuit or subsystem/i);
const normalFuel = analyzeDiagnosticCase({...noStartBase,currentStep:3,entries:{codes:{choice:"Relevant active faults present"},enable:{choice:"Enable and sync appear valid"},fuel:{choice:"Fuel supply meets specification"}}},crankSteps);
assert.equal(normalFuel.recommendation.stepId,"air_exhaust");
assert.equal(normalFuel.recommendation.state,"next");
assert.match(normalFuel.recommendation.action,/exact vehicle-specific procedure/i);
const measuredNoChoice = analyzeDiagnosticCase({...noStartBase,currentStep:1,entries:{codes:{measurements:{actual:"Several codes stored"}}}},crankSteps);
assert.equal(measuredNoChoice.recommendation.stepId,"codes");
assert.equal(measuredNoChoice.recommendation.state,"hold");


const p205bSteps=[
 {id:"p205b_applicability",title:"Confirm Mack CBR applicability"},
 {id:"p205b_connector",title:"Inspect UQLS connectors"},
 {id:"p205b_quality",title:"Verify DEF quality"},
 {id:"p205b_freeze",title:"Check frozen DEF"},
 {id:"p205b_fill",title:"Verify fill level"},
 {id:"p205b_cycle",title:"Run repeat test"},
 {id:"p205b_result",title:"Evaluate result"}
];
const p205bBase={workflowId:"fault_guidance_p205b64",vehicle:{make:"Mack",model:"Anthem",engine:"MP8"},entries:{}};
const p205bUnknown=analyzeDiagnosticCase({...p205bBase,entries:{p205b_applicability:{choice:"AN(4), PR(4), or emissions applicability unknown — stop"}}},p205bSteps);
assert.equal(p205bUnknown.recommendation.stepId,"p205b_applicability");
assert.equal(p205bUnknown.recommendation.state,"hold");
assert.match(p205bUnknown.recommendation.action,/Stop this guided path/i);
const p205bInactive=analyzeDiagnosticCase({...p205bBase,entries:{p205b_applicability:{choice:"Inactive / historic — no troubleshooting required"}}},p205bSteps);
assert.equal(p205bInactive.recommendation.state,"review");
assert.match(p205bInactive.recommendation.action,/Do not troubleshoot or replace/i);
const p205bApplicable=analyzeDiagnosticCase({...p205bBase,entries:{p205b_applicability:{choice:"Active/confirmed and applicability verified"}}},p205bSteps);
assert.equal(p205bApplicable.recommendation.stepId,"p205b_connector");
assert.equal(p205bApplicable.recommendation.state,"next");
const p205bReplace=analyzeDiagnosticCase({...p205bBase,entries:{p205b_applicability:{choice:"Active/confirmed and applicability verified"},p205b_connector:{choice:"No pin, wire, corrosion or moisture damage found"},p205b_quality:{choice:"DEF quality acceptable per Mack specification"},p205b_freeze:{choice:"Tank is not frozen"},p205b_fill:{choice:"Tank adequately filled per Mack procedure"},p205b_cycle:{choice:"Repeat sequence completed; P205B64 returned active/confirmed"},p205b_result:{choice:"P205B64 returned active/confirmed after repeat test"}}},p205bSteps);
assert.equal(p205bReplace.recommendation.state,"review");
assert.match(p205bReplace.recommendation.action,/UQLS replacement/i);
const p205bNoReplace=analyzeDiagnosticCase({...p205bBase,entries:{p205b_applicability:{choice:"Active/confirmed and applicability verified"},p205b_cycle:{choice:"Repeat sequence completed; P205B64 did not return active"},p205b_result:{choice:"P205B64 did not return active after repeat test"}}},p205bSteps);
assert.equal(p205bNoReplace.recommendation.state,"review");
assert.match(p205bNoReplace.recommendation.action,/Do not replace the UQLS/i);

console.log("IronKnuckle Diagnostic Brain v3 specialist and knowledge tests passed.");
