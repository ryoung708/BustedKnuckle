import assert from "node:assert/strict";
import { classifyDiagnosticComplaint } from "../js/diagnostic-complaint-engine.js";
import { workflows } from "../js/diagnostic-engine.js";

const cases = [
  ["CAN network drops out and several controllers go offline", "wiringhound", ""],
  ["No crank, starter will not engage", "wiringhound", ""],
  ["Large voltage drop across the main disconnect", "wiringhound", ""],
  ["Headlights and marker lights are inoperative", "wiringhound", ""],
  ["DPF regeneration will not complete and DEF warning is on", "dcc", "aftertreatment_fault"],
  ["Transmission is stuck in gear and will not shift", "dcc", "drivetrain_fault"],
  ["Engine cranks but will not start", "dcc", "crank_no_start"],
  ["Low engine power under load with a derate", "dcc", "engine_power_loss"],
  ["Check engine light is on with an active SPN/FMI", "dcc", "check_engine_light"],
  ["Driver reports an unusual engine noise", "dcc", "complaint_triage"],
  ["Truck will not start; cranking behavior is not known", "dcc", "complaint_triage"]
];

for (const [complaint, route, workflowId] of cases) {
  const result = classifyDiagnosticComplaint(complaint);
  assert.equal(result.route, route, complaint);
  if (workflowId) {
    assert.equal(result.workflowId, workflowId, complaint);
    assert.ok(workflows[workflowId], "Workflow exists for " + complaint);
  }
  assert.ok(result.reason.length > 20, "Classifier should explain its recommendation");
}

console.log("Diagnostic complaint routing tests passed.");
