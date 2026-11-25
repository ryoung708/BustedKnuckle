import assert from "node:assert/strict";
import { analyzeDiagnosticCase } from "../js/diagnostic-brain.js";
import { getP016F00Guidance } from "../js/fault-guidance-routing.js";
import { getMackP205B64Guidance } from "../js/oem-fault-guidance.js";
import { workflows, createSession, recordStep, evaluateSession } from "../js/diagnostic-engine.js";

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

const engineLowPowerSystem = analyzeDiagnosticCase({
  workflowId:"engine_power_loss",
  vehicle:{make:"Mack",model:"Anthem",engine:"MP8"},
  complaint:"Low engine power under load with an engine derate",
  entries:{}
},powertrainSteps);
assert.equal(engineLowPowerSystem.specialist.id,"powertrain");

const vehiclePowerLossSystem = analyzeDiagnosticCase({
  workflowId:"power_loss",
  vehicle:{make:"Mack",model:"Anthem",engine:"MP8"},
  complaint:"Complete vehicle electrical power loss",
  entries:{}
},powertrainSteps);
assert.equal(vehiclePowerLossSystem.specialist.id,"wiringhound");

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

// Mack P016F00 low-side outcomes must branch into isolation and a mandatory retest.
const p016fCase = {
  workflowId:"fault_guidance_p016f",
  vehicle:{make:"Mack",model:"Anthem",year:"2020",engine:"MP8",emissions:"US17+OBD16"},
  complaint:"P016F00 common-rail fuel pressure fault"
};
const p016fPlan = getP016F00Guidance({code:"P016F00"},p016fCase);
assert.ok(p016fPlan);
const lowSideFail = analyzeDiagnosticCase({
  ...p016fCase,
  entries:{
    p016f_confirm:{choice:"P016F-00 present; K01029637 combination not present; vehicle and current PTT applicability confirmed"},
    p016f_low_side:{choice:"Low-side pressure below OEM specification"}
  }
},p016fPlan.steps);
assert.equal(lowSideFail.recommendation.stepId,"p016f_low_side_isolate");
assert.equal(lowSideFail.recommendation.state,"next");
assert.match(lowSideFail.recommendation.action,/transfer-pump output/i);

const lowSidePass = analyzeDiagnosticCase({
  ...p016fCase,
  entries:{
    p016f_confirm:{choice:"P016F-00 present; K01029637 combination not present; vehicle and current PTT applicability confirmed"},
    p016f_low_side:{choice:"Low-side pressure meets OEM specification under the fault conditions"}
  }
},p016fPlan.steps);
assert.equal(lowSidePass.recommendation.stepId,"p016f_high_side");
assert.equal(lowSidePass.recommendation.state,"next");

const lowSideCorrected = analyzeDiagnosticCase({
  ...p016fCase,
  entries:{p016f_low_side_isolate:{choice:"Defect confirmed and corrected"}}
},p016fPlan.steps);
assert.equal(lowSideCorrected.recommendation.stepId,"p016f_low_side_retest");

const lowSideRetestPass = analyzeDiagnosticCase({
  ...p016fCase,
  entries:{p016f_low_side_retest:{choice:"Low-side pressure meets OEM specification under the original fault conditions"}}
},p016fPlan.steps);
assert.equal(lowSideRetestPass.recommendation.stepId,"p016f_high_side");

const k010Codes = [{code:"P0087-00"},{code:"P016F-00"},{code:"P228F-00"}];
const k010EligibleCase = {
  ...p016fCase,
  vehicle:{...p016fCase.vehicle,model:"AN"},
  entries:{
    scan:{faultCodes:k010Codes},
    p016f_confirm:{choice:"P0087-00, P016F-00 and P228F-00 all present; K01029637 applicability confirmed"}
  }
};
const k010Plan = getP016F00Guidance({code:"P016F00"},k010EligibleCase);
assert.equal(k010Plan.caseFlags.k010Candidate,true);
const k010Ready = analyzeDiagnosticCase(k010EligibleCase,k010Plan.steps);
assert.equal(k010Ready.recommendation.stepId,"p016f_cbr_filter");
assert.equal(k010Ready.recommendation.state,"next");

