import assert from "node:assert/strict";
import { buildVehicleContext, normalizeVehicleIdentity } from "../js/vehicle-context.js";

const mack=buildVehicleContext({
  year:"2022",make:"Mack",model:"Anthem",engineMake:"Mack",engine:"MP8",
  transmissionMake:"Mack",transmissionModel:"mDRIVE",emissions:"US17 + OBD2018",vinLast6:"002539"
});
assert.equal(mack.identityStatus,"identified");
assert.equal(mack.platformId,"mack-volvo");
assert.equal(mack.engineFamilyId,"mack-mp8");
assert.equal(mack.identity.engineModel,"MP8");
assert.equal(mack.identity.transmissionModel,"mDRIVE");
assert.equal(mack.identity.vinLast6,"002539");
assert.equal(mack.applicabilityStatus,"unverified");
assert.match(mack.applicabilityNote,/not proof/i);
assert.equal(mack.identityKey.includes("002539"),false,"VIN fragment is excluded from the reusable identity key.");

const legacy=buildVehicleContext({year:"2022",make:"Volvo",model:"VNR64T300",engine:"D13"});
assert.equal(legacy.identity.engineModel,"D13");
assert.equal(legacy.identity.engineManufacturer,"");
assert.equal(legacy.identityStatus,"incomplete");
assert.ok(legacy.missing.includes("engineManufacturer"));
assert.ok(legacy.warnings.some(x=>/engine manufacturer/i.test(x)));

const unknown=buildVehicleContext({year:"2020",make:"Unknown OEM",model:"Model X",engineMake:"Unknown",engine:"X99"});
assert.equal(unknown.platformId,"unmapped");
assert.equal(unknown.identityStatus,"unmapped");
assert.equal(unknown.applicabilityStatus,"unverified");

const aliases=normalizeVehicleIdentity({modelYear:"2024",manufacturer:"Mack",chassis:"GR64F",engineManufacturer:"Mack",engineModel:"MP8",transmissionManufacturer:"Mack",transmission:"mDRIVE",emissionsFamily:"US21"});
assert.equal(aliases.year,"2024");
assert.equal(aliases.make,"Mack");
assert.equal(aliases.model,"GR64F");
assert.equal(aliases.engineModel,"MP8");
assert.equal(aliases.transmissionModel,"mDRIVE");
assert.equal(aliases.emissionsFamily,"US21");
console.log("Canonical vehicle context tests passed.");

import {suggestEmissions,vinLookupFields} from "../js/vehicle-intake-prefill.js";
assert.match(suggestEmissions("2019","Mack","MP8"),/confirm OBD/);
assert.equal(suggestEmissions("2019","Mack","X15"),"");
assert.equal(suggestEmissions("2024","Volvo","D13"),"");
assert.equal(suggestEmissions("2019","Freightliner","DD15"),"");
assert.deepEqual(vinLookupFields({ModelYear:"2019",Make:"MACK",Model:"AN",VIN:"secret"}),{year:"2019",make:"MACK",model:"AN",engineMake:"",engine:""});

import {classifyComplaint,startingSteps,startingRecommendation} from "../js/wiringhound-complaint-engine.js";
assert.equal(classifyComplaint("no crank/ no start").id,"starting_system");
assert.equal(classifyComplaint("headlamp inoperative").id,"light_inop");
for(const [currentStep,s] of startingSteps.entries())for(const [i,choice] of s.choices.entries()){const d=startingRecommendation({currentStep,entries:{[s.id]:{choice}}});assert.ok(["hold","next","review"].includes(d.state));assert.ok(startingSteps.some(x=>x.id===d.stepId));if(startingSteps.some(x=>x.id===s.targets[i]))assert.equal(d.stepId,s.targets[i]);}
assert.equal(startingRecommendation({currentStep:0,entries:{}}).state,"hold");
