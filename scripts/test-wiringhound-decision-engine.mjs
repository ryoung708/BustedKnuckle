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

// An abnormal main-disconnect result must trigger inspection at that boundary,
// not advance to main distribution as though the switch passed.
const disconnectAbnormal=recommendNextStep(record("power_loss","main_disconnect","Excessive drop across closed switch"),powerLoss);
assert.equal(disconnectAbnormal.stepId,"main_disconnect");
assert.equal(disconnectAbnormal.state,"hold");
assert.match(disconnectAbnormal.action,/master disconnect switch/i);
assert.match(disconnectAbnormal.action,/cable terminations/i);
assert.match(disconnectAbnormal.action,/Do not bypass/i);

// Explicitly out-of-spec free-text readings are recognized even when the
// technician has not selected an observation; ambiguous numeric values are not.
const readingOnly=recommendNextStep({workflowId:"power_loss",currentStep:3,entries:{main_disconnect:{measurements:{actual:"1.4 V drop across closed switch; spec maximum 0.2 V"},testPoints:"Across switch studs"}}},powerLoss);
assert.equal(readingOnly.stepId,"main_disconnect");
assert.equal(readingOnly.state,"hold");
assert.match(readingOnly.action,/Inspect the master disconnect switch/i);
const ambiguousReading=recommendNextStep({workflowId:"power_loss",currentStep:3,entries:{main_disconnect:{measurements:{actual:"1.4 V"}}}},powerLoss);
assert.equal(ambiguousReading.state,"hold");
assert.match(ambiguousReading.reason,/has saved notes, measurements/);
const connectionAbnormal=recommendNextStep(record("power_loss","battery_connections","Excessive drop across a battery connection"),powerLoss);
assert.equal(connectionAbnormal.stepId,"battery_connections");
assert.equal(connectionAbnormal.state,"hold");
assert.match(connectionAbnormal.action,/battery post/i);
assert.equal(recommendNextStep({workflowId:"power_loss",currentStep:1,entries:{battery_baseline:{measurements:{actual:"12.4 V at battery posts"}}}},powerLoss).state,"hold");
assert.equal(recommendNextStep({workflowId:"power_loss",currentStep:2,entries:{scope:{choice:"All vehicle electrical power is lost"},battery_connections:{notes:"Posts clean; voltage drop not yet measured"}}},powerLoss).stepId,"battery_connections");
assert.equal(recommendNextStep({workflowId:"power_loss",currentStep:2,entries:{scope:{choice:"All vehicle electrical power is lost"},battery_connections:{choice:"Connection checks are within applicable limits"}}},powerLoss).stepId,"main_disconnect");

// Power-loss path: never advance on an untested or unresolved boundary.
assert.equal(recommendNextStep(record("power_loss","battery_connections","Not tested / result uncertain"),powerLoss).stepId,"battery_connections");
assert.equal(recommendNextStep(record("power_loss","battery_connections","Not tested / result uncertain"),powerLoss).state,"hold");
assert.equal(recommendNextStep(record("power_loss","battery_baseline","Battery-post voltage collapses during the event"),powerLoss).state,"hold");
assert.equal(recommendNextStep(record("power_loss","main_disconnect","Power is present at input but lost at output"),powerLoss).state,"hold");
assert.match(recommendNextStep(record("power_loss","main_disconnect","Power is present at input but lost at output"),powerLoss).action,/closed switch/i);
assert.equal(recommendNextStep(record("power_loss","main_distribution","Power at protection input; missing at output"),powerLoss).state,"hold");
assert.equal(recommendNextStep(record("power_loss","grounds","Not tested / ground architecture unclear"),powerLoss).state,"hold");
assert.equal(recommendNextStep(record("power_loss","ignition_feed","Ignition or run command disappears"),powerLoss).state,"hold");
assert.equal(recommendNextStep(record("power_loss","ignition_feed","Switched feeds remain stable during event"),powerLoss).stepId,"intermittent_localization");
assert.equal(recommendNextStep(record("power_loss","intermittent_localization","No dropout reproduced during monitoring"),powerLoss).state,"hold");
assert.equal(recommendNextStep(record("power_loss","intermittent_localization","Dropout localized to repeatable connection or segment"),powerLoss).stepId,"verify");
assert.equal(recommendNextStep(record("power_loss","scope","Engine shuts off but cab and accessories stay powered"),powerLoss).state,"hold");
assert.match(recommendNextStep(record("power_loss","scope","Engine shuts off but cab and accessories stay powered"),powerLoss).action,/Unexpected Shutdown/i);

