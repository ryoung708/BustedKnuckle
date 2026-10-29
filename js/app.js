// ========================================================
// IRONKNUCKLE DIAGNOSTICS // JS/APP.JS SECTION 1 OF 2      
// BUSINESS LOGIC CONSTRUCTOR & DATA INITIALIZATION        
// ========================================================
import { faultCodeDatabase } from './database.js';

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
  // ========================================================
// IRONKNUCKLE DIAGNOSTICS // JS/APP.JS SECTION 2 OF 2      
// REAL-TIME CODE STACKING LOOP & OVERLAP CALCULATION       
// ========================================================
  generateTriageMatrix() {
    // Escape early if no target buttons remain checked
    if (this.activeStack.length === 0) return null;

    let systemIntersections = null;
    let targetSuspects = [];
    let requiredGearSet = new Set();

    // Iterate through checking sequences
    this.activeStack.forEach((codeKey, idx) => {
      const faultSpec = this.platformData.fault_codes[codeKey];
      if (!faultSpec) return;

      // MATH OPERATION: Pinpoint overlapping wire loops or mechanic junctions
      if (idx === 0) {
        systemIntersections = [...faultSpec.shared_circuits];
      } else {
        systemIntersections = systemIntersections.filter(circuitKey => 
          faultSpec.shared_circuits.includes(circuitKey)
        );
      }

      // Collect pattern causes and match toolbox manifest gear
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
} // Ends the BustedKnuckleCore Master Class Framework

