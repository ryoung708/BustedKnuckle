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
P205B64 P203A13 P206A13
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
assert.deepEqual(result.faultCodes, ["P205B64", "P203A13", "P206A13"]);
assert.equal(result.procedureSteps.length, 5);
assert.equal(result.procedureSteps[0].sourcePage, 1);
assert.equal(result.procedureSteps[2].sourcePage, 2);
assert.equal(result.extractionMethod, "text+ocr");
assert.equal(result.reviewStatus, "candidate");
assert.ok(result.warnings.some(item => item.includes("Verify every instruction")));
console.log("Bulletin intelligence parser tests passed.");
