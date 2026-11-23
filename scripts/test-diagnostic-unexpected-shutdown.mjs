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
console.log("Unexpected-shutdown workflow and evidence-driven recommendation tests passed.");
