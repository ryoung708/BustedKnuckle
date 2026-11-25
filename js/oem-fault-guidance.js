// Fault-specific OEM diagnostic workflows. Keep applicability explicit and
// never infer a truck variant, pinout or test limit from the fault code alone.
const MACK_UQLS_SOURCE={
 title:"Mack CBR 2107-22 · DEF Level (UQLS) Sensor Troubleshooting Guide",
 url:"https://static.oemdtc.com/NHTSA-PDFs/MC-11028032-0001.pdf",
 reference:"CBR 2107-22 202601 · Published 7 January 2026",
 scope:"Mack US17+OBD16 through US22+OBD2023; excludes AN(4) and PR(4)"
};
export const MACK_UQLS_YELLOW_CODES={
  "P205B64": "Reductant Tank Temperature Sensor, Circuit Range/Performance",
  "P203A13": "Reductant Level Sensor \"A\", Open Circuit",
  "P203C00": "Aftertreatment Reagent Level, Short Circuit Low",
  "P206A13": "Reductant Quality Sensor, Open Circuit",
  "P206C00": "Reductant Quality Sensor, Short Circuit Low",
  "P206B64": "Reductant Quality Sensor, Range/Performance",
  "P205A13": "Reductant Tank Temperature Sensor, Open Circuit",
  "P205C00": "Aftertreatment Reagent Tank Temperature, Short Circuit Low",
  "P204364": "Aftertreatment Reagent Tank Temperature Sensor Stuck, Signal plausibility failure"
};
const codes=Object.keys(MACK_UQLS_YELLOW_CODES);
const steps=[
 {id:"p205b_applicability",title:"Confirm the bulletin applies",instruction:"Before testing, verify this is a Mack in the bulletin's emissions range (US17+OBD16 through US22+OBD2023) and is NOT an AN(4) or PR(4). Confirm at least one listed yellow UQLS fault is Active or Confirmed in the reporting controller. Review the full scan for the other listed yellow codes too. If none is active/confirmed, do not run this procedure. If the truck variant/emissions are unknown or excluded, stop and use its applicable Mack procedure.",choices:["At least one listed yellow UQLS fault active/confirmed and applicability verified","None of the listed yellow UQLS faults active/confirmed — no troubleshooting required","AN(4), PR(4), or emissions applicability unknown — stop"],test:"Vehicle variant, emissions generation and all listed yellow UQLS fault statuses",prompt:"Check VIN/build information and a full DTC readout. Yellow codes: "+codes.join(", ")},
 {id:"p205b_connector",title:"Inspect the UQLS harness connectors",instruction:"At the DEF tank's Urea Quality Level Sensor (UQLS), follow the approved key-off/disconnect procedure and separate the harness connector. Inspect BOTH connector halves and visible harness wiring for pushed-back/bent pins, damaged wires, corrosion, moisture or water intrusion. Photograph anything found. Do not guess pin numbers or perform resistance tests from these fault codes alone.",choices:["No pin, wire, corrosion or moisture damage found","Damage, corrosion or water intrusion found","Unable to inspect / connector not safely accessible"],test:"UQLS connector and harness condition",prompt:"Look closely at terminal faces, seals and the electrical box/connector area."},
 {id:"p205b_quality",title:"Verify DEF quality",instruction:"Take a clean DEF sample and check concentration with Mack refractometer part number 88890105. Compare the reading with Mack's current acceptance specification for this truck. Record the actual reading, units, instrument and applicable spec. Do not guess a concentration limit.",choices:["DEF quality acceptable per Mack specification","Abnormal: DEF quality outside specification / contamination suspected","Test not completed"],test:"DEF concentration",prompt:"Use refractometer part number 88890105 and the current Mack acceptance specification."},
 {id:"p205b_freeze",title:"Check the DEF tank for freezing",instruction:"Verify that the DEF tank is not frozen using the approved service method. Record what you observed. If frozen or suspected frozen, stop this sequence and follow Mack's thawing/service instructions; do not use an open flame or improvised heat.",choices:["Tank is not frozen","Abnormal: frozen DEF or ice suspected","Unable to determine"],test:"DEF tank frozen condition",prompt:"Confirm the fluid can be evaluated and the tank is not ice-bound."},
 {id:"p205b_fill",title:"Verify DEF tank fill level",instruction:"Ensure the DEF tank is adequately filled according to the current Mack procedure for this configuration. Record the displayed/measured level and how it was checked. Do not assume a universal percentage where the current procedure does not specify one.",choices:["Tank adequately filled per Mack procedure","Abnormal: fill level below required amount","Unable to confirm level"],test:"DEF tank fill level",prompt:"Confirm adequate DEF quantity before the repeat test."},
 {id:"p205b_cycle",title:"Run the Mack repeat-fault check",instruction:"After the previous checks are satisfactory: save the original scan report, clear the fault codes, start the engine and run at high idle for 2 minutes at 1,000 rpm or higher. Turn the engine OFF and key OFF for 15 seconds. Restart and run at high idle for 2 minutes a second time. Then perform a fresh DTC readout and record whether ANY of the nine listed yellow UQLS faults are Active/Confirmed: "+codes.join(", ")+". Follow shop safety and exhaust precautions.",choices:["Repeat sequence completed; one or more listed yellow UQLS faults returned active/confirmed","Repeat sequence completed; none of the nine listed yellow UQLS faults returned active","Sequence not completed / result uncertain"],test:"Return status of all nine yellow UQLS faults after prescribed two-cycle verification",prompt:"Record both high-idle runs, the 15-second key-off interval and final status for each listed code."},
 {id:"p205b_result",title:"Use the result to decide the next action",instruction:"If ANY of the nine yellow UQLS faults returns Active/Confirmed after the prescribed checks, CBR 2107-22 directs replacement of the DEF Level/UQLS sensor using the current Mack Impact procedure and TSB 258-040 wire routing instructions. Confirm the truck is within the bulletin scope before repair. If none of the nine yellow UQLS faults returns active, the bulletin says no UQLS troubleshooting or replacement is necessary. Record the final scan report either way.",choices:["One or more listed yellow UQLS faults returned active/confirmed after repeat test","None of the nine listed yellow UQLS faults returned active after repeat test","Result uncertain or another fault remains"],test:"Final diagnostic decision across all nine yellow UQLS faults",prompt:"Do not replace the sensor based only on the original code; use the repeat-test result and applicability."}
];
export function getMackP205B64Guidance(fault={},vehicle={}){
 const code=String(fault.code||"").toUpperCase().replace(/[^A-Z0-9]/g,"");
 const make=String(vehicle.make||"").trim().toLowerCase();
 if(!Object.hasOwn(MACK_UQLS_YELLOW_CODES,code)||!make.includes("mack"))return null;
 const stepsForFault=steps.map(s=>({...s,choices:[...s.choices]}));
 stepsForFault[0].instruction="Selected fault: "+code+" — "+MACK_UQLS_YELLOW_CODES[code]+". "+stepsForFault[0].instruction;
 return {
  title:"Diagnose "+code+" · Mack DEF/UQLS sensor",
  category:"Aftertreatment · DEF tank sensor",
  faultGuidance:true,
  faultSpecific:true,
  relatedFaultCodes:codes,
  sourceTitle:MACK_UQLS_SOURCE.title,
  sourceUrl:MACK_UQLS_SOURCE.url,
  sourceReference:MACK_UQLS_SOURCE.reference,
  applicability:MACK_UQLS_SOURCE.scope,
  caution:"This is the 2026 Mack CBR path, not a universal procedure. AN(4) and PR(4) are excluded. Confirm the exact model variant, emissions generation and current Mack service information before proceeding.",
  steps:stepsForFault
 };
}
