import assert from "node:assert/strict";
import { classifyComplaint, powerLossSteps, sensorSteps, sensorRecommendation } from "../js/wiringhound-complaint-engine.js";
const total=classifyComplaint("Intermittent complete power loss while driving");
assert.equal(total.id,"power_loss");
assert.equal(powerLossSteps[0].id,"scope");
assert.equal(powerLossSteps.at(-1).id,"verify");
assert.equal(classifyComplaint("Multiple controllers drop offline with J1939 communication loss").id,"j1939_network");
assert.equal(classifyComplaint("Right headlight inoperative").id,"light_inop");
assert.equal(classifyComplaint("Truck will not crank, dash stays on").id,"starting_system");
console.log("WiringHound complaint workflow tests passed.");

assert.equal(classifyComplaint("Fuel pressure sensor circuit short").id,"sensor_circuit");
for(const [index,step] of sensorSteps.entries()){
 assert.equal(sensorRecommendation({currentStep:index,entries:{}},sensorSteps).state,"hold");
 for(const [i,choice] of step.choices.entries()){
  const result=sensorRecommendation({currentStep:index,entries:{[step.id]:{choice}}},sensorSteps);
  const target=step.targets[i];
  assert.equal(result.state,target==="review"?"review":target==="hold"?"hold":"next");
  assert.equal(result.stepId,["hold","review"].includes(target)?step.id:target);
 }
}
