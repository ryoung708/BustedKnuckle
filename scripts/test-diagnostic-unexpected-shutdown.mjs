import assert from "node:assert/strict";
import {classifyDiagnosticComplaint} from "../js/diagnostic-complaint-engine.js";
import {unexpectedShutdownWorkflow} from "../js/diagnostic-unexpected-shutdown.js";
import {workflows} from "../js/diagnostic-engine.js";
import {analyzeDiagnosticCase} from "../js/diagnostic-brain.js";
workflows.unexpected_shutdown=unexpectedShutdownWorkflow;

const cases=[
  "2000 Volvo WG64 with Cummins N14 starts and runs fine, then randomly shuts off until warm",
  "Engine hesitates once and shuts off",
  "Truck stalls while driving",
  "Engine cuts out and immediately restarts"
];
for(const complaint of cases){
  const result=classifyDiagnosticComplaint(complaint);
  assert.equal(result.workflowId,"unexpected_shutdown",complaint);
  assert.equal(result.route,"dcc");
}
assert.equal(unexpectedShutdownWorkflow.steps.length,7);
assert.equal(unexpectedShutdownWorkflow.steps[1].id,"engine_architecture");
assert.match(unexpectedShutdownWorkflow.caution,/Do not assume/);
assert.match(unexpectedShutdownWorkflow.steps[4].instruction,/inductive or powered/);
assert.match(unexpectedShutdownWorkflow.steps[5].instruction,/Do not bypass/);
assert.equal(unexpectedShutdownWorkflow.steps.at(-1).terminal,true);

const initial=analyzeDiagnosticCase({workflowId:"unexpected_shutdown",vehicle:{make:"Volvo",model:"WG64",year:"2000",engine:"N14"},complaint:cases[0],entries:{}},unexpectedShutdownWorkflow.steps);
assert.equal(initial.recommendation.stepId,"shutdown_pattern");
const groundAbnormal=analyzeDiagnosticCase({
  workflowId:"unexpected_shutdown",currentStep:4,
  vehicle:{make:"Volvo",model:"WG64",year:"2000",engine:"N14"},
  entries:{
    shutdown_pattern:{choice:"Brief hesitation / miss, then shuts off"},
    engine_architecture:{choice:"Engine and electronic control system positively identified"},
    shutdown_fault_scan:{choice:"No relevant faults found; scan completed"},
    power_ground_integrity:{choice:"Ground path abnormal / excessive drop or unstable",measurements:{actual:"drop recorded under crank load"}}
  }
},unexpectedShutdownWorkflow.steps);
assert.equal(groundAbnormal.recommendation.stepId,"power_ground_integrity");
assert.equal(groundAbnormal.recommendation.state,"hold");
assert.match(groundAbnormal.recommendation.action,/Localize/);
const groundPass=analyzeDiagnosticCase({
  workflowId:"unexpected_shutdown",currentStep:4,
  vehicle:{make:"Volvo",model:"WG64",year:"2000",engine:"N14"},
  entries:{
    shutdown_pattern:{choice:"Brief hesitation / miss, then shuts off"},
    engine_architecture:{choice:"Engine and electronic control system positively identified"},
    shutdown_fault_scan:{choice:"No relevant faults found; scan completed"},
    power_ground_integrity:{choice:"Connection repaired; repeat loaded test now passes"}
  }
},unexpectedShutdownWorkflow.steps);
assert.equal(groundPass.recommendation.stepId,"engine_speed_timing_signal");
assert.equal(groundPass.recommendation.state,"next");
assert.match(groundPass.recommendation.action,/Monitor engine RPM/);
// Explicit shutdown workflow branching: faults, signal dropouts and unverified repairs must hold.
assert.ok(unexpectedShutdownWorkflow.steps.every(step=>step.test&&step.prompt),"Every unexpected-shutdown step needs a test and method/location instruction");

const architectureUnknown=analyzeDiagnosticCase({
  workflowId:"unexpected_shutdown",
  entries:{engine_architecture:{choice:"Engine identified; control architecture still unknown"}}
},unexpectedShutdownWorkflow.steps);
assert.equal(architectureUnknown.recommendation.stepId,"engine_architecture");
assert.equal(architectureUnknown.recommendation.state,"hold");

const timingFault=analyzeDiagnosticCase({
  workflowId:"unexpected_shutdown",
  entries:{shutdown_fault_scan:{choice:"Relevant engine speed / timing / synchronization fault"}}
},unexpectedShutdownWorkflow.steps);
assert.equal(timingFault.recommendation.stepId,"shutdown_fault_scan");
assert.equal(timingFault.recommendation.state,"hold");
assert.match(timingFault.recommendation.action,/matching OEM fault tree/i);

