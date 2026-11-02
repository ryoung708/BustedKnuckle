/* IronKnuckle Chassis Circuit Engine
 * Electrical calculations only. No DOM, SVG, layout, or browser UI dependencies.
 * The visual interface supplies circuit state and asks for readings by test-point ID.
 * Training model: simplified 12V negative-ground rear lighting circuit.
 */
(function (root) {
  "use strict";

  const TEST_POINTS = Object.freeze({
    battery: "Battery positive", negative: "Battery negative",
    mainFuseIn: "Main fuse input", mainFuseOut: "Main fuse output",
    tailFuseIn: "Tail fuse input", tailFuseOut: "Tail fuse output",
    tailSwitchIn: "Tail switch input", tailSwitchOut: "Tail switch output",
    tailSplice: "Tail splice feed", leftTailIn: "Left lamp tail input",
    rightTailIn: "Right lamp tail input", leftBrakeIn: "Left lamp brake input",
    rightBrakeIn: "Right lamp brake input", leftGround: "Left lamp ground output",
    rightGround: "Right lamp ground output", brakeFuseIn: "Brake fuse input",
    brakeFuseOut: "Brake fuse output", brakeSwitchIn: "Brake pedal switch input",
    brakeSwitchOut: "Brake pedal switch output", brakeSplice: "Brake splice feed",
    ground: "Common ground splice"
  });

  const DEFAULT_STATE = Object.freeze({
    tail: false, brake: false, fault: "none",
    mainFuseGood: true, tailFuseGood: true, brakeFuseGood: true,
    nominalVoltage: 12.6
  });

  function createCircuit(initialState) {
    let state = { ...DEFAULT_STATE, ...(initialState || {}) };

    function setState(nextState) {
      state = { ...state, ...(nextState || {}) };
      return getState();
    }
    function getState() { return { ...state }; }

    function voltageAt(point) {
      if (!(point in TEST_POINTS)) return NaN;
      if (["battery", "mainFuseIn", "mainFuseOut", "tailFuseIn", "tailFuseOut",
           "tailSwitchIn", "brakeFuseIn", "brakeFuseOut", "brakeSwitchIn"].includes(point)) {
        return state.nominalVoltage;
      }
      if (point === "negative") return 0;
      if (point === "ground" || point === "leftGround" || point === "rightGround") {
        if (state.fault === "openGround") return state.nominalVoltage;
        if (state.fault === "poorGround" && (state.tail || state.brake)) return 0.8;
        return 0.02;
      }
      const isBrake = point.toLowerCase().includes("brake");
      const active = isBrake ? state.brake : state.tail;
      const open = state.fault === (isBrake ? "openBrake" : "openTail");
      const switchedOutput = isBrake ? "brakeSwitchOut" : "tailSwitchOut";
      const splice = isBrake ? "brakeSplice" : "tailSplice";
      if (point === switchedOutput) return active ? 12.3 : 0;
      if (point === splice || point.endsWith("TailIn") || point.endsWith("BrakeIn")) {
        if (!active || open) return 0;
        return state.fault === "poorGround" ? 11.8 : 12.3;
      }
      return 0;
    }

    // Returns equivalent resistance in the simplified training network.
    // This initial version models a single conducting path; parallel-network
    // nodal analysis is deliberately isolated here as the next accuracy upgrade.
    function resistanceBetween(a, b) {
      if (!(a in TEST_POINTS) || !(b in TEST_POINTS)) return Infinity;
      if (a === b) return 0;
      const edges = [];
      const add = (x, y, ohms, closed = true) => {
        if (closed) { edges.push([x, y, ohms]); edges.push([y, x, ohms]); }
      };
      add("battery", "mainFuseIn", 0.05);
      add("mainFuseIn", "mainFuseOut", 0.02, state.mainFuseGood);
      add("mainFuseOut", "tailFuseIn", 0.05);
      add("mainFuseOut", "brakeFuseIn", 0.05);
      add("tailFuseIn", "tailFuseOut", 0.02, state.tailFuseGood);
      add("tailFuseOut", "tailSwitchIn", 0.02);
      add("tailSwitchIn", "tailSwitchOut", 0.05, state.tail);
      add("tailSwitchOut", "tailSplice", 0.05, state.fault !== "openTail");
      add("tailSplice", "leftTailIn", 0.05);
      add("tailSplice", "rightTailIn", 0.05);
      add("brakeFuseIn", "brakeFuseOut", 0.02, state.brakeFuseGood);
      add("brakeFuseOut", "brakeSwitchIn", 0.02);
      add("brakeSwitchIn", "brakeSwitchOut", 0.05, state.brake);
      add("brakeSwitchOut", "brakeSplice", 0.05, state.fault !== "openBrake");
      add("brakeSplice", "leftBrakeIn", 0.05);
      add("brakeSplice", "rightBrakeIn", 0.05);
      add("leftTailIn", "leftGround", 2.5);
      add("rightTailIn", "rightGround", 2.5);
      add("leftBrakeIn", "leftGround", 2.5);
      add("rightBrakeIn", "rightGround", 2.5);
      const groundR = state.fault === "poorGround" ? 5 : 0.05;
      add("leftGround", "ground", groundR, state.fault !== "openGround");
      add("rightGround", "ground", groundR, state.fault !== "openGround");
      add("ground", "negative", 0.05, state.fault !== "openGround");

      const distances = Object.fromEntries(Object.keys(TEST_POINTS).map(k => [k, Infinity]));
      const visited = new Set();
      distances[a] = 0;
      while (true) {
        let current = null;
        for (const key of Object.keys(distances)) {
          if (!visited.has(key) && (current === null || distances[key] < distances[current])) current = key;
        }
        if (current === null || !Number.isFinite(distances[current]) || current === b) break;
        visited.add(current);
        for (const [from, to, ohms] of edges) {
          if (from === current && distances[to] > distances[current] + ohms) {
            distances[to] = distances[current] + ohms;
          }
        }
      }
      return distances[b];
    }

    function lampIsOn(kind) {
      if (kind !== "tail" && kind !== "brake") return false;
      return Boolean(state[kind]) &&
        state.fault !== (kind === "tail" ? "openTail" : "openBrake") &&
        state.fault !== "poorGround" && state.fault !== "openGround";
    }

    return Object.freeze({ setState, getState, voltageAt, resistanceBetween, lampIsOn });
  }

  root.IronKnuckleCircuitEngine = Object.freeze({ createCircuit, testPoints: TEST_POINTS });
})(typeof window !== "undefined" ? window : globalThis);
