import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import "../circuit-engine.js";

const { createCircuit, solveEquivalentResistance } = globalThis.IronKnuckleCircuitEngine;
assert.equal(typeof createCircuit, "function");

// Meter safety: resistance mode must not return a reading while power is present.
const powered = createCircuit({ tail: true, powerIsolated: false });
assert.ok(Number.isNaN(powered.resistanceBetween("battery", "negative")));

// A healthy powered-off branch has a finite equivalent resistance.
const isolated = createCircuit({ tail: true, powerIsolated: true });
assert.ok(Number.isFinite(isolated.resistanceBetween("tailSwitchIn", "tailSwitchOut")));

// A genuinely open switch and each failed fuse must read OL across its terminals.
const openSwitch = createCircuit({ tail: false, powerIsolated: true });
assert.equal(openSwitch.resistanceBetween("tailSwitchIn", "tailSwitchOut"), Infinity);

for (const [input, output, state] of [
  ["mainFuseIn", "mainFuseOut", { mainFuseGood: false }],
  ["tailFuseIn", "tailFuseOut", { tailFuseGood: false }],
  ["brakeFuseIn", "brakeFuseOut", { brakeFuseGood: false }]
]) {
  const circuit = createCircuit({ ...state, powerIsolated: true });
  assert.equal(circuit.resistanceBetween(input, output), Infinity, `Expected OL across ${input}/${output}`);
}

// With the other circuits inactive, a burnt lamp is a genuine open branch.
const burntLampIsolated = createCircuit({
  fault: "lampOpen", tail: false, brake: false, powerIsolated: true
});
assert.equal(burntLampIsolated.resistanceBetween("leftTailIn", "leftGround"), Infinity);

// With the brake circuit active, its shared ground creates a legitimate alternate
// path around the burnt tail lamp. The meter must report finite equivalent resistance.
const burntLampWithParallelPath = createCircuit({
  fault: "lampOpen", tail: true, brake: true, powerIsolated: true
});
assert.ok(Number.isFinite(burntLampWithParallelPath.resistanceBetween("leftTailIn", "leftGround")));

// The shared solver must calculate true parallel equivalent resistance: 6Ω || 3Ω = 2Ω.
assert.ok(Math.abs(solveEquivalentResistance([
  ["source", "return", 6],
  ["source", "return", 3]
], "source", "return") - 2) < 1e-9);

// A disconnected network must remain open, not return a guessed resistance.
assert.equal(solveEquivalentResistance([], "source", "return"), Infinity);
assert.equal(solveEquivalentResistance([], "source", "source"), 0);

// Guard the actual challenge UI's power-off interlock and OL display behavior.
const chassis = await readFile(new URL("../chassis-lab.html", import.meta.url), "utf8");
assert.match(chassis, /challengePowerOff/);
assert.match(chassis, /if\(!\$\("challengePowerOff"\)\.checked\)/);
assert.match(chassis, /Number\.isFinite\(ohms\).*:"OL"/);

// Every statically referenced getElementById helper target must exist in the page.
// This catches null onclick/onchange assignments when a tab/control is removed.
const ids = new Set([...chassis.matchAll(/\bid=["']([^"']+)["']/g)].map(match => match[1]));
const references = new Set([...chassis.matchAll(/\$\(["']([^"']+)["']\)/g)].map(match => match[1]));
const missing = [...references].filter(id => !ids.has(id));
assert.deepEqual(missing, [], `Chassis Lab references missing element IDs: ${missing.join(", ")}`);
for (const id of ["physicalTab", "schematicTab", "challengeTab", "j1939Tab", "startChallenge", "submitDiagnosis"]) {
  assert.ok(ids.has(id), `Expected existing Chassis Lab control #${id}`);
}

// The Learning Center must load and use the exact tested four-stroke helper.
const learning = await readFile(new URL("../learning.html", import.meta.url), "utf8");
assert.match(learning, /<script src=["']\.\/js\/engine-cycle\.js["']><\/script>/);
assert.match(learning, /window\.IronKnuckleEngineCycle\.getValveState\(cycleDegrees\)/);

console.log("IronKnuckle circuit and training regression tests passed.");
