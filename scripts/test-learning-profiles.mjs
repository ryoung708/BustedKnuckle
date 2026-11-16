import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { learningProfiles, getLearningProfile } from "../js/learning-profiles.js";
const page=await readFile(new URL("../learning.html",import.meta.url),"utf8");
assert.ok(learningProfiles.length>=8);
for(const p of learningProfiles){
 for(const field of ["id","system","make","model","year","variant","status","accuracy","scope","limitations"])assert.ok(p[field],p.id+" missing "+field);
}
assert.equal(getLearningProfile("mack-mdrive-hd-ato2612f-12").model,"mDRIVE HD ATO2612F");
assert.match(getLearningProfile("mack-mdrive-hd-ato2612f-12").accuracy,/visual blockout/i);
assert.match(getLearningProfile("mack-mdrive-hd-ato2612f-12").variant,/12-speed HD/);
assert.match(getLearningProfile("mack-mdrive-hd-ato2612f-12").variant,/60150840/);
assert.match(getLearningProfile("eaton-fuller-18-2022").limitations,/generic interactive AMT/i);
assert.equal(getLearningProfile("generic-differential").system,"differential");
assert.match(page,/id="learningProfileSelect"/);
assert.match(page,/id="learningProfileStatus"/);
assert.match(page,/learning-profiles\.js/);
assert.match(page,/mdrive-ato2612f-12\.html/);
assert.match(page,/transmission\.html/);
console.log("Model-specific learning profile tests passed.");
