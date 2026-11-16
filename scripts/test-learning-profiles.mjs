import assert from "node:assert/strict";
import { learningProfiles, getLearningProfile } from "../js/learning-profiles.js";

assert.ok(learningProfiles.length >= 7);
for (const profile of learningProfiles) {
  assert.ok(profile.id && profile.system && profile.make && profile.model && profile.year);
  assert.ok(profile.status && profile.accuracy && profile.scope && profile.limitations);
  assert.match(profile.limitations, /vary|not|must|do not|no /i);
}
const mdrive = getLearningProfile("mack-mdrive-hd-13-2022");
assert.equal(mdrive.make, "Mack");
assert.equal(mdrive.model, "mDRIVE HD");
assert.match(mdrive.accuracy, /blockout/i);
assert.match(mdrive.limitations, /Do not use/i);
const fuller = getLearningProfile("eaton-fuller-18-2022");
assert.equal(fuller.make, "Eaton");
assert.match(fuller.limitations, /generic interactive AMT/i);
assert.equal(getLearningProfile("missing"), null);
console.log("Model-specific learning profile tests passed.");
