import { interpretFaultCode } from "./fault-interpreter.js";

export function classifyFaultGuidanceSystem(fault = {}, manufacturer = "") {
  const code = String(fault.code || "").trim();
  const catalog = interpretFaultCode((manufacturer ? manufacturer + " " : "") + code);
  const description = String(fault.description || catalog.description || "").toLowerCase();
  const text = [code, description, fault.controller || ""].join(" ").toLowerCase();
  if (/low pressure fuel|fuel (?:rail|system|supply).*pressure|pressure.*too low|fuel pressure/.test(text))
    return { system: "fuel_supply", description: catalog.description, confidence: catalog.confidence || "unverified" };
  if (/after.?treatment|def |reductant|nox|dpf|soot|exhaust gas temperature|egt|dos(er|ing)|scr|catalyst/.test(text) || /^p20|^p22|^p24/i.test(code))
    return { system: "aftertreatment", description: catalog.description, confidence: catalog.confidence || "unverified" };
  if (/\b(circuit|open|short|voltage|electrical|sensor)\b/.test(text))
    return { system: "electrical", description: catalog.description, confidence: catalog.confidence || "unverified" };
  if (/boost|turbo|intake|air flow|manifold/.test(text))
    return { system: "air_boost", description: catalog.description, confidence: catalog.confidence || "unverified" };
  return { system: "general", description: catalog.description, confidence: catalog.confidence || "unverified" };
}


// Mack P016F00: evidence-first fuel-pressure progression. This is not an OEM
// pinpoint test; exact engine, calibration, pressure limits and test points must
// be confirmed in the applicable Mack/Volvo service information.
export function getP016F00Guidance(fault = {}, vehicle = {}) {
  const code = String(fault.code || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  const make = String(vehicle.make || "").trim().toLowerCase();
  if (code !== "P016F00" || !make.includes("mack")) return null;
  return {
    title: "Diagnose P016F00 · Closed-loop fuel pressure too low",
    category: "Fuel system · pressure control",
    faultGuidance: true,
    faultSpecific: true,
    caution: "P016F00 is recorded here as 'Closed Loop Fuel Pressure Control At Limit - Pressure Too Low'. This case-derived description is not a complete OEM fault tree. Confirm the exact engine family, serial number, emissions/calibration and current Mack/Volvo procedure. Do not use generic pressure limits or condemn a component from the code alone. Never loosen high-pressure fuel lines while the engine is running or pressurized.",
    steps: [
      {
        id: "p016f_confirm",
        title: "Confirm P016F00 and capture the failure conditions",
        instruction: "Confirm the reporting controller is EMS and the code is currently Active/Confirmed. Save the complete scan and freeze-frame/event data. Record engine family/serial, engine speed, load, temperature and when the code sets. Verify the exact Mack/Volvo procedure for this engine before pressure testing.",
        test: "P016F00 status, EMS event data and exact engine configuration",
        prompt: "Use the scan tool and engine data plate. Do not assume every Mack AN uses the same engine calibration or pressure specifications.",
        choices: ["P016F00 active and failure conditions captured", "Fault inactive / not currently present", "Engine configuration or event data unavailable"]
      },
      {
        id: "p016f_low_side",
        title: "Verify low-side fuel supply pressure",
        instruction: "Test the low-pressure supply at the OEM-specified test point(s) and under the operating condition that sets the fault. Record actual pressure, units, engine speed/load, test location and the exact specification. Evaluate the applicable supply/transfer pump, filters, tank pickup, restriction and air ingress only as directed by the engine-specific procedure. Do not call the low side good from a visual inspection or an idle-only reading if the fault occurs under load.",
        test: "Low-side supply pressure and stability under the fault conditions",
        prompt: "Use the Mack/Volvo procedure for the exact engine and serial number to identify the test port, adapter, operating condition and pressure limits.",
        choices: ["Low-side pressure meets OEM specification under the fault conditions", "Low-side pressure below OEM specification", "Pressure unstable or air / restriction evidence found", "Low-side test incomplete / specification unavailable"]
      },
      {
        id: "p016f_high_side",
        title: "If low side passes, compare commanded vs. actual rail pressure",
        instruction: "Because low-side supply has been verified within specification, move to the high-pressure system. Monitor commanded and actual rail pressure together during the same crank / idle / loaded condition that sets P016F00. Record both values, units, engine speed/load and the applicable OEM limits. Determine whether actual rail pressure follows the commanded target. If actual pressure falls behind, continue with the engine-specific high-pressure generation/control and leakage tests. If the values track but the fault remains, investigate pressure-sensor plausibility, signal integrity and intermittent conditions using the OEM procedure. Never loosen a high-pressure line to check for flow.",
        test: "Commanded vs. actual fuel rail pressure under the fault conditions",
        prompt: "Use the scan tool's rail-pressure target and actual-pressure parameters, plus the correct Mack/Volvo service procedure for test conditions and limits.",
        choices: ["Actual rail pressure falls below commanded / cannot track target", "Actual rail pressure tracks commanded within OEM specification", "Rail-pressure data is implausible or sensor / circuit concern exists", "High-side test incomplete / specification unavailable"]
      },
      {
        id: "p016f_high_side_isolate",
        title: "Isolate the high-pressure control or delivery fault",
        instruction: "Use the exact engine-specific pinpoint test to distinguish high-pressure pump output, metering/pressure-control components, rail pressure control and injector return/leakage. Check only components and test ports identified by the OEM procedure. Record each commanded state, measured response and specification. If rail-pressure sensor data is implausible, verify its supply, ground and signal with the correct wiring diagram and test method before considering the sensor.",
        test: "OEM high-pressure pump / control / leakage pinpoint tests",
        prompt: "Follow the correct engine-family and serial-number-specific diagnostic tree. Do not substitute generic pinouts, resistance values or pressure thresholds.",
        choices: ["A specific high-pressure control / delivery fault is isolated", "Sensor signal or circuit fault is isolated", "No abnormality found during the prescribed tests", "OEM pinpoint test or specification unavailable"]
      },
      {
        id: "p016f_verify",
        title: "Confirm the cause and verify fuel-pressure control",
        instruction: "Document the confirmed failure with measurements and the applicable specification, repair only the supported cause, then repeat the original operating conditions. Compare commanded and actual rail pressure, rescan EMS and confirm whether P016F00 returns. Keep the outcome unconfirmed if the original failure conditions were not reproduced.",
        test: "Before / after fuel-pressure data and repeat scan",
        prompt: "Repeat the same conditions captured in the first step and preserve the before-and-after scan reports.",
        choices: ["Cause and repair verified under original conditions", "Repair complete; verification pending", "Cause remains unconfirmed"],
        terminal: true
      }
    ]
  };
}
