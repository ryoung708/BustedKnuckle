// Fault-specific OEM diagnostic workflows. Keep applicability explicit and
// never infer a truck variant, pinout or test limit from the fault code alone.
const MACK_UQLS_SOURCE={
 title:"Mack CBR 2107-22 · DEF Level (UQLS) Sensor Troubleshooting Guide",
 url:"https://static.nhtsa.gov/odi/tsbs/2026/MC-11028032-0001.pdf",
 reference:"CBR 2107-22 202601 · Published 7 January 2026",
 scope:"Mack US17+OBD16 through US22+OBD2023; excludes AN(4) and PR(4)"
};
const steps=[
 {id:"p205b_applicability",title:"Confirm the bulletin applies",instruction:"Before testing, verify this is a Mack in the bulletin's emissions range (US17+OBD16 through US22+OBD2023) and is NOT an AN(4) or PR(4). Confirm P205B64 is Active or Confirmed in the reporting controller. If inactive, this bulletin says no troubleshooting is required. If the truck variant/emissions are unknown or excluded, stop and use its applicable Mack procedure.",choices:["Active/confirmed and applicability verified","Inactive / historic — no troubleshooting required","AN(4), PR(4), or emissions applicability unknown — stop"],test:"Vehicle variant, emissions generation and fault status",prompt:"Check the VIN/build information and full DTC status before following this bulletin."},
 {id:"p205b_connector",title:"Inspect the UQLS harness connectors",instruction:"At the DEF tank's Urea Quality Level Sensor (UQLS), follow the approved key-off/disconnect procedure and separate the harness connector. Inspect BOTH connector halves and visible harness wiring for pushed-back/bent pins, damaged wires, corrosion, moisture or water intrusion. Photograph anything found. Do not guess pin numbers or perform resistance tests from this fault code alone.",choices:["No pin, wire, corrosion or moisture damage found","Damage, corrosion or water intrusion found","Could not inspect / connector not safely accessible"],test:"UQLS connector and harness condition",prompt:"Look closely at terminal faces, seals and the electrical box/connector area."},
 {id:"p205b_quality",title:"Verify DEF quality",instruction:"Take a clean DEF sample and check concentration with an appropriate DEF refractometer. Compare the reading with Mack's current acceptance specification for this truck. Record the actual reading, units, instrument and applicable spec. Do not guess a concentration limit.",choices:["DEF quality acceptable per Mack specification","Abnormal: DEF quality outside specification / contamination suspected","Test not completed"],test:"DEF concentration",prompt:"Use a DEF refractometer and the current Mack acceptance specification."},
 {id:"p205b_freeze",title:"Check the DEF tank for freezing",instruction:"Determine whether the DEF in the tank is frozen or ice-bound using the approved service method. Record what you observed. If frozen or suspected frozen, stop this sequence and follow Mack's thawing/service instructions; do not use an open flame or improvised heat.",choices:["Tank is not frozen","Abnormal: frozen DEF or ice suspected","Unable to determine"],test:"DEF tank frozen condition",prompt:"Confirm the fluid can be evaluated and the tank is not ice-bound."},
 {id:"p205b_fill",title:"Verify DEF tank fill level",instruction:"Check the actual DEF level and confirm it is adequately filled according to the current Mack procedure for this configuration. Record the displayed/measured level and how it was checked. Do not assume a universal percentage where the current procedure does not specify one.",choices:["Tank adequately filled per Mack procedure","Abnormal: fill level below required amount","Level could not be confirmed"],test:"DEF tank fill level",prompt:"Confirm adequate DEF quantity before the repeat test."},
 {id:"p205b_cycle",title:"Run the Mack repeat-fault check",instruction:"After the previous checks are satisfactory: save the original scan report, clear the fault codes, start the engine and run at high idle for 2 minutes at 1,000 rpm or higher. Turn the engine OFF and key OFF for 15 seconds. Restart and run at high idle for 2 minutes a second time. Then perform a fresh DTC readout and record whether P205B64 is Active/Confirmed. Follow shop safety and exhaust precautions.",choices:["Repeat sequence completed; P205B64 returned active/confirmed","Repeat sequence completed; P205B64 did not return active","Sequence not completed / result uncertain"],test:"Fault return after prescribed two-cycle verification",prompt:"Record both high-idle runs, the 15-second key-off interval and the final DTC status."},
 {id:"p205b_result",title:"Use the result to decide the next action",instruction:"If P205B64 returns Active/Confirmed after the prescribed checks, CBR 2107-22 directs replacement of the DEF Level/UQLS sensor using the current Mack Impact procedure and TSB 258-040 wire routing instructions. Confirm the truck is within the bulletin scope before repair. If the listed fault does not return active, the bulletin says no UQLS troubleshooting or replacement is necessary. Record the final scan report either way.",choices:["P205B64 returned active/confirmed after repeat test","P205B64 did not return active after repeat test","Result uncertain or another fault remains"],test:"Final diagnostic decision",prompt:"Do not replace the sensor based only on the original code; use the repeat-test result and applicability."}
];
export function getMackP205B64Guidance(fault={},vehicle={}){
 const code=String(fault.code||"").toUpperCase().replace(/[^A-Z0-9]/g,"");
 const make=String(vehicle.make||"").trim().toLowerCase();
 if(code!=="P205B64"||!make.includes("mack"))return null;
 return {
  title:"Diagnose P205B64 · Mack DEF/UQLS sensor",
  category:"Aftertreatment · DEF tank sensor",
  faultGuidance:true,
  faultSpecific:true,
  sourceTitle:MACK_UQLS_SOURCE.title,
  sourceUrl:MACK_UQLS_SOURCE.url,
  sourceReference:MACK_UQLS_SOURCE.reference,
  applicability:MACK_UQLS_SOURCE.scope,
  caution:"This is the 2026 Mack CBR path, not a universal procedure. AN(4) and PR(4) are excluded. Confirm the exact model variant, emissions generation and current Mack service information before proceeding.",
  steps:steps.map(s=>({...s,choices:[...s.choices]}))
 };
}
