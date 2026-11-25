import assert from "node:assert/strict";
import { parseBulletinIntelligence, splitBulletinPages } from "../js/bulletin-intelligence.js";

const sample = `[Page 1]
Mack CBR 2107-22
Revision 202601
Published January 7, 2026
Vehicle Applicability
2017-2024 Mack US17+OBD16 through US22+OBD2023
Exclusions
Does not apply to AN(4) and PR(4).
Fault Codes
P205B64 P203A13 P206A13 U02A200
Service Procedure
1. Inspect both UQLS harness connector halves for damaged pins, corrosion or water intrusion.
2. Verify DEF quality with refractometer.
[Page 2 · OCR]
3. Ensure the DEF tank is not frozen and is adequately filled.
4. Run engine at high idle for 2 minutes at 1000 rpm or higher.
5. Turn engine off and key off for 15 seconds, then restart and repeat high idle for 2 minutes.`;

const pages = splitBulletinPages(sample);
assert.equal(pages.length, 2);
assert.equal(pages[1].method, "ocr");
const result = parseBulletinIntelligence(sample, { title: "Mack CBR", manufacturer: "Mack", pageCount: 2 });
assert.equal(result.document.bulletinNumber, "2107-22");
assert.equal(result.document.revision, "202601");
assert.equal(result.document.publicationDate, "January 7, 2026");
assert.ok(result.applicability.some(item => item.text.includes("2017-2024")));
assert.ok(result.exclusions.some(item => item.text.includes("AN(4)")));
assert.deepEqual(result.faultCodes, ["P205B64", "P203A13", "P206A13", "U02A200"]);
assert.equal(result.procedureSteps.length, 5);
assert.equal(result.procedureSteps[0].sourcePage, 1);
assert.equal(result.procedureSteps[2].sourcePage, 2);
assert.equal(result.extractionMethod, "text+ocr");
assert.equal(result.reviewStatus, "candidate");
assert.ok(result.warnings.some(item => item.includes("Verify every instruction")));
const realCbr = `[Page 1]
Mack DEF Level (UQLS) Sensor Troubleshooting Guide - US17+OBD16 Emissions to US22+OBD2023 (DOES NOT APPLY TO AN(4) and PR(4))
Published 7 January 2026
Valid For
All Mack models 2017 to 2024
Note: This CBR does not apply to PR(4) and AN(4)
Preview Solution CBR-2107-22
Diagnosis and Repair
Diagnostic Steps For Yellow Codes
1. Check the sensor wiring harness connection.
• Disconnect the harness and make sure there is no damage to the wires or pins, corrosion, or water ingress in either connector.
2. Verify DEF quality with refractometer part number 88890105.
[Page 2]
3. Verify that the DEF tank is not frozen.
4. Ensure that the DEF tank is adequately filled.
5. Clear the fault codes.
6. Start the engine. Run the engine on high idle for 2 minutes at 1000 rpm or higher.
7. Turn the engine off, key off for 15 seconds.
8. Start the engine. Run the engine on high idle for 2 minutes a second time.
Evaluate the Results
If any of the faults shown in the yellow chart return active: Replace the DEF Level Sensor in accordance with Impact instructions and TSB 258-040.
If none of the faults in the yellow chart return: No troubleshooting or replacement of the DEF Level Sensor is necessary.`;
const real = parseBulletinIntelligence(realCbr, { title: "Mack CBR 2107-22", manufacturer: "Mack", pageCount: 2 });
assert.equal(real.document.bulletinNumber, "2107-22");
assert.equal(real.document.publicationDate, "7 January 2026");
assert.ok(real.applicability.some(item => item.text.includes("2017 to 2024")));
assert.ok(real.exclusions.some(item => item.text.includes("AN(4)") && item.text.includes("PR(4)")));
assert.ok(real.faultCodes.includes("U02A200"));
assert.ok(real.applicability.some(item => item.text.includes("US17+OBD16")));
assert.equal(real.procedureSteps.length, 9);
assert.ok(real.procedureSteps.some(step => step.text.includes("high idle for 2 minutes") && step.sourcePage === 2));
assert.ok(real.evaluation.some(item => item.text.includes("return active")));
assert.ok(real.references.some(item => item.reference.includes("258-040")));

console.log("Bulletin intelligence parser tests passed.");
