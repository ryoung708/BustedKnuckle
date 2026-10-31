import assert from "node:assert/strict";
import { solveDcNetwork, measureVoltage, measureEquivalentResistance } from "../js/electrical-network.js";

// Series circuit: 12 V source, 2 Ω conductor, 4 Ω load, 0 V return.
const series = solveDcNetwork({
  nodes: ["positive", "loadIn", "ground"],
  fixedVoltages: { positive: 12, ground: 0 },
  resistors: [
    { id: "feed", from: "positive", to: "loadIn", ohms: 2 },
    { id: "load", from: "loadIn", to: "ground", ohms: 4 }
  ]
});
assert.ok(Math.abs(series.voltages.loadIn - 8) < 1e-9);
assert.ok(Math.abs(series.branches.find(x => x.id === "feed").current - 2) < 1e-9);
assert.ok(Math.abs(measureVoltage(series, "positive", "loadIn") - 4) < 1e-9);
assert.ok(Math.abs(measureVoltage(series, "loadIn", "positive") + 4) < 1e-9);

// Parallel branches: 6 Ω || 3 Ω = 2 Ω equivalent.
const parallel = [
  { from: "source", to: "return", ohms: 6 },
  { from: "source", to: "return", ohms: 3 }
];
assert.ok(Math.abs(measureEquivalentResistance({
  nodes: ["source", "return"], resistors: parallel,
  redNode: "source", blackNode: "return"
}) - 2) < 1e-9);

// A wire resistance causes a measurable loaded voltage drop.
const loaded = solveDcNetwork({
  nodes: ["battery", "afterWire", "ground"],
  fixedVoltages: { battery: 24, ground: 0 },
  resistors: [
    { from: "battery", to: "afterWire", ohms: 0.2 },
    { from: "afterWire", to: "ground", ohms: 5.8 }
  ]
});
assert.ok(Math.abs(loaded.voltages.afterWire - 23.2) < 1e-9);
assert.ok(Math.abs(loaded.branches[0].current - 4) < 1e-9);

// Same-point resistance is exactly zero.
assert.equal(measureEquivalentResistance({
  nodes: ["a", "b"], resistors: [{ from: "a", to: "b", ohms: 1 }],
  redNode: "a", blackNode: "a"
}), 0);

// Open paths are represented by omitting the branch and must not silently
// produce a plausible reading for a floating node.
assert.throws(() => solveDcNetwork({
  nodes: ["source", "isolated", "ground"],
  fixedVoltages: { source: 12, ground: 0 },
  resistors: [{ from: "source", to: "ground", ohms: 1 }]
}), /floating or unsolved node/);

assert.throws(() => solveDcNetwork({
  nodes: ["a", "b"], fixedVoltages: { a: 0 },
  resistors: [{ from: "a", to: "b", ohms: 0 }]
}), /positive finite resistance/);

console.log("Electrical network engine tests passed.");
