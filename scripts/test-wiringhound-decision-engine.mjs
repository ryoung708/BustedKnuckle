import assert from "node:assert/strict";
import { recommendNextStep } from "../js/wiringhound-decision-engine.js";
const j1939=[{id:"baseline"},{id:"resistance"},{id:"addon"},{id:"addon_review"},{id:"module_isolation"},{id:"module_branch_review"},{id:"all_isolated"},{id:"segment"},{id:"harness"},{id:"verify"}];
const lighting=[{id:"complaint"},{id:"protection"},{id:"upstream_feed"},{id:"protection_review"},{id:"control"},{id:"control_inputs"},{id:"load"},{id:"drop"},{id:"load_review"},{id:"harness"},{id:"verify"}];
const record=(workflowId,id,choice)=>({workflowId,entries:{[id]:{choice,updatedAt:"2026-11-05T12:00:00.000Z"}}});
assert.equal(recommendNextStep(record("j1939_network","baseline","Multiple modules offline"),j1939).stepId,"resistance");
assert.equal(recommendNextStep(record("j1939_network","resistance","Approximately 60Ω under this test setup"),j1939).stepId,"addon");
assert.equal(recommendNextStep(record("j1939_network","module_isolation","Voltage returned when a particular module was disconnected"),j1939).stepId,"module_branch_review");
assert.equal(recommendNextStep(record("j1939_network","harness","Reading changed at a repeatable location"),j1939).stepId,"verify");
assert.equal(recommendNextStep(record("light_inop","protection","No power at protection input"),lighting).stepId,"upstream_feed");
assert.equal(recommendNextStep(record("light_inop","control","Command is not present"),lighting).stepId,"control_inputs");
assert.equal(recommendNextStep(record("light_inop","load","Ground path abnormal"),lighting).stepId,"drop");
assert.equal(recommendNextStep(record("light_inop","load_review","Load passes approved test"),lighting).stepId,"harness");
assert.equal(recommendNextStep({workflowId:"j1939_network",entries:{}},j1939).stepId,"baseline");

const powerLoss=[{id:"scope"},{id:"battery_baseline"},{id:"battery_connections"},{id:"main_disconnect"},{id:"main_distribution"},{id:"grounds"},{id:"ignition_feed"},{id:"intermittent_localization"},{id:"verify"}];
assert.equal(recommendNextStep(record("power_loss","scope","All vehicle electrical power is lost"),powerLoss).stepId,"battery_baseline");
assert.equal(recommendNextStep(record("power_loss","battery_baseline","Battery-post voltage stays stable during the event"),powerLoss).stepId,"battery_connections");
assert.equal(recommendNextStep(record("power_loss","main_disconnect","Vehicle has no separate master disconnect / not applicable"),powerLoss).stepId,"main_distribution");
assert.equal(recommendNextStep(record("power_loss","ignition_feed","Switched feeds remain stable during event"),powerLoss).stepId,"intermittent_localization");
assert.equal(recommendNextStep(record("power_loss","scope","Could not reproduce the event"),powerLoss).state,"hold");
assert.equal(recommendNextStep({workflowId:"power_loss",currentStep:1,entries:{battery_baseline:{measurements:{actual:"12.4 V at battery posts"}}}},powerLoss).state,"hold");
assert.equal(recommendNextStep({workflowId:"power_loss",currentStep:2,entries:{scope:{choice:"All vehicle electrical power is lost"},battery_connections:{notes:"Posts clean; voltage drop not yet measured"}}},powerLoss).stepId,"battery_connections");
assert.equal(recommendNextStep({workflowId:"power_loss",currentStep:2,entries:{scope:{choice:"All vehicle electrical power is lost"},battery_connections:{choice:"Connection checks are within applicable limits"}}},powerLoss).stepId,"main_disconnect");

console.log("WiringHound decision engine tests passed.");
