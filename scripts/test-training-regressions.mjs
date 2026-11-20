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

// A genuinely open switch and each failed fuse must read OL across their terminals.
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

// A burnt lamp opens its own element, but the intact opposite lamp remains a
// legitimate parallel path in the installed circuit. Do not force OL in-circuit.
const burntLampWithParallelPath = createCircuit({
  fault: "lampOpen", tail: true, brake: false, powerIsolated: true
});
assert.ok(Number.isFinite(burntLampWithParallelPath.resistanceBetween("leftTailIn", "leftGround")));

// When the failed lamp is isolated from alternate wiring, its open element reads OL.
const isolatedBurntLamp = [
  ["lampFeed", "lampIn", 0.05],
  // The missing lampIn-to-lampOut edge represents the burnt filament.
  ["lampOut", "lampGround", 0.05]
];
assert.equal(solveEquivalentResistance(isolatedBurntLamp, "lampIn", "lampOut"), Infinity);

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
const j1939Script = j1939.split("<script>")[1]?.split("</script>")[0];
assert.ok(j1939Script, "J1939 trainer script is present");
assert.doesNotThrow(() => new Script(j1939Script), "J1939 trainer script parses");
assert.ok(j1939.includes('term.addEventListener("click",toggleTerm)'), "End terminator is clickable");
assert.ok(j1939.includes("add(1,6,120)"), "Engine ECM contains its 120Ω termination");
assert.ok(j1939.includes("add(4,9,120)"), "Far-end terminator participates in the circuit");
assert.ok(j1939.includes("function solveResistance(start,end)"), "Resistance uses a network solver");
assert.ok(j1939.includes("if(!reachable.has(start))return Infinity"), "Open sections read OL when probes are disconnected");
assert.ok(j1939.includes('if(s.key){n=NaN;unit=" Ω"}'), "Ohms mode is inhibited with key power on");
assert.ok(j1939.includes("s.endTermConnected=!s.endTermConnected"), "End termination state toggles");
assert.ok(j1939.includes("moduleInputOhms=10000000"), "Connected modules contribute a 10 MΩ training input path");
assert.ok(j1939.includes("modules.forEach((_,i)=>{if(!s.off.includes(i))"), "Every connected module contributes to resistance");
assert.ok(j1939.includes("data-i"), "Module identity is available to isolation-state renderer");

// The 3D inline-six engine lab must retain its mechanical cycle and fault-training controls.
const engine3d = await readFile(new URL("../engine-3d.html", import.meta.url), "utf8");
assert.ok(engine3d.includes("three.module.js"));
assert.ok(engine3d.includes("const firingOrder=[1,5,3,6,2,4]"));
assert.ok(engine3d.includes("tdc=[0,120,240,240,120,0]"));
for (const fault of ["injector", "compression", "intake", "exhaust"]) {
  assert.ok(engine3d.includes('data-fault="' + fault + '"'), "Missing 3D engine fault scenario: " + fault);
}
assert.ok(engine3d.includes("crankGroup.rotation.x=rad"));
assert.ok(engine3d.includes("camGroup.rotation.x=camRad"));
assert.ok(engine3d.includes("function renderContribution()"), "Cylinder contribution view is present");
assert.ok(engine3d.includes("fault==='intake'"), "A closed intake valve suppresses normal combustion");
const engineScript = engine3d.split('<script type="module">')[1]?.split("</script>")[0];
assert.ok(engineScript, "3D engine module script is present");
const parseableEngineScript = engineScript.replace(/^import .*?;\s*/m, "");
assert.doesNotThrow(() => new Script(parseableEngineScript), "3D engine module script parses after its import is removed");
const homepage = await readFile(new URL("../index.html", import.meta.url), "utf8");
assert.ok(homepage.includes('href="./engine-3d.html"'));

console.log("IronKnuckle circuit and training regression tests passed.");
