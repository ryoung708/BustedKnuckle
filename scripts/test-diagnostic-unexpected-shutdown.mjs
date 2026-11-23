import assert from "node:assert/strict";
import {classifyDiagnosticComplaint} from "../js/diagnostic-complaint-engine.js";
import {unexpectedShutdownWorkflow} from "../js/diagnostic-unexpected-shutdown.js";

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
console.log("Unexpected-shutdown workflow tests passed.");
