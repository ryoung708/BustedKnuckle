import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { learningProfiles, getLearningProfile } from "../js/learning-profiles.js";
const page=await readFile(new URL("../learning.html",import.meta.url),"utf8");
assert.ok(learningProfiles.length>=8);
for(const p of learningProfiles){
 for(const field of ["id","system","make","model","year","variant","status","accuracy","scope","limitations"])assert.ok(p[field],p.id+" missing "+field);
}
assert.equal(getLearningProfile("generic-amt-system").system,"transmission");
assert.match(getLearningProfile("generic-amt-system").accuracy,/independent conceptual training model/i);
assert.match(getLearningProfile("generic-amt-system").limitations,/vehicle-specific information/i);
assert.match(getLearningProfile("eaton-fuller-18-2022").limitations,/generic interactive AMT/i);
assert.equal(getLearningProfile("generic-differential").system,"differential");
assert.match(page,/id="learningProfileSelect"/);
assert.match(page,/id="learningProfileStatus"/);
assert.match(page,/learning-profiles\.js/);
assert.doesNotMatch(page,/mdrive-ato2612f-12\.html|mdrive3dLaunch/i);
assert.match(page,/transmission\.html/);
console.log("Model-specific learning profile tests passed.");
