import assert from "node:assert/strict";
import obd from "../data/obd2-standard-codes.json" with { type:"json" };
import j1939 from "../data/j1939-spn-reference.json" with { type:"json" };
import oem from "../data/oem-fault-catalog.json" with { type:"json" };
import index from "../data/fault-catalog.json" with { type:"json" };

function unique(values,label){const set=new Set(values);assert.equal(set.size,values.length,label+" contains duplicate keys");}
assert.ok(Array.isArray(obd.records)&&obd.records.length>0,"OBD catalog must contain records");
unique(obd.records.map(r=>r.code),"OBD catalog");
for(const r of obd.records){
  assert.match(r.code,/^P[0-9A-F]{4}$/,"Invalid OBD DTC "+r.code);
  assert.ok(r.description&&r.system,"OBD record missing description/system: "+r.code);
  assert.ok(r.source_url&&r.source_title&&r.source_edition,"OBD record missing provenance: "+r.code);
  assert.ok(r.confidence&&r.license_status&&r.vehicle_scope,"OBD record missing confidence/scope: "+r.code);
}
assert.ok(Array.isArray(j1939.records)&&j1939.records.length>0,"J1939 SPN catalog must contain records");
unique(j1939.records.map(r=>r.spn),"J1939 catalog");
for(const r of j1939.records){
  assert.ok(Number.isInteger(r.spn)&&r.spn>=0&&r.spn<=524287,"Invalid SPN "+r.spn);
  assert.ok(r.description&&r.system,"SPN record missing description/system: "+r.spn);
  assert.ok(r.source_url&&r.source_title&&r.confidence&&r.vehicle_scope,"SPN record missing provenance: "+r.spn);
}
assert.ok(Array.isArray(oem.records),"OEM catalog records must be an array");
for(const r of oem.records){
  assert.ok(r.code&&r.manufacturer&&r.description&&r.controller,"OEM record missing code/manufacturer/controller/description");
  assert.ok(r.source_url||r.source_title,"OEM record missing source");
}
assert.equal(index.files.obd2,"obd2-standard-codes.json");
assert.equal(index.files.j1939,"j1939-spn-reference.json");
assert.equal(index.files.oem,"oem-fault-catalog.json");
console.log("FAULT CATALOG DATA VALIDATION PASSED: "+obd.records.length+" OBD-II records, "+j1939.records.length+" public SPNs, "+oem.records.length+" OEM records.");
