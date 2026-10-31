import assert from "node:assert/strict";
import {workflows,createSession,recordStep,evaluateSession,exportSession} from "../js/diagnostic-engine.js";

assert.ok(Object.keys(workflows).length>=8);

const s=createSession({workflowId:"j1939_dropout",make:"Example"});
assert.equal(evaluateSession(s).status,"in-progress");

recordStep(s,0,{choice:"Multiple modules offline",notes:"baseline"});
assert.equal(s.entries.baseline.choice,"Multiple modules offline");

recordStep(s,1,{choice:"Both legs collapse / drop out",measurements:{canH:"0.4V",canL:"0.3V"}});
assert.match(evaluateSession(s).nextActions.join(" "),/add-on network devices/i);
assert.match(exportSession(s),/"schemaVersion": 1/);

// A final verification entry must not complete a case when required stages are skipped.
const incomplete=createSession({workflowId:"j1939_dropout",make:"Example"});
recordStep(incomplete,0,{choice:"Multiple modules offline"});
recordStep(incomplete,1,{choice:"Both legs collapse / drop out"});
const last=workflows.j1939_dropout.steps.length-1;
recordStep(incomplete,last,{choice:"Repair verified under original conditions"});
const incompleteResult=evaluateSession(incomplete);
assert.equal(incompleteResult.status,"in-progress");
assert.equal(incompleteResult.completed,3);
assert.equal(incompleteResult.total,workflows.j1939_dropout.steps.length);

// Complete each required stage in order before recording final verification.
for(let index=2;index<last;index+=1) {
  const step=workflows.j1939_dropout.steps[index];
  recordStep(s,index,{choice:step.choices[0],notes:"Recorded for workflow progression."});
}
recordStep(s,last,{choice:"Repair verified under original conditions"});
const completedResult=evaluateSession(s);
assert.equal(completedResult.status,"ready-for-review");
assert.equal(completedResult.completed,workflows.j1939_dropout.steps.length);

// A completed workflow with an unconfirmed cause must still require more evidence.
const unconfirmed=createSession({workflowId:"j1939_dropout",make:"Example"});
for(let index=0;index<last;index+=1) {
  const step=workflows.j1939_dropout.steps[index];
  recordStep(unconfirmed,index,{choice:step.choices[0]});
}
recordStep(unconfirmed,last,{choice:"Cause remains unconfirmed"});
assert.equal(evaluateSession(unconfirmed).status,"needs-more-evidence");

console.log("Diagnostic engine tests passed.");
