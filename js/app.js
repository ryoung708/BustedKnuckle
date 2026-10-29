// js/app.js
import { faultCodeDatabase } from './database.js';

export class BustedKnuckleEngine {
  constructor(platformKey) {
    this.platform = faultCodeDatabase.engines[platformKey];
    this.selectedCodes = [];
  }

  toggleCode(codeId) {
    const position = this.selectedCodes.indexOf(codeId);
    if (position > -1) {
      this.selectedCodes.splice(position, 1);
    } else {
      this.selectedCodes.push(codeId);
    }
    return this.runTriageAnalysis();
  }

  runTriageAnalysis() {
    if (this.selectedCodes.length === 0) return null;

    let overlappingCircuits = null;
    let consolidatedCauses = [];
    let requiredToolsList = new Set();

    this.selectedCodes.forEach((codeId, index) => {
      const fault = this.platform.fault_codes[codeId];
      if (!fault) return;

      // Extract electrical/mechanical intersection loops
      if (index === 0) {
        overlappingCircuits = [...fault.shared_circuits];
      } else {
        overlappingCircuits = overlappingCircuits.filter(circuit => fault.shared_circuits.includes(circuit));
      }

      // Collect potential suspects and tool assignments
      consolidatedCauses.push(...fault.common_causes);
      fault.required_tools.forEach(toolId => requiredToolsList.add(toolId));
    });

    // Evaluate absolute triage severity priority
    const has5vReferenceShort = this.selectedCodes.some(id => id.includes("3513") || id.includes("3509"));
    const criticalActionPriority = has5vReferenceShort 
      ? "CRITICAL ALERT: 5V Reference Short Grounded Out (Fix Voltage First)" 
      : "STANDARD TRIAGE: Evaluate Mechanical Component Delta Pressures";

    return {
      activeStack: this.selectedCodes,
      sharedCircuits: overlappingCircuits.map(cId => ({ id: cId, ...this.platform.circuit_intersections[cId] })),
      culpritTargets: [...new Set(consolidatedCauses)],
      gearNeeded: Array.from(requiredToolsList).map(tId => faultCodeDatabase.tools[tId]),
      priorityStatus: criticalActionPriority
    };
  }
}
