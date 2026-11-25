import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, readdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, extname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { Script } from "node:vm";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const temp = await mkdtemp(join(tmpdir(), "ironknuckle-page-check-"));
let htmlCount = 0;
let inlineScriptCount = 0;
let sourceFileCount = 0;

try {
  // Parse every shipped JavaScript source file, including test and helper scripts.
  for (const directory of [root, join(root, "js"), join(root, "scripts")]) {
    const entries = await readdir(directory, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isFile() || ![".js", ".mjs"].includes(extname(entry.name))) continue;
      const file = join(directory, entry.name);
      const result = spawnSync(process.execPath, ["--check", file], { encoding: "utf8" });
      assert.equal(result.status, 0,
        "JavaScript syntax failed in " + file + "\n" + result.stderr + result.stdout);
      sourceFileCount++;
    }
  }

  const rootEntries = await readdir(root, { withFileTypes: true });
  const htmlFiles = rootEntries
    .filter(entry => entry.isFile() && extname(entry.name).toLowerCase() === ".html")
    .map(entry => join(root, entry.name));
  assert.ok(htmlFiles.length > 0, "Expected shipped HTML pages to validate");

  for (const file of htmlFiles) {
    const html = await readFile(file, "utf8");
    htmlCount++;
    const tags = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)];

    for (let index = 0; index < tags.length; index++) {
      const [, attributes, source] = tags[index];
      const src = attributes.match(/\bsrc\s*=\s*(["'])(.*?)\1/i);
      if (src) {
        const value = src[2].trim();
        if (!/^(?:[a-z]+:)?\/\//i.test(value) && !value.startsWith("data:")) {
          const localUrl = new URL(value, pathToFileURL(file));
          if (localUrl.protocol === "file:") {
            const localPath = fileURLToPath(localUrl);
            try { await stat(localPath); }
            catch { assert.fail("Missing local script " + value + " referenced by " + file); }
          }
        }
        continue;
      }

      if (!source.trim()) continue;
      const typeMatch = attributes.match(/\btype\s*=\s*(["'])(.*?)\1/i);
      const type = (typeMatch?.[2] || "").toLowerCase();
      if (type && !["text/javascript", "application/javascript", "text/ecmascript",
        "application/ecmascript", "module"].includes(type)) continue;

      const label = file + " inline script #" + (index + 1);
      if (type === "module") {
        const moduleFile = join(temp, "inline-" + inlineScriptCount + ".mjs");
        await writeFile(moduleFile, source, "utf8");
        const result = spawnSync(process.execPath, ["--check", moduleFile], { encoding: "utf8" });
        assert.equal(result.status, 0, "JavaScript syntax failed in " + label + "\n" + result.stderr);
      } else {
        assert.doesNotThrow(() => new Script(source, { filename: label }), label + " must parse");
      }
      inlineScriptCount++;
    }
  }

  // Keep the Diagnostic Command Center transparent about the evidence behind its recommendations.
  const diagnostics = await readFile(join(root, "diagnostics.html"), "utf8");
  assert.match(diagnostics, /recommendation\.explanation\|\|recommendation\.reason/,
    "Diagnostic Command Center must display the shared brain's evidence-based explanation");
  assert.match(diagnostics, /FINDINGS USED IN THIS DECISION/,
    "Diagnostic Command Center must label the findings used in its recommendation");
  assert.match(diagnostics, /item\.testPoints&&"Test points: "/,
    "Recommendation evidence must retain technician-recorded test points");
  assert.match(diagnostics, /item\.actual&&"Measured: "/,
    "Recommendation evidence must retain actual recorded measurements");
  assert.match(diagnostics, /item\.condition&&"Condition: "/,
    "Recommendation evidence must retain test conditions");
  assert.match(diagnostics, /not independently validated measurements/,
    "Recommendation evidence must retain the measurement-validation caution");

  // Fault codes entered on the intake form must be seeded into the first step of the new case.
  assert.match(diagnostics, /const intakeCodes=\$\("intakeFaultCodes"\)\.value\.split/);
  assert.match(diagnostics, /active\.entries\[firstStep\.id\]=\{choice:"",measurements:\{\},notes:"Fault codes entered during investigation intake\."/);
  assert.match(diagnostics, /faultCodes:intakeCodes\.map\(code=>\(\{id:/);

  // Both diagnostic intake forms must share manufacturer-filtered engine options.
  const vehicleIdentity = await readFile(join(root, "js/vehicle-identity-ui.js"), "utf8");
  assert.match(vehicleIdentity, /function modelsForManufacturer\(value\)/,
    "Engine model suggestions must be filtered by the selected engine manufacturer");
  assert.match(vehicleIdentity, /engineManufacturerAliases/,
    "Common engine manufacturer aliases must resolve to the correct engine family");
  assert.match(vehicleIdentity, /refreshEngineModels\(\{clearInvalid:true\}\)/,
    "Changing engine manufacturer must clear a model that belongs to another manufacturer");
  assert.match(vehicleIdentity, /Select engine manufacturer first/,
    "Engine model intake must prompt for manufacturer before suggesting models");
  const vehiclePrefill = await readFile(join(root, "js/vehicle-intake-prefill.js"), "utf8");
  assert.match(vehiclePrefill, /ironknuckle\.vehicle-intake\.last\.v1/,
    "DCC and WiringHound must share one local vehicle profile");
  assert.match(vehiclePrefill, /function latestSavedCase\(\)/,
    "Vehicle intake must be able to recover identity from saved diagnostic cases");
  assert.match(vehiclePrefill, /function fromQuery\(\)/,
    "Vehicle details passed between workspaces must be restored from the URL");
  assert.match(vehiclePrefill, /field\.dispatchEvent\(new Event\("input"/,
    "Prefilled values must refresh dependent engine suggestions and identity validation");
  assert.match(diagnostics, /applyVehiclePrefill\(\)/);
  assert.match(diagnostics, /rememberVehiclePrefill\(\)/);
  assert.match(diagnostics, /vehiclePrefillStatus/);
  assert.match(diagnostics, /clearVehiclePrefill/);
  const wiringPage = await readFile(join(root, "wiringhound.html"), "utf8");
  assert.match(wiringPage, /vehiclePrefillStatus/,
    "WiringHound must explain when vehicle details were prefilled");
  assert.match(wiringPage, /clearVehiclePrefill/,
    "WiringHound must let technicians clear a prefilled vehicle");
  const wiringWorkspace = await readFile(join(root, "js/wiringhound-workspace.js"), "utf8");
  assert.match(wiringWorkspace, /applyVehiclePrefill\(\)/,
    "WiringHound must restore shared vehicle details on intake");
  assert.match(wiringWorkspace, /rememberVehiclePrefill\(\)/,
    "WiringHound must remember vehicle details for the next case");
  assert.match(wiringWorkspace, /bindVehicleIdentity\(\)/,
    "WiringHound must initialize the shared vehicle and engine selectors");
  assert.match(diagnostics, /bindVehicleIdentity\(\)/,
    "DCC must initialize the same shared vehicle and engine selectors");

  // The DCC must connect fault intake, source discovery and actionable test guidance.
  assert.match(diagnostics, /function currentGuidedFault\(\)/,
    "DCC must resolve the active fault while a fault-specific path is open");
  assert.match(diagnostics, /searchPublicBulletinsForActiveFault\(\)/,
    "DCC must automatically search public sources when a fault path launches");
  assert.match(diagnostics, /faultResearchMarkup\(\)/,
    "DCC must display source matches inside the active fault diagnosis");
  assert.match(diagnostics, /CODE-SPECIFIC OEM REFERENCE/,
    "DCC must distinguish a code-specific OEM reference from general search results");
  assert.match(diagnostics, /POSSIBLE SOURCE MATCH — NOT YET VERIFIED/,
    "DCC must label public search results as unverified leads");
  assert.match(diagnostics, /WHAT TO CHECK \/ MEASURE/,
    "DCC must surface the concrete check/test target from each diagnostic step");
  assert.match(diagnostics, /WHERE \/ HOW TO CHECK/,
    "DCC must surface the method/location guidance from each diagnostic step");
  const dccWorkflowEngineText = await readFile(join(root, "js/diagnostic-engine.js"), "utf8");
  const celWorkflowText = dccWorkflowEngineText.slice(dccWorkflowEngineText.indexOf("check_engine_light:"), dccWorkflowEngineText.indexOf("unexpected_shutdown:"));
  assert.match(celWorkflowText, /id:"complaint"[\s\S]*?test:/);
  assert.match(celWorkflowText, /id:"prioritize"[\s\S]*?prompt:/);
  assert.match(celWorkflowText, /id:"verify"[\s\S]*?terminal:true/);
  const complaintTriageWorkflowText = dccWorkflowEngineText.slice(dccWorkflowEngineText.indexOf("complaint_triage:"), dccWorkflowEngineText.indexOf("j1939_dropout:"));
  assert.match(complaintTriageWorkflowText, /id:"complaint_baseline"[\s\S]*?test:/);
  assert.match(complaintTriageWorkflowText, /id:"controller_scan"[\s\S]*?prompt:/);
  assert.match(complaintTriageWorkflowText, /id:"triage_verify"[\s\S]*?terminal:true/);
  const enginePowerLossWorkflowText = dccWorkflowEngineText.slice(dccWorkflowEngineText.indexOf("engine_power_loss:"), dccWorkflowEngineText.indexOf("aftertreatment_fault:"));
  assert.match(enginePowerLossWorkflowText, /id:"airfuel"[\s\S]*?test:/);
  assert.match(enginePowerLossWorkflowText, /id:"exhaust"[\s\S]*?prompt:/);
  assert.match(enginePowerLossWorkflowText, /id:"verify"[\s\S]*?terminal:true/);
  const aftertreatmentWorkflowText = dccWorkflowEngineText.slice(dccWorkflowEngineText.indexOf("aftertreatment_fault:"), dccWorkflowEngineText.indexOf("drivetrain_fault:"));
  const drivetrainWorkflowText = dccWorkflowEngineText.slice(dccWorkflowEngineText.indexOf("drivetrain_fault:"), dccWorkflowEngineText.indexOf("light_inop:"));
  assert.match(drivetrainWorkflowText, /id:"data"[\s\S]*?test:/);
  assert.match(drivetrainWorkflowText, /id:"inspection"[\s\S]*?prompt:/);
  assert.match(drivetrainWorkflowText, /id:"verify"[\s\S]*?terminal:true/);
  assert.match(aftertreatmentWorkflowText, /id:"codes"[\s\S]*?test:/);
  assert.match(aftertreatmentWorkflowText, /id:"data"[\s\S]*?prompt:/);
  assert.match(aftertreatmentWorkflowText, /id:"verify"[\s\S]*?terminal:true/);
  const crankWorkflowText = dccWorkflowEngineText.slice(dccWorkflowEngineText.indexOf("crank_no_start:"), dccWorkflowEngineText.indexOf("engine_power_loss:"));
  assert.match(crankWorkflowText, /id:"codes"[\s\S]*?test:/);
  assert.match(crankWorkflowText, /id:"fuel_isolation"[\s\S]*?optional:true/);
  assert.match(crankWorkflowText, /id:"fuel_retest"[\s\S]*?optional:true/);
  assert.match(crankWorkflowText, /id:"verify"[\s\S]*?terminal:true/);
  assert.doesNotMatch(diagnostics, /FIND PUBLIC OEM BULLETINS/,
    "Public source discovery must not remain buried in the fault-entry accordion");
  const celWorkflow = dccWorkflowEngineText.slice(dccWorkflowEngineText.indexOf("check_engine_light:"), dccWorkflowEngineText.indexOf("\n  }", dccWorkflowEngineText.indexOf("check_engine_light:")));
  assert.match(celWorkflow, /Verify the Check Engine Light and attach fault codes/,
    "Check Engine Light workflow must begin by verifying the lamp and capturing faults");
  assert.match(celWorkflow, /add or import every relevant .*fault code/i,
    "First Check Engine Light step must direct technicians to attach or import fault codes");
  assert.doesNotMatch(celWorkflow, /id:"codes",title:"Retrieve and document fault codes"/,
    "Check Engine Light workflow must not repeat fault retrieval as a separate second step");
  assert.match(diagnostics, /active\.workflowId==="check_engine_light"&&step\.id==="complaint"\?"open":""/,
    "Fault code capture panel must open automatically on the first Check Engine Light step");

  // P016F00 must progress from a proven low-side pass to commanded-vs-actual rail pressure.
  const faultRouting = await readFile(join(root, "js/fault-guidance-routing.js"), "utf8");
  assert.match(faultRouting, /export function getP016F00Guidance/);
  assert.match(faultRouting, /Verify low-side fuel supply pressure/);
  assert.match(faultRouting, /compare commanded vs. actual rail pressure/i);
  assert.match(faultRouting, /Never loosen a high-pressure line/);
  assert.match(diagnostics, /secondChoices=\["Supply pressure below Mack specification"/, "Fuel supply fault intake must retain its own first-step choices");
  assert.match(diagnostics, /choices:secondChoices\|\|\[/, "Fuel supply follow-up choices must not overwrite the first step");
  assert.match(diagnostics, /getP016F00Guidance\(fault,active\)/,
    "Mack P016F00 must launch its staged fuel-pressure workflow");
  const diagnosticBrain = await readFile(join(root, "js/diagnostic-brain.js"), "utf8");
  assert.match(diagnosticBrain, /step\.id==="p016f_low_side"/);
  assert.match(diagnosticBrain, /low-side pressure meets oem specification under the fault conditions/i,
    "A verified low-side pass must advance to high-side rail-pressure testing");
  assert.match(diagnosticBrain, /step\.id==="p016f_high_side"/,
    "High-side commanded-versus-actual rail pressure must have explicit outcome branches");
  assert.match(faultRouting, /id: "p016f_low_side_isolate"/,
    "A failed low-side pressure test must lead to a dedicated isolation stage");
  assert.match(faultRouting, /id: "p016f_low_side_retest"/,
    "A corrected low-side fault must be retested before high-side diagnosis");
  assert.match(diagnosticBrain, /step\.id==="p016f_low_side_isolate"/);
  assert.match(diagnosticBrain, /step\.id==="p016f_low_side_retest"/);
  assert.match(diagnosticBrain, /return go\(steps\.find\(item=>item\.id==="p016f_high_side"\)/,
    "A proven low-side pass must route directly to high-side rail-pressure testing");
  assert.match(diagnostics, /flow\.relatedSources\)\?flow\.relatedSources\.map/,
    "All known related OEM references must be visible in the fault research panel");
  assert.match(diagnostics, /Open broader web search/,
    "A zero-result public index search must provide a broader search fallback");

  // DCC engine low-power and WiringHound whole-vehicle power loss must use distinct workflow IDs.
  const dccComplaintEngineText = await readFile(join(root, "js/diagnostic-complaint-engine.js"), "utf8");
  assert.match(dccWorkflowEngineText, /engine_power_loss:\s*\{/);
  assert.match(dccComplaintEngineText, /workflowId:\s*"engine_power_loss"/);
  assert.match(diagnostics, /function normalizeDccSession\(row\)/);
  assert.match(diagnostics, /next\.workflowId==="power_loss"/);
  assert.match(diagnostics, /normalizeLegacyDcc=item=>normalizeDccSession\(item\)/);
  assert.match(diagnostics, /currentStep>=3\?currentStep\+2:currentStep/);
  assert.match(diagnostics, /step\.optional\?"OPTIONAL BRANCH"/);
  assert.match(diagnostics, /requiredSteps\.filter\(s=>active\.entries\[s\.id\]\?\.choice\)/);

  // Public OEM source discovery must distinguish zero matches from provider failure and retain fallback diagnostics.
  const publicSearch = await readFile(join(root, "supabase/functions/public-oem-search/index.ts"), "utf8");
  const publicSearchParser = await readFile(join(root, "supabase/functions/public-oem-search/search-parser.js"), "utf8");
  assert.match(publicSearch, /searchBingRss/);
  assert.match(publicSearch, /format=rss/);
  assert.match(publicSearch, /provider-unavailable/);
  assert.match(publicSearch, /providerDiagnostics/);
  assert.match(publicSearchParser, /parseBingRssResults/);
  assert.match(publicSearchParser, /parseDuckDuckGoResults/);
  assert.match(diagnostics, /research\.searchStatus==="provider-unavailable"/);
  assert.match(diagnostics, /research\.providerDiagnostics/);

  // The Technical Library must OCR scanned sources and expose a reviewable, page-cited bulletin draft.
  const technicalLibrary = await readFile(join(root, "technical-library.html"), "utf8");
  assert.match(technicalLibrary, /tesseract\.js@5/,
    "Technical Library must use open-source browser OCR for scanned pages");
  assert.match(technicalLibrary, /worker\.recognize\(canvas\)/,
    "Scanned PDF pages must be rendered and passed to OCR");
  assert.match(technicalLibrary, /function pdfTextLines\(items\)/,
    "PDF text extraction must retain line boundaries for numbered procedures");
  assert.match(technicalLibrary, /line=pdfTextLines\(content\.items\)/,
    "Bulletin parsing must receive line-preserving PDF text");
  assert.match(technicalLibrary, /\[Page \"\+pageNo/,
    "Extracted text must preserve page markers");
  assert.match(technicalLibrary, /parseBulletinIntelligence\(/,
    "Technical Library must create structured bulletin extraction drafts");
  assert.match(technicalLibrary, /data-bulletin=/,
    "Technical bulletin records must expose the bulletin reader");
  assert.match(technicalLibrary, /bulletin_intelligence/,
    "Bulletin review drafts must be saved in the private review table");
  assert.match(technicalLibrary, /sourcePage/,
    "Bulletin steps must retain their source page references");
  assert.match(technicalLibrary, /Approve verified bulletin/,
    "Bulletin approval must require an explicit reviewer action");

  // Guard the Learning Center's highest-risk interactive paths against silent regressions.
  const learning = await readFile(join(root, "learning.html"), "utf8");
  for (const system of ["electrical", "engine", "aftertreatment", "transmission", "differential", "summary"]) {
    assert.match(learning, new RegExp("data-system=[\\\"']" + system + "[\\\"']"),
      "Learning Center system tab is missing: " + system);
  }
  assert.match(learning, /document\.querySelectorAll\("\[data-system\]"\)/);
  assert.match(learning, /tabs\.forEach\(t=>t\.addEventListener\("click"/,
    "Learning Center system tabs must have click handlers");
  assert.match(learning, /function renderModule\(key\)/);
  assert.match(learning, /wireDrivelineControls\(key\)/,
    "Newly rendered drivetrain controls must be wired after rendering");
  for (const gear of ["1", "2", "3", "4", "R", "N"]) {
    assert.match(learning, new RegExp("data-amt-gear=[\\\"']" + gear + "[\\\"']"),
      "AMT selector is missing gear " + gear);
  }
  for (const mode of ["straight", "turn"]) {
    assert.match(learning, new RegExp("data-diff-mode=[\\\"']" + mode + "[\\\"']"),
      "Differential mode control is missing: " + mode);
  }
  assert.match(learning, /root\.querySelectorAll\("\[data-amt-gear\]"\)\.forEach\(b=>b\.addEventListener\("click"/,
    "AMT gear buttons must have click handlers");
  assert.match(learning, /root\.querySelectorAll\("\[data-diff-mode\]"\)\.forEach\(b=>b\.addEventListener\("click"/,
    "Differential mode buttons must have click handlers");

  console.log("IronKnuckle page-integrity checks passed: " +
    htmlCount + " HTML pages, " + inlineScriptCount + " inline scripts, " +
    sourceFileCount + " JavaScript source files; Learning Center controls verified.");
} finally {
  await rm(temp, { recursive: true, force: true });
}