const missingCodesCase = {
  ...p016fCase,
  entries:{p016f_confirm:{choice:"P0087-00, P016F-00 and P228F-00 all present; K01029637 applicability confirmed"}}
};
const missingCodesPlan = getP016F00Guidance({code:"P016F00"},missingCodesCase);
const missingCodesDecision = analyzeDiagnosticCase(missingCodesCase,missingCodesPlan.steps);
assert.equal(missingCodesDecision.recommendation.stepId,"p016f_confirm");
assert.equal(missingCodesDecision.recommendation.state,"hold");
assert.match(missingCodesDecision.recommendation.action,/full scan-report fault set/i);

const incompleteApplicabilityCase = {
  ...k010EligibleCase,
  vehicle:{make:"Mack",model:"AN",year:"2020",engine:"MP8",emissions:""}
};
const incompleteApplicabilityPlan = getP016F00Guidance({code:"P016F00"},incompleteApplicabilityCase);
assert.equal(incompleteApplicabilityPlan.caseFlags.k010Candidate,false);
const incompleteApplicabilityDecision = analyzeDiagnosticCase(incompleteApplicabilityCase,incompleteApplicabilityPlan.steps);
assert.equal(incompleteApplicabilityDecision.recommendation.stepId,"p016f_confirm");
assert.equal(incompleteApplicabilityDecision.recommendation.state,"hold");
assert.match(incompleteApplicabilityDecision.recommendation.action,/do not apply K01029637/i);

const lowSideIncomplete = analyzeDiagnosticCase({
  ...p016fCase,
  entries:{p016f_low_side:{choice:"Low-side test incomplete / specification unavailable"}}
},p016fPlan.steps);
assert.equal(lowSideIncomplete.recommendation.stepId,"p016f_low_side");
assert.equal(lowSideIncomplete.recommendation.state,"hold");
assert.match(lowSideIncomplete.recommendation.action,/Do not treat missing data as a pass/i);

const pendingLowSideRepair = analyzeDiagnosticCase({
  ...p016fCase,
  entries:{p016f_low_side_isolate:{choice:"Defect identified; repair pending"}}
},p016fPlan.steps);
assert.equal(pendingLowSideRepair.recommendation.stepId,"p016f_low_side_isolate");
assert.equal(pendingLowSideRepair.recommendation.state,"hold");
assert.match(pendingLowSideRepair.recommendation.action,/Do not proceed to high-side testing/i);

// Mack UQLS CBR must hard-stop excluded AN(4) / PR(4) variants.
const p205Plan=getMackP205B64Guidance({code:"P205B64"},{make:"Mack",model:"AN(4)"});
const p205Excluded=analyzeDiagnosticCase({
  workflowId:"fault_guidance_p205b",
  vehicle:{make:"Mack",model:"AN(4)",engine:"MP8"},
  entries:{p205b_applicability:{choice:"AN(4), PR(4), or emissions applicability unknown — stop"}}
},p205Plan.steps);
assert.equal(p205Excluded.recommendation.stepId,"p205b_applicability");
assert.equal(p205Excluded.recommendation.state,"hold");
assert.match(p205Excluded.recommendation.action,/stop before using/i);

// Real crank/no-start workflow: explicit outcome routing and optional fuel branch stages.
const crankPlan = workflows.crank_no_start.steps;
const crankBase = {workflowId:"crank_no_start",vehicle:{make:"Mack",model:"Anthem",engine:"MP8"},complaint:"Cranks but will not start"};
const scanIncomplete = analyzeDiagnosticCase({...crankBase,entries:{codes:{choice:"Scan incomplete"}}},crankPlan);
assert.equal(scanIncomplete.recommendation.stepId,"codes");
assert.equal(scanIncomplete.recommendation.state,"hold");
assert.match(scanIncomplete.recommendation.action,/repeat the full scan/i);

const scanClear = analyzeDiagnosticCase({...crankBase,entries:{codes:{choice:"No relevant faults found"}}},crankPlan);
assert.equal(scanClear.recommendation.stepId,"enable");

const activeFaults = analyzeDiagnosticCase({...crankBase,entries:{codes:{choice:"Relevant active faults present"}}},crankPlan);
assert.equal(activeFaults.recommendation.stepId,"codes");
assert.equal(activeFaults.recommendation.state,"hold");
assert.match(activeFaults.recommendation.action,/attach every relevant code/i);

