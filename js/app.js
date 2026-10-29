// ========================================================
// IRONKNUCKLE DIAGNOSTICS // MASTER LOGIC ENGINE (js/app.js)
// ========================================================
import { faultCodeDatabase, globalFaultLibrary } from './database.js';

export class BustedKnuckleCore {
  /**
   * Initializes the core tracking engine for the bay dashboard.
   * @param {string} activePlatformId - The unique ID matching the selected engine family.
   */
  constructor(activePlatformId) {
    this.setEnginePlatform(activePlatformId);
  }

  /**
   * Switches the active data targeting focus when selectors shift.
   * @param {string} platformId - Target ID key from database lookup maps.
   */
  setEnginePlatform(platformId) {
    this.platformData = faultCodeDatabase.engines[platformId];
    this.activeStack = []; // Resets checked fault stacking arrays
  }

  /**
   * Adds or removes a code from the stacking query vector matrix.
   * @param {string} codeIndexKey - The raw array access identifier key.
   * @returns {Object|null} Completed mathematical triage breakdown data matrix.
   */
  toggleFaultCode(codeIndexKey) {
    const activeIndex = this.activeStack.indexOf(codeIndexKey);
    if (activeIndex > -1) {
      this.activeStack.splice(activeIndex, 1); // Remove if unchecked
    } else {
      this.activeStack.push(codeIndexKey); // Add if checked
    }
    return this.generateTriageMatrix();
  }

  /**
   * Iterates through checking sequences to locate shared wires or grounds.
   * @returns {Object|null} Real-time cross-circuit tracking analysis.
   */
  generateTriageMatrix() {
    if (this.activeStack.length === 0) return null;

    let systemIntersections = null;
    let targetSuspects = [];
    let requiredGearSet = new Set();

    this.activeStack.forEach((codeKey, idx) => {
      // TARGET POOL LOOKUP: Pulls data directly out of the shared global registry list
      const faultSpec = globalFaultLibrary[codeKey];
      if (!faultSpec) return;

      if (idx === 0) {
        systemIntersections = [...faultSpec.shared_circuits];
      } else {
        systemIntersections = systemIntersections.filter(circuitKey => 
          faultSpec.shared_circuits.includes(circuitKey)
        );
      }

      targetSuspects.push(...faultSpec.common_causes);
      faultSpec.required_tools.forEach(toolKey => requiredGearSet.add(toolKey));
    });

    // SEVERITY EVALUATOR: Escalate flags if reference voltages drop out completely
    const isVoltageFaultPresent = this.activeStack.some(key => 
      key.includes("3513") || key.includes("3515")
    );
    
    const structuralPriority = isVoltageFaultPresent 
      ? "CRITICAL BUS DISRUPTION // RESOLVE 5V REF VOLTAGE SUPPLY FIRST" 
      : "MECHANICAL FAULT TRACK // MONITOR FLOW AND TARGET FEED VALUES";

    return {
      currentSelection: this.activeStack,
      matchedCircuits: systemIntersections.map(id => ({ 
        id, 
        ...this.platformData.circuit_intersections[id] 
      })),
      inferredCulprits: [...new Set(targetSuspects)],
      allocatedTools: Array.from(requiredGearSet).map(tId => faultCodeDatabase.tools[tId]),
      priorityCode: structuralPriority
    };
  }
}
