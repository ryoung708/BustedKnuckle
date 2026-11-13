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

  function solveEquivalentResistance(edges, from, to) {
    if (from === to) return 0;
    const branches = edges.map(edge => Array.isArray(edge) ? { from: edge[0], to: edge[1], ohms: edge[2] } : edge)
      .filter(edge => edge && Number.isFinite(edge.ohms) && edge.ohms > 0);
    const connected = new Set([to]), queue = [to];
    while (queue.length) {
      const here = queue.shift();
      for (const edge of branches) {
        const next = edge.from === here ? edge.to : (edge.to === here ? edge.from : null);
        if (next !== null && !connected.has(next)) { connected.add(next); queue.push(next); }
      }
    }
    if (!connected.has(from)) return Infinity;
    const unknown = [...connected].filter(point => point !== to);
    const index = new Map(unknown.map((point, i) => [point, i]));
    const matrix = unknown.map(() => unknown.map(() => 0));
    const rhs = unknown.map(point => point === from ? 1 : 0);
    for (const edge of branches) {
      const conductance = 1 / edge.ohms;
      const i = index.get(edge.from), j = index.get(edge.to);
      if (i !== undefined) { matrix[i][i] += conductance; if (j !== undefined) matrix[i][j] -= conductance; }
      if (j !== undefined) { matrix[j][j] += conductance; if (i !== undefined) matrix[j][i] -= conductance; }
    }
    const n = rhs.length, augmented = matrix.map((row, i) => [...row, rhs[i]]);
    for (let col = 0; col < n; col++) {
      let pivot = col;
      for (let row = col + 1; row < n; row++) if (Math.abs(augmented[row][col]) > Math.abs(augmented[pivot][col])) pivot = row;
      if (Math.abs(augmented[pivot][col]) < 1e-12) return Infinity;
      [augmented[col], augmented[pivot]] = [augmented[pivot], augmented[col]];
      const divisor = augmented[col][col];
      for (let j = col; j <= n; j++) augmented[col][j] /= divisor;
      for (let row = 0; row < n; row++) {
        if (row === col) continue;
        const factor = augmented[row][col];
        for (let j = col; j <= n; j++) augmented[row][j] -= factor * augmented[col][j];
      }
    }
    const resistance = augmented[index.get(from)][n];
    return Number.isFinite(resistance) && resistance >= 0 ? resistance : Infinity;
  }

  const DEFAULT_STATE = Object.freeze({
    tail: false, brake: false, fault: "none",
    mainFuseGood: true, tailFuseGood: true, brakeFuseGood: true,
    nominalVoltage: 12.6, powerIsolated: false
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
      if (point === "battery" || point === "mainFuseIn") return state.nominalVoltage;
      if (point === "mainFuseOut") return state.mainFuseGood ? state.nominalVoltage : 0;
      if (point === "tailFuseIn" || point === "brakeFuseIn") return state.mainFuseGood ? state.nominalVoltage : 0;
      if (point === "tailSwitchIn") return state.mainFuseGood && state.tailFuseGood ? state.nominalVoltage : 0;
      if (point === "brakeSwitchIn") return state.mainFuseGood && state.brakeFuseGood ? state.nominalVoltage : 0;
      if (point === "tailFuseOut") return state.mainFuseGood && state.tailFuseGood ? state.nominalVoltage : 0;
      if (point === "brakeFuseOut") return state.mainFuseGood && state.brakeFuseGood ? state.nominalVoltage : 0;
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
      if (point === switchedOutput) { const fuseGood=state.mainFuseGood&&(isBrake?state.brakeFuseGood:state.tailFuseGood); return active&&fuseGood?12.3:0; }
      if (point === splice || point.endsWith("TailIn") || point.endsWith("BrakeIn")) {
        const fuseGood=state.mainFuseGood&&(isBrake?state.brakeFuseGood:state.tailFuseGood);
        if (!active || open || !fuseGood) return 0;
        return state.fault === "poorGround" ? 11.8 : 12.3;
      }
      return 0;
    }

    // Returns equivalent resistance in the simplified training network.
    // This initial version models a single conducting path; parallel-network
    // nodal analysis is deliberately isolated here as the next accuracy upgrade.
    function resistanceBetween(a, b) {
      if (!state.powerIsolated) return NaN;
      if (!(a in TEST_POINTS) || !(b in TEST_POINTS)) return Infinity;
      if (a === b) return 0;

      // The nodal solver below calculates the equivalent resistance of every
      // connected branch, including legitimate parallel paths. Open contacts,
      // failed fuses and burnt lamps are represented by missing graph edges.

      const edges = [];
      const add = (x, y, ohms, closed = true) => {
        if (closed) edges.push([x, y, ohms]); // one undirected branch; nodal solver accounts for both terminals
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
      add("leftTailIn", "leftGround", 2.5, state.fault !== "lampOpen"); // Burnt lamp: open only the lamp element, not its feed/ground wiring.
      add("rightTailIn", "rightGround", 2.5);
      add("leftBrakeIn", "leftGround", 2.5);
      add("rightBrakeIn", "rightGround", 2.5);
      const groundR = state.fault === "poorGround" ? 5 : 0.05;
      add("leftGround", "ground", groundR, state.fault !== "openGround");
      add("rightGround", "ground", groundR, state.fault !== "openGround");
      add("ground", "negative", 0.05, state.fault !== "openGround");

      return solveEquivalentResistance(edges, a, b);
    }

    function lampIsOn(kind) {
      if (kind !== "tail" && kind !== "brake") return false;
      return Boolean(state[kind]) && state.mainFuseGood && (kind === "tail" ? state.tailFuseGood : state.brakeFuseGood) &&
        state.fault !== (kind === "tail" ? "openTail" : "openBrake") &&
        state.fault !== "poorGround" && state.fault !== "openGround";
    }

    return Object.freeze({ setState, getState, voltageAt, resistanceBetween, lampIsOn });
  }

  root.IronKnuckleCircuitEngine = Object.freeze({ createCircuit, testPoints: TEST_POINTS, solveEquivalentResistance });
})(typeof window !== "undefined" ? window : globalThis);