const enableMissing = analyzeDiagnosticCase({...crankBase,entries:{enable:{choice:"Start enable missing"}}},crankPlan);
assert.equal(enableMissing.recommendation.stepId,"enable");
assert.equal(enableMissing.recommendation.state,"hold");
assert.match(enableMissing.recommendation.action,/inhibit reason/i);

const enableValid = analyzeDiagnosticCase({...crankBase,entries:{enable:{choice:"Enable and sync appear valid"}}},crankPlan);
assert.equal(enableValid.recommendation.stepId,"fuel");

const fuelFail = analyzeDiagnosticCase({...crankBase,entries:{fuel:{choice:"Supply outside specification"}}},crankPlan);
assert.equal(fuelFail.recommendation.stepId,"fuel_isolation");

const fuelCorrected = analyzeDiagnosticCase({...crankBase,entries:{fuel_isolation:{choice:"Defect confirmed and corrected"}}},crankPlan);
assert.equal(fuelCorrected.recommendation.stepId,"fuel_retest");

const fuelRetestPass = analyzeDiagnosticCase({...crankBase,entries:{fuel_retest:{choice:"Fuel supply meets OEM specification under cranking conditions"}}},crankPlan);
assert.equal(fuelRetestPass.recommendation.stepId,"air_exhaust");

const fuelRetestFail = analyzeDiagnosticCase({...crankBase,entries:{fuel_retest:{choice:"Supply remains outside OEM specification"}}},crankPlan);
assert.equal(fuelRetestFail.recommendation.stepId,"fuel_isolation");

const airRepair = analyzeDiagnosticCase({...crankBase,entries:{air_exhaust:{choice:"Concern isolated and corrected; prerequisites now pass"}}},crankPlan);
assert.equal(airRepair.recommendation.stepId,"verify");
const noCause = analyzeDiagnosticCase({...crankBase,entries:{air_exhaust:{choice:"No abnormality identified"}}},crankPlan);
assert.equal(noCause.recommendation.stepId,"air_exhaust");
assert.equal(noCause.recommendation.state,"hold");
assert.match(noCause.recommendation.action,/Do not mark the engine diagnosed/i);

const verifiedCrank = analyzeDiagnosticCase({...crankBase,entries:{verify:{choice:"Cause and repair verified"}}},crankPlan);
assert.equal(verifiedCrank.recommendation.state,"review");

// Optional branch steps must not prevent a normal, fully verified no-start path from completing.
const normalCrankSession=createSession({workflowId:"crank_no_start",make:"Mack",model:"Anthem",engine:"MP8"});
recordStep(normalCrankSession,0,{choice:"No relevant faults found"});
recordStep(normalCrankSession,1,{choice:"Enable and sync appear valid"});
recordStep(normalCrankSession,2,{choice:"Fuel supply meets specification"});
recordStep(normalCrankSession,5,{choice:"No abnormality identified"});
recordStep(normalCrankSession,6,{choice:"Cause and repair verified"});
const normalCrankResult=evaluateSession(normalCrankSession);
assert.equal(normalCrankResult.status,"ready-for-review");
assert.equal(normalCrankResult.completed,5);
assert.equal(normalCrankResult.total,5);

const branchedCrankSession=createSession({workflowId:"crank_no_start",make:"Mack",model:"Anthem",engine:"MP8"});
recordStep(branchedCrankSession,0,{choice:"No relevant faults found"});
recordStep(branchedCrankSession,1,{choice:"Enable and sync appear valid"});
recordStep(branchedCrankSession,2,{choice:"Supply outside specification"});
recordStep(branchedCrankSession,3,{choice:"Defect confirmed and corrected"});
recordStep(branchedCrankSession,4,{choice:"Fuel supply meets OEM specification under cranking conditions"});
recordStep(branchedCrankSession,5,{choice:"Concern isolated and corrected; prerequisites now pass"});
recordStep(branchedCrankSession,6,{choice:"Cause and repair verified"});
const branchedCrankResult=evaluateSession(branchedCrankSession);
assert.equal(branchedCrankResult.status,"ready-for-review");
assert.equal(branchedCrankResult.completed,5);
assert.equal(branchedCrankResult.total,5);

console.log("IronKnuckle Diagnostic Brain v3 specialist and knowledge tests passed.");