// General Electrical uses the same electrical decision tree as Light INOP; exercise it explicitly.
assert.equal(recommendNextStep(record("general_electrical","protection","No power at protection input"),lighting).stepId,"upstream_feed");
assert.equal(recommendNextStep(record("general_electrical","control","Command not present"),lighting).stepId,"control_inputs");
assert.equal(recommendNextStep(record("general_electrical","load","Ground path abnormal"),lighting).stepId,"drop");
assert.equal(recommendNextStep(record("general_electrical","load_review","Load passes approved test"),lighting).stepId,"harness");

// J1939 isolation and evidence gates: every branch must be completed or explicitly held.
assert.equal(recommendNextStep(record("j1939_network","resistance","Resistance is unstable or changes with harness movement"),j1939).stepId,"segment");
assert.equal(recommendNextStep(record("j1939_network","addon","No change when add-on devices are removed"),j1939).stepId,"module_isolation");
assert.equal(recommendNextStep(record("j1939_network","addon_review","No issue found in add-on branch"),j1939).stepId,"module_isolation");
assert.equal(recommendNextStep(record("j1939_network","module_isolation","Dropout remained / no clear change"),j1939).stepId,"all_isolated");
assert.equal(recommendNextStep(record("j1939_network","module_branch_review","No branch fault / no defect"),j1939).stepId,"all_isolated");
assert.equal(recommendNextStep(record("j1939_network","all_isolated","Unable to verify complete isolation"),j1939).state,"hold");
assert.equal(recommendNextStep(record("j1939_network","segment","Unable to isolate clearly"),j1939).state,"hold");
assert.equal(recommendNextStep(record("j1939_network","harness","Intermittent change; exact location not isolated"),j1939).state,"hold");
assert.equal(recommendNextStep(record("j1939_network","verify","Repair not yet verified"),j1939).state,"hold");

// Light INOP branch matrix: a pass, failed test and incomplete result must not share the same route.
assert.equal(recommendNextStep(record("light_inop","protection","Protection output missing / device opens"),lighting).stepId,"protection_review");
assert.equal(recommendNextStep(record("light_inop","protection","Input and output feed appear correct"),lighting).stepId,"control");
assert.equal(recommendNextStep(record("light_inop","control","Command not present"),lighting).stepId,"control_inputs");
assert.equal(recommendNextStep(record("light_inop","control","Command present; output missing"),lighting).stepId,"load");
assert.equal(recommendNextStep(record("light_inop","control","Controller reports output or protection fault"),lighting).stepId,"load");
assert.equal(recommendNextStep(record("light_inop","control_inputs","Missing input / enable condition identified"),lighting).state,"hold");
assert.match(recommendNextStep(record("light_inop","control_inputs","Missing input / enable condition identified"),lighting).action,/source controller/i);
assert.equal(recommendNextStep(record("light_inop","control_inputs","Required data or procedure unavailable"),lighting).state,"hold");
assert.equal(recommendNextStep(record("light_inop","protection_review","Downstream overload / short identified"),lighting).state,"hold");
assert.match(recommendNextStep(record("light_inop","protection_review","Downstream overload / short identified"),lighting).action,/never install a larger fuse/i);
assert.equal(recommendNextStep(record("light_inop","drop","Reading changes when harness is moved"),lighting).stepId,"harness");
assert.equal(recommendNextStep(record("light_inop","load","Supply missing at load"),lighting).stepId,"protection");
assert.equal(recommendNextStep(record("light_inop","load","Correct supply and ground present"),lighting).stepId,"load_review");
assert.equal(recommendNextStep(record("light_inop","control_inputs","Inputs and enables appear correct"),lighting).stepId,"control");
assert.equal(recommendNextStep(record("light_inop","load","Connector concern found"),lighting).stepId,"harness");
assert.equal(recommendNextStep(record("light_inop","drop","Excessive drop on positive/ground path"),lighting).stepId,"harness");
assert.equal(recommendNextStep(record("light_inop","drop","Both paths within specification"),lighting).stepId,"load_review");
assert.equal(recommendNextStep(record("light_inop","load_review","Load failed on known-good supply and ground"),lighting).stepId,"verify");
assert.equal(recommendNextStep(record("light_inop","harness","No physical fault isolated"),lighting).stepId,"drop");