const ecmPowerFault=analyzeDiagnosticCase({
  workflowId:"unexpected_shutdown",
  entries:{shutdown_fault_scan:{choice:"ECM power, ignition, voltage or communication fault"}}
},unexpectedShutdownWorkflow.steps);
assert.equal(ecmPowerFault.recommendation.state,"hold");
assert.match(ecmPowerFault.recommendation.action,/WiringHound General Electrical/i);

const timingDropout=analyzeDiagnosticCase({
  workflowId:"unexpected_shutdown",
  entries:{engine_speed_timing_signal:{choice:"RPM / timing / synchronization drops out or becomes implausible"}}
},unexpectedShutdownWorkflow.steps);
assert.equal(timingDropout.recommendation.stepId,"engine_speed_timing_signal");
assert.equal(timingDropout.recommendation.state,"hold");

const timingStable=analyzeDiagnosticCase({
  workflowId:"unexpected_shutdown",
  entries:{engine_speed_timing_signal:{choice:"Signal remains stable through the shutdown event"}}
},unexpectedShutdownWorkflow.steps);
assert.equal(timingStable.recommendation.stepId,"fuel_control_delivery");

const timingHarnessFound=analyzeDiagnosticCase({
  workflowId:"unexpected_shutdown",
  entries:{engine_speed_timing_signal:{choice:"Connector, terminal or harness defect physically found"}}
},unexpectedShutdownWorkflow.steps);
assert.equal(timingHarnessFound.recommendation.stepId,"engine_speed_timing_signal");
assert.equal(timingHarnessFound.recommendation.state,"hold");

const timingHarnessRepaired=analyzeDiagnosticCase({
  workflowId:"unexpected_shutdown",
  entries:{engine_speed_timing_signal:{choice:"Connector / harness defect repaired; signal retest passes"}}
},unexpectedShutdownWorkflow.steps);
assert.equal(timingHarnessRepaired.recommendation.stepId,"shutdown_repair_verification");

const fuelControlDropout=analyzeDiagnosticCase({
  workflowId:"unexpected_shutdown",
  entries:{fuel_control_delivery:{choice:"Fuel-control command / actuation drops out"}}
},unexpectedShutdownWorkflow.steps);
assert.equal(fuelControlDropout.recommendation.stepId,"fuel_control_delivery");
assert.equal(fuelControlDropout.recommendation.state,"hold");

const fuelStable=analyzeDiagnosticCase({
  workflowId:"unexpected_shutdown",
  entries:{fuel_control_delivery:{choice:"Fuel-control and delivery remain stable within applicable criteria"}}
},unexpectedShutdownWorkflow.steps);
assert.equal(fuelStable.recommendation.stepId,"fuel_control_delivery");
assert.equal(fuelStable.recommendation.state,"hold");

const fuelRepaired=analyzeDiagnosticCase({
  workflowId:"unexpected_shutdown",
  entries:{fuel_control_delivery:{choice:"Fuel-control/delivery defect isolated and repaired; retest passes"}}
},unexpectedShutdownWorkflow.steps);
assert.equal(fuelRepaired.recommendation.stepId,"shutdown_repair_verification");

const symptomStillOccurs=analyzeDiagnosticCase({
  workflowId:"unexpected_shutdown",
  entries:{shutdown_repair_verification:{choice:"Symptom still occurs"}}
},unexpectedShutdownWorkflow.steps);
assert.equal(symptomStillOccurs.recommendation.stepId,"shutdown_repair_verification");
assert.equal(symptomStillOccurs.recommendation.state,"hold");

const retestIncomplete=analyzeDiagnosticCase({
  workflowId:"unexpected_shutdown",
  entries:{shutdown_repair_verification:{choice:"Retest incomplete / original conditions not repeated"}}
},unexpectedShutdownWorkflow.steps);
assert.equal(retestIncomplete.recommendation.state,"hold");

const shutdownVerified=analyzeDiagnosticCase({
  workflowId:"unexpected_shutdown",
  entries:{shutdown_repair_verification:{choice:"Original shutdown condition no longer occurs; repair verified"}}
},unexpectedShutdownWorkflow.steps);
assert.equal(shutdownVerified.recommendation.state,"review");

console.log("Unexpected-shutdown workflow and evidence-driven recommendation tests passed.");
