import assert from "node:assert/strict";
import { classifyFaultGuidanceSystem, getP016F00Guidance } from "../js/fault-guidance-routing.js";
import { analyzeDiagnosticCase } from "../js/diagnostic-brain.js";

const lowPressure = classifyFaultGuidanceSystem({code:"P008A00",description:"Low Pressure Fuel System Pressure - Too Low, No additional information",controller:"EMS"},"Mack");
assert.equal(lowPressure.system,"fuel_supply");
assert.match(lowPressure.description,/Low Pressure Fuel System Pressure/i);
assert.equal(lowPressure.confidence,"case-derived-unverified");

const railPressure = classifyFaultGuidanceSystem({code:"P008700",controller:"EMS"},"Mack");
assert.equal(railPressure.system,"fuel_supply");

const electrical = classifyFaultGuidanceSystem({code:"P0000-00",description:"Engine coolant temperature sensor circuit open",controller:"EMS"},"Mack");
assert.equal(electrical.system,"electrical");

const genericP0 = classifyFaultGuidanceSystem({code:"P0000-00",controller:"ECM"},"Mack");
assert.equal(genericP0.system,"general","Unknown P-codes must not default to electrical");

const descriptionOverride = classifyFaultGuidanceSystem({
  code:"P0000-00",description:"Low Pressure Fuel System Pressure - Too Low"
},"Mack");
assert.equal(descriptionOverride.system,"fuel_supply");


const p016f = getP016F00Guidance({code:"P016F-00"}, {
  vehicle:{make:"Mack",model:"Anthem",year:"2020",engine:"MP8",emissions:"US17+OBD16"},
  entries:{codes:{faultCodes:[{code:"P0087-00"},{code:"P016F-00"},{code:"P228F-00"}]}}
});
assert.ok(p016f);
assert.match(p016f.sourceReference,/K01029637/);
assert.match(p016f.sourceUrl,/10153480/);
assert.equal(p016f.steps[1].id,"p016f_cbr_filter");
assert.match(p016f.steps[1].instruction,/secondary fuel filter/i);
assert.equal(getP016F00Guidance({code:"P016F-00"},{vehicle:{make:"Volvo"}}),null);
const pBase={workflowId:"fault_guidance_p016f",vehicle:{make:"Mack",model:"Anthem",year:"2020",engine:"MP8",emissions:"US17+OBD16"}};
const precursor=analyzeDiagnosticCase({...pBase,entries:{p016f_confirm:{choice:"P009B-13 is also active; diagnose EPRV circuit first"}}},p016f.steps);
assert.equal(precursor.recommendation.state,"hold");
assert.match(precursor.recommendation.action,/K94743326/);
const combo=analyzeDiagnosticCase({...pBase,entries:{p016f_confirm:{choice:"P0087-00, P016F-00 and P228F-00 all present; K01029637 applicability confirmed"}}},p016f.steps);
assert.equal(combo.recommendation.stepId,"p016f_cbr_filter");
const filterPass=analyzeDiagnosticCase({...pBase,entries:{
 p016f_confirm:{choice:"P0087-00, P016F-00 and P228F-00 all present; K01029637 applicability confirmed"},
 p016f_cbr_filter:{choice:"Both CBR inspection areas checked; no defect found"}
}},p016f.steps);
assert.equal(filterPass.recommendation.stepId,"p016f_low_side");
const lowPass=analyzeDiagnosticCase({...pBase,entries:{
 p016f_confirm:{choice:"P016F-00 present; K01029637 combination not present; vehicle and current PTT applicability confirmed"},
 p016f_low_side:{choice:"Low-side pressure meets OEM specification under the fault conditions"}
}},p016f.steps);
assert.equal(lowPass.recommendation.stepId,"p016f_high_side");
console.log("FAULT GUIDANCE ROUTING AND MACK P016F CBR TESTS PASSED");

