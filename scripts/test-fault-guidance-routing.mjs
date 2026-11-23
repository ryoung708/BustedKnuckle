import assert from "node:assert/strict";
import { classifyFaultGuidanceSystem } from "../js/fault-guidance-routing.js";

const lowPressure = classifyFaultGuidanceSystem({code:"P008A00",controller:"EMS"},"Mack");
assert.equal(lowPressure.system,"fuel_supply");
assert.match(lowPressure.description,/Low Pressure Fuel System Pressure/i);
assert.equal(lowPressure.confidence,"case-derived-unverified");

const railPressure = classifyFaultGuidanceSystem({code:"P008700",controller:"EMS"},"Mack");
assert.equal(railPressure.system,"fuel_supply");

const electrical = classifyFaultGuidanceSystem({code:"P2452-13",controller:"EMS"},"Mack");
assert.equal(electrical.system,"electrical");

const genericP0 = classifyFaultGuidanceSystem({code:"P0000-00",controller:"ECM"},"Mack");
assert.equal(genericP0.system,"general","Unknown P-codes must not default to electrical");

const descriptionOverride = classifyFaultGuidanceSystem({
  code:"P0000-00",description:"Low Pressure Fuel System Pressure - Too Low"
},"Mack");
assert.equal(descriptionOverride.system,"fuel_supply");

console.log("FAULT GUIDANCE ROUTING TESTS PASSED");