// Short-to-ground: an unsafe isolation or unresolved continuity must not advance.
const shortGround=[{id:"scope"},{id:"powerdown"},{id:"loads"},{id:"segment"},{id:"verify"}];
assert.equal(recommendNextStep(record("short_ground","scope","Fuse opens immediately"),shortGround).stepId,"powerdown");
assert.equal(recommendNextStep(record("short_ground","powerdown","Voltage remains / isolation incomplete"),shortGround).state,"hold");
assert.equal(recommendNextStep(record("short_ground","loads","Not safely isolated"),shortGround).state,"hold");
assert.equal(recommendNextStep(record("short_ground","segment","Unexpected continuity remains"),shortGround).state,"hold");
assert.equal(recommendNextStep(record("short_ground","segment","Defect repaired; ready for verification"),shortGround).stepId,"verify");

// Short-to-power: a possible cross-contact requires isolation/repair before verification.
const shortPower=[{id:"scope"},{id:"isolate"},{id:"branches"},{id:"inspect"},{id:"verify"}];
assert.equal(recommendNextStep(record("short_power","isolate","Isolation incomplete"),shortPower).state,"hold");
assert.equal(recommendNextStep(record("short_power","branches","No branch isolated"),shortPower).state,"hold");
assert.equal(recommendNextStep(record("short_power","inspect","Connector contamination found"),shortPower).state,"hold");
assert.equal(recommendNextStep(record("short_power","inspect","Defect repaired; ready for verification"),shortPower).stepId,"verify");

// Open circuit: a localized open/high-resistance segment is not yet a completed repair.
const openCircuit=[{id:"scope"},{id:"supply"},{id:"connectors"},{id:"segment"},{id:"verify"}];
assert.equal(recommendNextStep(record("open_circuit","supply","Not tested yet"),openCircuit).state,"hold");
assert.equal(recommendNextStep(record("open_circuit","connectors","Connector appears sound"),openCircuit).stepId,"segment");
assert.equal(recommendNextStep(record("open_circuit","segment","Open isolated to one segment"),openCircuit).state,"hold");
assert.equal(recommendNextStep(record("open_circuit","segment","Defect repaired; ready for verification"),openCircuit).stepId,"verify");

// Voltage drop: both sides are independently tested, and abnormal readings stay local.
const voltageDrop=[{id:"conditions"},{id:"positive"},{id:"ground"},{id:"repair"},{id:"verify"}];
assert.equal(recommendNextStep(record("voltage_drop","conditions","Failure not reproduced"),voltageDrop).state,"hold");
assert.equal(recommendNextStep(record("voltage_drop","positive","Drop localized to positive segment"),voltageDrop).state,"hold");
assert.equal(recommendNextStep(record("voltage_drop","positive","Positive path within specification"),voltageDrop).stepId,"ground");
assert.equal(recommendNextStep(record("voltage_drop","ground","Drop localized to ground segment"),voltageDrop).state,"hold");
assert.equal(recommendNextStep(record("voltage_drop","ground","Ground path within specification"),voltageDrop).stepId,"repair");
assert.equal(recommendNextStep(record("voltage_drop","repair","No defect confirmed"),voltageDrop).state,"hold");
assert.equal(recommendNextStep(record("voltage_drop","repair","Repair completed; retest pending"),voltageDrop).stepId,"verify");

// Intermittent: failure capture and a repeatable location are required before repair verification.
const intermittent=[{id:"pattern"},{id:"baseline"},{id:"manipulate"},{id:"isolate"},{id:"verify"}];
assert.equal(recommendNextStep(record("intermittent","baseline","Cannot reproduce"),intermittent).state,"hold");
assert.equal(recommendNextStep(record("intermittent","manipulate","No change"),intermittent).state,"hold");
assert.equal(recommendNextStep(record("intermittent","manipulate","Unexpected / unclear observation"),intermittent).state,"hold");
assert.equal(recommendNextStep(record("intermittent","isolate","No segment isolated"),intermittent).state,"hold");
assert.equal(recommendNextStep(record("intermittent","isolate","Specific connector isolated"),intermittent).state,"hold");
assert.equal(recommendNextStep(record("intermittent","isolate","Defect repaired; ready for verification"),intermittent).stepId,"verify");
assert.equal(recommendNextStep(record("intermittent","verify","Failure reduced but still present"),intermittent).state,"hold");

console.log("WiringHound decision engine tests passed.");
