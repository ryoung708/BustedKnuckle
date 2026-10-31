/**
 * IronKnuckle Electrical Network Engine
 * Educational DC resistive-network solver. Not an OEM test/specification engine.
 *
 * Nodes are electrical connection points. Resistors represent conductors,
 * contacts, loads and fault paths. Open branches are omitted from the network.
 * Fixed-voltage nodes model ideal sources; current injection is supported for
 * equivalent-resistance measurements.
 */

function assertNode(nodes, id) {
  if (!nodes.includes(id)) throw new Error(`Unknown node: ${id}`);
}

function gaussianSolve(matrix, vector) {
  const n = vector.length;
  const a = matrix.map((row, i) => [...row, vector[i]]);
  for (let col = 0; col < n; col += 1) {
    let pivot = col;
    for (let row = col + 1; row < n; row += 1) {
      if (Math.abs(a[row][col]) > Math.abs(a[pivot][col])) pivot = row;
    }
    if (Math.abs(a[pivot][col]) < 1e-12) {
      throw new Error("Circuit has a floating or unsolved node; check for a missing reference or open path.");
    }
    [a[col], a[pivot]] = [a[pivot], a[col]];
    const divisor = a[col][col];
    for (let j = col; j <= n; j += 1) a[col][j] /= divisor;
    for (let row = 0; row < n; row += 1) {
      if (row === col) continue;
      const factor = a[row][col];
      for (let j = col; j <= n; j += 1) a[row][j] -= factor * a[col][j];
    }
  }
  return a.map(row => row[n]);
}

export function solveDcNetwork({ nodes, resistors, fixedVoltages = {}, currentInjections = {} }) {
  if (!Array.isArray(nodes) || nodes.length < 2 || new Set(nodes).size !== nodes.length) {
    throw new Error("Provide at least two unique circuit nodes.");
  }
  const nodeSet = new Set(nodes);
  for (const [id, voltage] of Object.entries(fixedVoltages)) {
    assertNode(nodes, id);
    if (!Number.isFinite(voltage)) throw new Error(`Invalid fixed voltage at ${id}.`);
  }
  for (const [id, amps] of Object.entries(currentInjections)) {
    assertNode(nodes, id);
    if (!Number.isFinite(amps)) throw new Error(`Invalid current injection at ${id}.`);
  }
  const branches = (resistors || []).map((r, index) => {
    if (!nodeSet.has(r.from) || !nodeSet.has(r.to) || r.from === r.to) {
      throw new Error(`Invalid endpoints on resistor branch ${r.id || index}.`);
    }
    if (!(Number.isFinite(r.ohms) && r.ohms > 0)) {
      throw new Error(`Branch ${r.id || index} must have positive finite resistance; omit open branches.`);
    }
    return { id: r.id || `R${index + 1}`, from: r.from, to: r.to, ohms: r.ohms };
  });

  const unknown = nodes.filter(id => !(id in fixedVoltages));
  if (!Object.keys(fixedVoltages).length) throw new Error("At least one fixed-voltage reference node is required.");
  const index = new Map(unknown.map((id, i) => [id, i]));
  const matrix = unknown.map(() => unknown.map(() => 0));
  const rhs = unknown.map(id => currentInjections[id] || 0);

  for (const branch of branches) {
    const g = 1 / branch.ohms;
    const i = index.get(branch.from), j = index.get(branch.to);
    if (i !== undefined) {
      matrix[i][i] += g;
      if (j !== undefined) matrix[i][j] -= g;
      else rhs[i] += g * fixedVoltages[branch.to];
    }
    if (j !== undefined) {
      matrix[j][j] += g;
      if (i !== undefined) matrix[j][i] -= g;
      else rhs[j] += g * fixedVoltages[branch.from];
    }
  }

  const solved = unknown.length ? gaussianSolve(matrix, rhs) : [];
  const voltages = { ...fixedVoltages };
  unknown.forEach((id, i) => { voltages[id] = solved[i]; });
  const branchResults = branches.map(branch => {
    const volts = voltages[branch.from] - voltages[branch.to];
    const amps = volts / branch.ohms;
    return { ...branch, voltageDrop: volts, current: amps, powerWatts: amps * amps * branch.ohms };
  });
  return { voltages, branches: branchResults };
}

export function measureVoltage(result, redNode, blackNode) {
  if (!(redNode in result.voltages) || !(blackNode in result.voltages)) {
    throw new Error("Both meter probe points must be solved circuit nodes.");
  }
  return result.voltages[redNode] - result.voltages[blackNode];
}

export function measureEquivalentResistance({ nodes, resistors, redNode, blackNode }) {
  if (redNode === blackNode) return 0;
  assertNode(nodes, redNode);
  assertNode(nodes, blackNode);
  const result = solveDcNetwork({
    nodes,
    resistors,
    fixedVoltages: { [blackNode]: 0 },
    currentInjections: { [redNode]: 1, [blackNode]: -1 }
  });
  const resistance = result.voltages[redNode];
  if (!(Number.isFinite(resistance) && resistance >= -1e-9)) {
    throw new Error("Equivalent resistance could not be resolved.");
  }
  return Math.max(0, resistance);
}
