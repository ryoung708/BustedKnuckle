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
// The old profile picker was intentionally removed from the Learning Center.
assert.doesNotMatch(page,/learningProfileSelect|learningProfileStatus|learning-profiles\.js/);
assert.doesNotMatch(page,/mdrive-ato2612f-12\.html|mdrive3dLaunch/i);
// The AMT trainer is presented as one direct launch card, not an embedded iframe.
assert.match(page,/id="amt3dLaunch"/);
assert.match(page,/href="\.\/amt-transmission\.html"/);
assert.match(page,/trainer-launch/);
assert.doesNotMatch(page,/amt-trainer-embed|iframe src="\.\/amt-transmission\.html"/);
assert.match(page,/manual-10-speed\.html/);
console.log("Learning Center profile cleanup and AMT launch-card tests passed.");
