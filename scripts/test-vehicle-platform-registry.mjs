import assert from "node:assert/strict";
import {engineFamilies,platformRegistry,resolveVehiclePlatform,specificationDisplayDecision} from "../js/vehicle-platform-registry.js";

assert.ok(platformRegistry.some(item=>item.id==="freightliner-western-star"));
assert.ok(platformRegistry.some(item=>item.id==="kenworth-peterbilt"));
assert.ok(engineFamilies.some(item=>item.id==="detroit-dd15"));
assert.ok(engineFamilies.some(item=>item.id==="cummins-x15"));

const detroit=resolveVehiclePlatform({
  year:"2024",make:"Freightliner",model:"Cascadia",engineMake:"Detroit Diesel",engineModel:"DD15",
  vin:"TESTVIN",transmissionMake:"Detroit",transmissionModel:"DT12",emissionsFamily:"EPA 2024"
});
assert.equal(detroit.platformId,"freightliner-western-star");
assert.equal(detroit.engine.familyId,"detroit-dd15");
assert.equal(detroit.completeness.vin,true);
assert.equal(detroit.warnings.length,0);

const paccar=resolveVehiclePlatform({year:"2023",make:"Peterbilt",model:"579",engineMake:"PACCAR",engineModel:"MX-13"});
assert.equal(paccar.platformId,"kenworth-peterbilt");
assert.equal(paccar.engine.familyId,"paccar-mx13");

const cumminsInFreightliner=resolveVehiclePlatform({make:"Freightliner",model:"Cascadia",engineMake:"Cummins",engineModel:"X15"});
assert.equal(cumminsInFreightliner.engine.familyId,"cummins-x15","Engine identity must be independent of truck make.");

const unknown=resolveVehiclePlatform({make:"UnknownCo",model:"Test",engine:"Mystery"});
assert.equal(unknown.platformId,"unmapped");
assert.ok(unknown.warnings.some(item=>item.includes("Engine manufacturer")));

const unlicensed=specificationDisplayDecision({
  sourceState:"licensed",permissionConfirmed:false,sourceName:"Example OEM source",sourceRevision:"Rev A",
  platformId:"freightliner-western-star",engineFamilyId:"detroit-dd15"
});
assert.equal(unlicensed.mayDisplayValue,false);
assert.equal(unlicensed.status,"verification-required");

const licensed=specificationDisplayDecision({
  sourceState:"licensed",permissionConfirmed:true,sourceName:"Authorized OEM source",sourceRevision:"Rev B",
  platformId:"freightliner-western-star",engineFamilyId:"detroit-dd15"
});
assert.equal(licensed.mayDisplayValue,true);
assert.equal(licensed.status,"approved-for-display");

const linkOut=specificationDisplayDecision({sourceState:"link-out-only"});
assert.equal(linkOut.mayDisplayValue,false);
assert.equal(linkOut.status,"link-out-only");

const unreviewedIndependent=specificationDisplayDecision({
  sourceState:"independently-verified",sourceName:"Public standard",revisionDate:"2026-01-01",
  platformId:"international",vehicleApplicability:"A26",legalReviewApproved:false
});
assert.equal(unreviewedIndependent.mayDisplayValue,false);

console.log("Multi-OEM vehicle registry and specification permission tests passed.");
