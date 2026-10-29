// ========================================================
// IRONKNUCKLE DIAGNOSTICS // REPAIRED LOGIC ENGINE
// ========================================================
import { faultCodeDatabase, globalFaultLibrary } from './database.js';

export class BustedKnuckleCore {
  constructor(activePlatformId) {
    this.activeStack = [];
    this.setEnginePlatform(activePlatformId);
  }

  setEnginePlatform(platformId) {
    this.platformData = faultCodeDatabase.engines[platformId] || null;
    this.activeStack = [];
  }

  toggleFaultCode(codeIndexKey) {
    if (!globalFaultLibrary[codeIndexKey]) return this.generateTriageMatrix();
    const activeIndex = this.activeStack.indexOf(codeIndexKey);
    if (activeIndex > -1) this.activeStack.splice(activeIndex, 1);
    else this.activeStack.push(codeIndexKey);
    return this.generateTriageMatrix();
  }

  generateTriageMatrix() {
    if (this.activeStack.length === 0 || !this.platformData) return null;

    let systemIntersections = null;
    const targetSuspects = [];
    const requiredGearSet = new Set();
    const validSelections = this.activeStack
      .map(codeKey => ({ key: codeKey, spec: globalFaultLibrary[codeKey] }))
      .filter(item => item.spec);

    validSelections.forEach(({ spec }, idx) => {
      const circuits = Array.isArray(spec.shared_circuits) ? spec.shared_circuits : [];
      if (idx === 0) systemIntersections = [...circuits];
      else systemIntersections = systemIntersections.filter(circuitKey => circuits.includes(circuitKey));
      targetSuspects.push(...(spec.common_causes || []));
      (spec.required_tools || []).forEach(toolKey => requiredGearSet.add(toolKey));
    });

    const matchedCircuits = (systemIntersections || []).map(id => {
      const circuit = this.platformData.circuit_intersections?.[id];
      return circuit ? { id, ...circuit } : null;
    }).filter(Boolean);

    const allocatedTools = Array.from(requiredGearSet)
      .map(tId => faultCodeDatabase.tools?.[tId])
      .filter(Boolean);

    return {
      currentSelection: validSelections.map(item => item.key),
      matchedCircuits,
      inferredCulprits: [...new Set(targetSuspects)],
      diagnosticSteps: validSelections.flatMap(item => item.spec.diagnostic_steps || []),
      allocatedTools,
      priorityCode: validSelections.some(item => String(item.spec.spn) === '3513')
        ? 'PRIORITY: VERIFY 5-VOLT REFERENCE SUPPLY'
        : 'DIAGNOSTIC MATRIX ENGAGED'
    };
  }
}
