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


// Mack P016F00: CBR-aware common-rail fuel pressure guidance.
// The public CBRs below are case-history / repair-information references;
// current PTT Guided Diagnostics and exact vehicle applicability remain authoritative.
export function getP016F00Guidance(fault = {}, caseRecord = {}) {
  const code = String(fault.code || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  const vehicle = caseRecord.vehicle || {};
  const make = String(vehicle.make || "").trim().toLowerCase();
  if (code !== "P016F00" || !make.includes("mack")) return null;

  const allFaults = Object.values(caseRecord.entries || {})
    .flatMap(entry => Array.isArray(entry?.faultCodes) ? entry.faultCodes : []);
  const codes = new Set(allFaults.map(item => String(item.code || "").toUpperCase().replace(/[^A-Z0-9]/g, "")));
  codes.add(code);
  const has = value => codes.has(value);
  const hasEprvPrecursor = has("P009B13");
  const hasK010Combination = has("P008700") && has("P016F00") && has("P228F00");
  const year = Number(vehicle.year || 0);
  const modelText = String(vehicle.model || vehicle.chassis || "").toUpperCase();
  const engineText = [vehicle.engine, vehicle.engineModel, vehicle.engineMake].filter(Boolean).join(" ").toUpperCase();
  const emissions = String(vehicle.emissions || vehicle.emissionsFamily || "").toUpperCase().replace(/\s/g, "");
  const supportedModels = /\b(?:TE|LR|MRU|AN|CHU|CXU|GR|GU|PI)(?:\b|[0-9])|\b(?:ANTHEM|GRANITE|PINNACLE|TERRAPRO)\b/i.test(modelText);
  const supportedEngines = /\b(?:MP7|MP8|11L|13L)\b/i.test(engineText);
  const supportedEmissions = /US17\+OBD(16|18|19)/.test(emissions);
  const k010Candidate = year >= 2018 && supportedModels && supportedEngines && supportedEmissions;
  return {
    title: "Mack P016F00 · Common-rail fuel pressure diagnosis",
    category: "Fuel system · common rail",
    faultGuidance: true,
    faultSpecific: true,
    sourceTitle: "Mack CBR K01029637 / K40914241 · Common Rail Fuel System",
    sourceReference: "K01029637 (2019) · K40914241 (2019; updated PTT guidance noted January 2020)",
    sourceUrl: "https://oemdtc.com/tsb/10153480/",
    applicability: "K01029637: model year 2018 and newer, US17+OBD16 and newer common-rail configurations; confirm exact model, engine and emissions. K40914241: 2018–2020, US17+OBD16/18/19, Mack/Volvo listed models, 11L/13L, MP7/MP8. K94743326 applies only when P009B-13 is also present and its own vehicle/emissions scope is met.",
    caution: "Public Mack CBR references are historical repair information, not a replacement for current PTT Guided Diagnostics. Confirm VIN, engine serial, emissions/calibration and current Tech Tool version. Do not assume the CBR applies to every P016F00 case. Never loosen high-pressure fuel lines while the system is running or pressurized.",
    relatedSources: [
      {title:"K01029637 · damaged secondary fuel-filter lip seal",url:"https://oemdtc.com/tsb/10153480/"},
      {title:"K40914241 · common-rail fuel-system fault family",url:"https://static.nhtsa.gov/odi/tsbs/2019/MC-10170139-9999.pdf"},
      {title:"K94743326 · historical P009B-13 EPRV circuit open",url:"https://static.nhtsa.gov/odi/tsbs/2019/MC-10160190-9999.pdf"},
      {title:"Mack FSB 237-021 rev 2 · EPRV technical repair",url:"https://static.nhtsa.gov/odi/tsbs/2021/MC-10195320-0001.pdf"},
      {title:"Mack S7567 · September 2023 campaign record",url:"https://static.nhtsa.gov/odi/tsbs/2023/MC-10243451-0001.pdf"}
    ],
    steps: [
      {
        id: "p016f_confirm",
        title: "Confirm vehicle applicability, related codes and diagnostic access",
        instruction: "Confirm Mack model, model year, engine family/serial, common-rail configuration and emissions generation from VIN/build data. Save the complete EMS readout and event data. Check for P0087-00, P016F-00, P228F-00 and P009B-13. CBR K40914241 lists the common-rail fault family and directs technicians to current PTT Guided Diagnostics; its published update specifies PTT 2.7.85 or newer. If P009B-13 is active, use the current applicable OEM EPRV procedure first; historical K94743326 is not universal. Do not assume K01029637 applies unless its code combination and emissions/year scope are met.",
        test: "VIN/build applicability, emissions, engine family, full DTC readout and PTT version",
        prompt: "Use vehicle product details in PTT and the current Mack service portal. CBR K01029637 applies to P0087-00 + P016F-00 + P228F-00 combination; K40914241 lists the common-rail fault family.",
        choices: [
          "P009B-13 is also active; diagnose EPRV circuit first",
          "P0087-00, P016F-00 and P228F-00 all present; K01029637 applicability confirmed",
          "P016F-00 present; K01029637 combination not present; vehicle and current PTT applicability confirmed",
          "Vehicle, emissions or engine applicability unknown / outside listed CBR scope",
          "PTT unavailable or below 2.7.85; use alternate OEM service information",
          "Both faults inactive after EPRV repair; original conditions reproduced"
        ]
      },
      {
        id: "p016f_cbr_filter",
        title: "Inspect the CBR fuel-tank vent filter and secondary-filter lip seal",
        instruction: "For the applicable P0087-00 + P016F-00 + P228F-00 combination, follow CBR K01029637: verify the fuel-tank vent filter is present and not clogged; inspect the vent-filter hose connections at the filter housing and fuel tank; remove the secondary fuel filter and inspect its lip seal for damage. Photograph both vent-filter connections, the top of the secondary filter showing the lip seal, and the filter canister date code. Attach the photos and findings to the Mack eService case as directed. A damaged lip seal can allow unfiltered fuel to bypass the filter and enter the high-pressure system. Do not treat a visual pass as proof of correct fuel pressure.",
        test: "Fuel tank vent filter presence/condition and hose connections; secondary fuel-filter lip seal and date code",
        prompt: "Follow the inspection and photo requirements in Mack CBR K01029637. Do not substitute a different filter or assume a seal defect without inspecting the actual part.",
        choices: [
          "Vent filter / connection restriction or damage found",
          "Secondary fuel-filter lip seal damaged",
          "Both CBR inspection areas checked; no defect found",
          "Inspection or required photos / eService documentation incomplete"
        ]
      },
      {
        id: "p016f_low_side",
        title: "Verify low-side fuel supply pressure",
        instruction: "Use current PTT Guided Diagnostics when available. If PTT is unavailable, use an authorized current Mack/Volvo service procedure for the exact engine family and serial number. Test low-pressure supply at the specified test point(s) and under the operating condition that sets the fault. Record actual pressure, units, engine speed/load, test location and exact specification. Evaluate the applicable supply/transfer pump, filters, tank pickup, restriction and air ingress only as directed. Do not call the low side good from a visual inspection or idle-only reading if the fault occurs under load.",
        test: "Low-side supply pressure and stability under the fault conditions",
        prompt: "Use PTT or an authorized current Mack/Volvo service procedure for the exact engine and serial number to identify the test port, adapter, operating condition and pressure limits. If neither is available, do not guess a test point or pressure limit.",
        choices: ["Low-side pressure meets OEM specification under the fault conditions", "Low-side pressure below OEM specification", "Pressure unstable or air / restriction evidence found", "Low-side test incomplete / specification unavailable"]
      },
      {
        id: "p016f_low_side_isolate",
        title: "Isolate the low-side supply abnormality",
        instruction: "The low-side pressure did not meet the applicable OEM specification or was unstable. Use current PTT Guided Diagnostics or an authorized current Mack/Volvo service procedure for the exact engine family and serial number to distinguish supply/transfer-pump output, filter or line restriction, tank pickup/vent restriction and air ingress. Follow the prescribed test order and test points. Change one condition at a time and record commanded state, actual pressure, operating conditions and specification. A pressure result alone does not prove which component failed.",
        test: "Engine-specific low-pressure supply pinpoint tests",
        prompt: "Use PTT or the authorized current Mack/Volvo service procedure for this engine and serial number. Do not use generic pressure limits, pinouts or replacement assumptions.",
        choices: ["Defect confirmed and corrected", "Defect identified; repair pending", "No low-side cause isolated", "Low-side isolation procedure / specification unavailable"]
      },
      {
        id: "p016f_low_side_retest",
        title: "Repeat low-side pressure test after correction",
        instruction: "Repeat the original low-side pressure test using the same OEM-authorized procedure, test point, equipment, operating state and fault conditions. Record actual pressure, units, engine speed/load and the exact engine/serial-specific limit. Compare the result with the original failed reading. Do not move to high-side diagnosis unless low-side supply now passes.",
        test: "Before / after low-side supply pressure under original fault conditions",
        prompt: "Repeat the exact OEM-authorized low-pressure test used before the repair; retain both readings and test conditions.",
        choices: ["Low-side pressure meets OEM specification under the original fault conditions", "Low-side pressure remains below OEM specification", "Pressure remains unstable or air / restriction evidence remains", "Repeat test incomplete / original fault conditions not reproduced"]
      },
      {
        id: "p016f_high_side",
        title: "If low side passes, compare commanded vs. actual rail pressure",
        instruction: "Because low-side supply has been verified within specification, move to the high-pressure system. Use PTT or another scan tool that supports the required engine parameters to monitor commanded and actual rail pressure together during the same crank / idle / loaded condition that sets P016F00. Record both values, units, engine speed/load and applicable OEM limits. Determine whether actual rail pressure follows the commanded target. If actual pressure falls behind, continue with the current engine-specific PTT high-pressure generation/control and leakage tests. If values track but the fault remains, investigate sensor plausibility, signal integrity and intermittent conditions using the OEM procedure. Never loosen a high-pressure line to check for flow.",
        test: "Commanded vs. actual fuel rail pressure under the fault conditions",
        prompt: "Use supported scan-tool live data and the correct Mack/Volvo service procedure for test conditions and limits.",
        choices: ["Actual rail pressure falls below commanded / cannot track target", "Actual rail pressure tracks commanded within OEM specification", "Rail-pressure data is implausible or sensor / circuit concern exists", "High-side test incomplete / specification unavailable"]
      },
      {
        id: "p016f_high_side_isolate",
        title: "Isolate the high-pressure control or delivery fault",
        instruction: "Use the exact engine-specific OEM pinpoint test (PTT or authorized service procedure) to distinguish high-pressure pump output, metering/pressure-control components, rail pressure control and injector return/leakage. Check only components and test ports identified by the OEM procedure. Record each commanded state, measured response and specification. If rail-pressure sensor data is implausible, verify its supply, ground and signal with the correct wiring diagram and test method before considering the sensor.",
        test: "OEM high-pressure pump / control / leakage pinpoint tests",
        prompt: "Follow the correct engine-family and serial-number-specific OEM diagnostic tree. Do not substitute generic pinouts, resistance values or pressure thresholds.",
        choices: ["A specific high-pressure control / delivery fault is isolated", "Sensor signal or circuit fault is isolated", "Specific high-pressure fault repaired", "Sensor circuit repaired", "Repair pending", "No abnormality found during the prescribed tests", "OEM pinpoint test or specification unavailable"]
      },
      {
        id: "p016f_verify",
        title: "Confirm the cause and verify fuel-pressure control",
        instruction: "Document the confirmed failure with measurements and applicable specification, repair only the supported cause, then repeat the original operating conditions. Compare commanded and actual rail pressure, rescan EMS and confirm whether P016F00 returns. Keep the outcome unconfirmed if the original failure conditions were not reproduced.",
        test: "Before / after fuel-pressure data and repeat scan",
        prompt: "Repeat the same conditions captured in the first step and preserve before-and-after scan reports.",
        choices: ["Cause and repair verified under original conditions", "Repair complete; verification pending", "Cause remains unconfirmed"],
        terminal: true
      },
      {id:"p016f_eprv_scope",title:"Confirm EPRV hardware and current OEM repair scope",instruction:"Verify actual build date, engine serial, emissions and installed EPRV hardware in OEM service information. Check whether conversion is already completed. FSB 237-021 revision 2 and S7567 are separate technical and campaign references; check current VIN-specific eligibility. Do not infer repair eligibility from P016F alone.",choices:["Current OEM conversion procedure confirmed applicable; original EPRV fitted","Conversion already completed or current OEM procedure directs different repair","Applicability or hardware not confirmed"],optional:true},
      {id:"p016f_eprv_repair",title:"Complete the authorized EPRV repair",instruction:"Use current authorized OEM service instructions with trained personnel. Confirm depressurization and fuel-system cleanliness. For an approved conversion, document hardware completion and conditional rail-pressure sensor/harness checks before software programming. Do not program the accessory kit before the required hardware work.",choices:["Authorized repair completed; hardware and software requirements satisfied","Repair pending or incomplete","Procedure or eligibility not confirmed"],optional:true},
      {id:"p016f_eprv_alternate",title:"Diagnose the current P009B circuit configuration",instruction:"Use current VIN-specific OEM diagnostics to verify installed hardware, software configuration and the applicable circuit. Investigate connector, harness and electrical faults only with the correct diagram. Do not apply historical EPRV pinouts to a converted or out-of-scope vehicle.",choices:["Authorized repair completed; hardware and software requirements satisfied","Repair pending or incomplete","Procedure or eligibility not confirmed"],optional:true},
      {id:"p016f_eprv_retest",title:"Repeat scan after EPRV repair",instruction:"Save a fresh EMS scan and repeat original fault conditions when safe. Update recorded P009B-13 and P016F-00 statuses from that scan. If P009B remains active/intermittent, continue its current OEM diagnostics before pressure testing.",choices:["P009B inactive after repair; reassess P016F","P009B remains active or intermittent","Retest incomplete or status unknown"],optional:true}

    ],
    caseFlags: {hasEprvPrecursor,hasK010Combination,k010Candidate}
  };
}
