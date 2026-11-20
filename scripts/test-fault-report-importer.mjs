import assert from "node:assert/strict";
import {parseFaultReportText,findFaultDuplicates,resolveTesseractCreateWorker,extractFaultReport} from "../js/fault-report-importer.js";
const sample=parseFaultReportText("Active Faults\nSPN 1049 FMI 3 - Brake system controller ABS\n11/1049/3 ABS controller fault\nP2002 - Diesel particulate filter efficiency below threshold\nP2002 - duplicate line");
assert.equal(sample.length,3);
assert.equal(sample.find(x=>x.codeType==="j1939").code,"SPN 1049 FMI 3");
assert.ok(sample.some(x=>x.code==="11/1049/3"));
assert.ok(sample.some(x=>x.code==="P2002"));
const duplicates=findFaultDuplicates([{code:"P2002",controller:"ECM"},{code:"SPN 1049 FMI 3",controller:"ABS"}],[{code:"P2002",controller:"ECM"}]);
assert.deepEqual([...duplicates],[0]);
const differentController=findFaultDuplicates([{code:"P2002",controller:"ACM"}],[{code:"P2002",controller:"ECM"}]);
assert.equal(differentController.size,0);
const unknownController=findFaultDuplicates([{code:"P2002",controller:""}],[{code:"P2002",controller:"ECM"}]);
assert.deepEqual([...unknownController],[0]);

const textFile=new File(["SPN 1049 FMI 3"],"fault-report.txt",{type:"text/plain"});
const extractedText=await extractFaultReport(textFile);
assert.equal(extractedText.sourceKind,"text / JSON report");
assert.equal(parseFaultReportText(extractedText.text)[0].code,"SPN 1049 FMI 3");
const jsonFile=new File(['{"fault":"P2002"}'],"fault-report.json",{type:"application/json"});
assert.equal((await extractFaultReport(jsonFile)).sourceKind,"text / JSON report");

const namedWorker=()=>{};
assert.equal(resolveTesseractCreateWorker({createWorker:namedWorker}),namedWorker);
assert.equal(resolveTesseractCreateWorker({default:{createWorker:namedWorker}}),namedWorker);
assert.equal(resolveTesseractCreateWorker({Tesseract:{createWorker:namedWorker}}),namedWorker);
assert.equal(resolveTesseractCreateWorker({}),null);
console.log("FAULT REPORT IMPORTER TESTS PASSED");
