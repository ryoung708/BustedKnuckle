import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { Script } from "node:vm";
import "../circuit-engine.js";
import "../js/engine-cycle.js";

const { createCircuit, solveEquivalentResistance } = globalThis.IronKnuckleCircuitEngine;
assert.equal(typeof createCircuit, "function");

const { getValveState } = globalThis.IronKnuckleEngineCycle;
for (const [angle, phase, intakeOpen, exhaustOpen] of [
  [0, "power", false, false],
  [179.999, "power", false, false],
  [180, "exhaust", false, true],
  [359.999, "exhaust", false, true],
  [360, "intake", true, false],
  [539.999, "intake", true, false],
  [540, "compression", false, false],
  [719.999, "compression", false, false],
  [720, "power", false, false],
  [-360, "intake", true, false]
]) {
  const state = getValveState(angle);
  assert.equal(state.phase, phase, `Unexpected phase at ${angle}°`);
  assert.equal(state.intakeOpen, intakeOpen, `Unexpected intake valve state at ${angle}°`);
  assert.equal(state.exhaustOpen, exhaustOpen, `Unexpected exhaust valve state at ${angle}°`);
}
assert.throws(() => getValveState(Number.NaN), /finite number/);

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

// A burnt lamp opens only its own load element. The other tail lamp remains
// connected in parallel, so the network can still show a finite alternate path.
const burntLampWithParallelPath = createCircuit({
  fault: "lampOpen", tail: true, brake: false, powerIsolated: true
});
assert.ok(Number.isFinite(burntLampWithParallelPath.resistanceBetween("leftTailIn", "leftGround")));
assert.equal(solveEquivalentResistance([], "lampFeed", "lampGround"), Infinity);

// The shared solver must calculate true parallel equivalent resistance: 6Ω || 3Ω = 2Ω.
assert.ok(Math.abs(solveEquivalentResistance([
  ["source", "return", 6],
  ["source", "return", 3]
], "source", "return") - 2) < 1e-9);

// A disconnected network must remain open, not return a guessed resistance.
assert.equal(solveEquivalentResistance([], "source", "return"), Infinity);
assert.equal(solveEquivalentResistance([], "source", "source"), 0);

// Verify the Chassis Lab's remaining physical/schematic controls and all
// literal DOM lookups. The challenge and J1939 experiences live on their
// dedicated pages; their obsolete hidden panels/tabs must not return.
const chassis = await readFile(new URL("../chassis-lab.html", import.meta.url), "utf8");
const chassisIds = new Set([...chassis.matchAll(/\bid=["']([^"']+)["']/g)].map(match => match[1]));
const chassisRefs = new Set([...chassis.matchAll(/\$\(["']([^"']+)["']\)/g)].map(match => match[1]));
const missingChassis = [...chassisRefs].filter(id => !chassisIds.has(id));
assert.deepEqual(missingChassis, [], "Chassis Lab references missing element IDs: " + missingChassis.join(", "));
for (const id of ["physicalTab", "schematicTab", "physicalSvg", "schematicStage", "resetBtn"]) {
  assert.ok(chassisIds.has(id), "Expected Chassis Lab control #" + id);
}
assert.match(chassis, /href=["']\.\/diagnostic-challenge\.html["']/);
assert.match(chassis, /href=["']\.\/j1939-trainer\.html["']/);
assert.doesNotMatch(chassis, /challengeTab|j1939Tab|challengePanel|j1939Panel/);

// Verify Build-a-Fault's actual power-off guard, OL formatting and DOM references.
const challenge = await readFile(new URL("../diagnostic-challenge.html", import.meta.url), "utf8");
assert.match(challenge, /if\(!\$\("powerOff"\)\.checked\)/);
assert.match(challenge, /Number\.isFinite\(value\).*:"OL"/);
const challengeIds = new Set([...challenge.matchAll(/\bid=["']([^"']+)["']/g)].map(match => match[1]));
const challengeRefs = new Set([...challenge.matchAll(/\$\(["']([^"']+)["']\)/g)].map(match => match[1]));
const missingChallenge = [...challengeRefs].filter(id => !challengeIds.has(id));
assert.deepEqual(missingChallenge, [], "Build-a-Fault references missing element IDs: " + missingChallenge.join(", "));

// The Learning Center must load and use the exact tested four-stroke helper.
const learning = await readFile(new URL("../learning.html", import.meta.url), "utf8");
assert.match(learning, /<script src=["']\.\/js\/engine-cycle\.js["']><\/script>/);
assert.match(learning, /window\.IronKnuckleEngineCycle\.getValveState\(cycleDegrees\)/);


 // J1939 trainer: both terminators must be independently isolatable and
 // resistance must be solved from the actual connected network, not presets.
 const j1939 = await readFile(new URL("../j1939-trainer.html", import.meta.url), "utf8");
 const j1939Script = j1939.match(/<script>([\\s\\S]*?)<\\/script>/);
 assert.ok(j1939Script, "J1939 trainer script is present");
 assert.doesNotThrow(() => new Script(j1939Script[1]), "J1939 trainer script parses");
 assert.match(j1939, /term\\.addEventListener\\("click",toggleTerm\\)/, "End terminator is clickable");
 assert.match(j1939, /add\\(1,6,120\\)/, "Engine ECM contains its 120Ω termination");
 assert.match(j1939, /add\\(4,9,120\\)/, "Far-end terminator participates in the circuit");
 assert.match(j1939, /function solveResistance\\(start,end\\)/, "Resistance uses a network solver");
 assert.match(j1939, /if\\(!reachable\\.has\\(start\\)\\)return Infinity/, "Open sections read OL when probes are disconnected");
 assert.match(j1939, /if\\(s\\.key\\)\\{n=NaN;unit=" Ω"\\}/, "Ohms mode is inhibited with key power on");
 assert.match(j1939, /s\\.endTermConnected=!s\\.endTermConnected/, "End termination state toggles");

console.log("IronKnuckle circuit and training regression tests passed.");
