// ========================================================
// IRONKNUCKLE DIAGNOSTICS // MASTER LOGIC ENGINE (js/app.js)
// ========================================================
import { faultCodeDatabase, globalFaultLibrary } from './database.js';

export class BustedKnuckleCore {
  constructor(activePlatformId) {
    this.setEnginePlatform(activePlatformId);
  }

  setEnginePlatform(platformId) {
    this.platformData = faultCodeDatabase.engines[platformId];
    this.activeStack = []; 
  }

  toggleFaultCode(codeIndexKey) {
    const activeIndex = this.activeStack.indexOf(codeIndexKey);
    if (activeIndex > -1) {
      this.activeStack.splice(activeIndex, 1); 
    } else {
      this.activeStack.push(codeIndexKey); 
    }
    return this.generateTriageMatrix();
  }

  generateTriageMatrix() {
    if (this.activeStack.length === 0) return null;

    let systemIntersections = null;
    let targetSuspects = [];
    let requiredGearSet = new Set();

    this.activeStack.forEach((codeKey, idx) => {
      // TARGET POOL UPDATE: Look up specs directly inside our new global registry list!
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
