/* IronKnuckle four-stroke valve timing.
 * Angles are measured from firing TDC over one 720-degree cycle.
 * This is a generic teaching model; production engines may use valve overlap.
 */
(function (root) {
  "use strict";

  function getValveState(crankDegrees) {
    const degrees = Number(crankDegrees);
    if (!Number.isFinite(degrees)) {
      throw new TypeError("Crank angle must be a finite number.");
    }
    const angle = ((degrees % 720) + 720) % 720;
    const phase = angle < 180 ? "power"
      : angle < 360 ? "exhaust"
      : angle < 540 ? "intake"
      : "compression";

    return Object.freeze({
      angle,
      phase,
      intakeOpen: phase === "intake",
      exhaustOpen: phase === "exhaust"
    });
  }

  root.IronKnuckleEngineCycle = Object.freeze({ getValveState });
})(typeof window !== "undefined" ? window : globalThis);
