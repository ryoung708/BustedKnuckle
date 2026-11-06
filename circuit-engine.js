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
      add("tailSplice", "leftTailIn", 0.05, state.fault !== "lampOpen");
      add("tailSplice", "rightTailIn", 0.05);
      add("brakeFuseIn", "brakeFuseOut", 0.02, state.brakeFuseGood);
      add("brakeFuseOut", "brakeSwitchIn", 0.02);
      add("brakeSwitchIn", "brakeSwitchOut", 0.05, state.brake);
      add("brakeSwitchOut", "brakeSplice", 0.05, state.fault !== "openBrake");
      add("brakeSplice", "leftBrakeIn", 0.05);
      add("brakeSplice", "rightBrakeIn", 0.05);
      add("leftTailIn", "leftGround", 2.5, state.fault !== "lampOpen");
      add("rightTailIn", "rightGround", 2.5);
      add("leftBrakeIn", "leftGround", 2.5);
      add("rightBrakeIn", "rightGround", 2.5);
      const groundR = state.fault === "poorGround" ? 5 : 0.05;
      add("leftGround", "ground", groundR, state.fault !== "openGround" && state.fault !== "lampOpen");
      add("rightGround", "ground", groundR, state.fault !== "openGround");
      add("ground", "negative", 0.05, state.fault !== "openGround");

      const connected=new Set([b]),queue=[b];
      while(queue.length){const here=queue.shift();for(const [from,to] of edges){const next=from===here?to:(to===here?from:null);if(next!==null&&!connected.has(next)){connected.add(next);queue.push(next);}}}
      if(!connected.has(a))return Infinity;
      const unknown=[...connected].filter(k=>k!==b),index=new Map(unknown.map((k,i)=>[k,i]));
      const matrix=unknown.map(()=>unknown.map(()=>0)),rhs=unknown.map(k=>k===a?1:0);
      for(const [from,to,ohms] of edges){const g=1/ohms,i=index.get(from),j=index.get(to);if(i!==undefined){matrix[i][i]+=g;if(j!==undefined)matrix[i][j]-=g;}if(j!==undefined){matrix[j][j]+=g;if(i!==undefined)matrix[j][i]-=g;}}
      const n=rhs.length,aug=matrix.map((row,i)=>[...row,rhs[i]]);
      for(let col=0;col<n;col++){let pivot=col;for(let row=col+1;row<n;row++)if(Math.abs(aug[row][col])>Math.abs(aug[pivot][col]))pivot=row;if(Math.abs(aug[pivot][col])<1e-12)return Infinity;[aug[col],aug[pivot]]=[aug[pivot],aug[col]];const d=aug[col][col];for(let j=col;j<=n;j++)aug[col][j]/=d;for(let row=0;row<n;row++){if(row===col)continue;const factor=aug[row][col];for(let j=col;j<=n;j++)aug[row][j]-=factor*aug[col][j];}}
      const resistance=aug[index.get(a)][n];return Number.isFinite(resistance)&&resistance>=0?resistance:Infinity;
    }

    function lampIsOn(kind) {
      if (kind !== "tail" && kind !== "brake") return false;
      return Boolean(state[kind]) && state.mainFuseGood && (kind === "tail" ? state.tailFuseGood : state.brakeFuseGood) &&
        state.fault !== (kind === "tail" ? "openTail" : "openBrake") &&
        state.fault !== "poorGround" && state.fault !== "openGround";
    }

    return Object.freeze({ setState, getState, voltageAt, resistanceBetween, lampIsOn });
  }

  root.IronKnuckleCircuitEngine = Object.freeze({ createCircuit, testPoints: TEST_POINTS });
})(typeof window !== "undefined" ? window : globalThis);