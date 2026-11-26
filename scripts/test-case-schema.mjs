import assert from "node:assert/strict";
import { createCaseRecord } from "../js/case-schema.js";
const raw={id:"case-1",createdAt:"2026-11-16T10:00:00Z",vehicle:{year:"2022",make:"Mack",model:"Anthem",engine:"MP8"},complaint:"Intermittent J1939 dropout",workflowId:"j1939_network",status:"completed",verification:"verified",rootCause:"Chafed CAN harness",repairPerformed:"Harness repaired",entries:{baseline:{choice:"Multiple modules offline",evidence:[{name:"photo.jpg"}]}}};
const wh=createCaseRecord(raw,"wiringhound");
assert.equal(wh.caseEnvelope.schema,"ironknuckle.case");
assert.equal(wh.caseEnvelope.sourceApp,"wiringhound");
assert.equal(wh.caseEnvelope.vehicle.engine,"MP8");
assert.equal(wh.caseEnvelope.vehicleContext.identity.make,"Mack");
assert.equal(wh.caseEnvelope.vehicleContext.identity.engineModel,"MP8");
assert.equal(wh.caseEnvelope.vehicleContext.identityStatus,"incomplete");
assert.equal(wh.caseEnvelope.vehicleContext.applicabilityStatus,"unverified");
assert.equal(wh.caseEnvelope.vehicle.engineModel,"MP8");
assert.equal(wh.caseEnvelope.vehicle.vinLast6,"");
assert.equal(wh.caseEnvelope.vehicle.engineModel,"MP8","Legacy engine field remains available as engineModel.");
assert.equal(wh.caseEnvelope.vehicle.engineManufacturer,"","Unknown engine manufacturer must remain blank.");
assert.equal(wh.caseEnvelope.entryCount,1);
assert.equal(wh.caseEnvelope.evidenceCount,1);
assert.equal(wh.caseEnvelope.reviewState,"candidate_for_review");
assert.equal(wh.entries,raw.entries,"Original workspace payload remains intact");

const expanded=createCaseRecord({...raw,vehicle:{
  year:"2024",make:"Freightliner",model:"Cascadia",vin:"TESTVIN",
  engineMake:"Detroit Diesel",engineModel:"DD15",vinLast6:"A1B2C3",
  transmissionMake:"Detroit",transmissionModel:"DT12",emissionsFamily:"EPA 2024"
}},"diagnostic_command_center");
assert.equal(expanded.caseEnvelope.vehicle.engineManufacturer,"Detroit Diesel");
assert.equal(expanded.caseEnvelope.vehicle.engineModel,"DD15");
assert.equal(expanded.caseEnvelope.vehicle.vinLast6,"A1B2C3");
assert.equal("vin" in expanded.caseEnvelope.vehicle,false,"Full VIN must not be retained in the shared envelope.");
assert.equal(expanded.caseEnvelope.vehicle.transmissionManufacturer,"Detroit");
assert.equal(expanded.caseEnvelope.vehicle.transmissionModel,"DT12");
assert.equal(expanded.caseEnvelope.vehicle.emissionsFamily,"EPA 2024");
assert.equal(expanded.caseEnvelope.vehicleContext.identityStatus,"identified");
assert.equal(expanded.caseEnvelope.vehicleContext.identity.engineManufacturer,"Detroit Diesel");
assert.equal(expanded.caseEnvelope.vehicleContext.identity.vinLast6,"A1B2C3");

const dcc=createCaseRecord({...raw,verification:"unconfirmed"},"diagnostic_command_center");
assert.equal(dcc.caseEnvelope.sourceApp,"diagnostic_command_center");
assert.equal(dcc.caseEnvelope.reviewState,"unreviewed");
assert.throws(()=>createCaseRecord({}, "wiringhound"),/id is required/);
console.log("Shared case schema tests passed.");
