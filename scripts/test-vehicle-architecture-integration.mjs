import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [panel, client, dcc, wiring, workspace, vault, caseSchema, similarCases, brain] = await Promise.all([
  readFile(new URL("../js/vehicle-architecture-panel.js", import.meta.url), "utf8"),
  readFile(new URL("../js/supabase-client.js", import.meta.url), "utf8"),
  readFile(new URL("../diagnostics.html", import.meta.url), "utf8"),
  readFile(new URL("../wiringhound.html", import.meta.url), "utf8"),
  readFile(new URL("../js/wiringhound-workspace.js", import.meta.url), "utf8"),
  readFile(new URL("../js/cloud-vault.js", import.meta.url), "utf8"),
  readFile(new URL("../js/case-schema.js", import.meta.url), "utf8"),
  readFile(new URL("../js/diagnostic-similar-cases.js", import.meta.url), "utf8"),
  readFile(new URL("../js/diagnostic-brain.js", import.meta.url), "utf8")
]);

assert.match(panel, /from "\.\/supabase-client\.js"/);
assert.match(caseSchema, /buildVehicleContext/);
assert.match(caseSchema, /vehicleContext,/);
assert.match(vault, /vehicle_context: caseRecord\.caseEnvelope\.vehicleContext/);
assert.match(workspace, /vehicle_context:caseRecord\.caseEnvelope\.vehicleContext/);
assert.match(similarCases, /sameVehicleGeneration/);
assert.match(similarCases, /Cross-vehicle code match only/);
assert.match(workspace, /findSimilarDiagnosticCases\(active,relatedDiagnosticCases\(\),\{\}\)/);
assert.match(workspace, /localStorage\.getItem\("ironknuckle\.sessions\.v1"\)/);
assert.match(brain, /buildVehicleContext\(vehicle\)/);
assert.match(dcc, /brain\.vehicleContext\.identityStatus/);
assert.match(workspace, /brain\.vehicleContext\.identityStatus/);
assert.match(panel, /\.eq\("status","published"\)/);
assert.match(panel, /normalize\(c\.model_name\)===normalize\(identity\.model\)/);
assert.match(panel, /vehicle\.engineMake[\s\S]*c\.engine_manufacturer/);
assert.match(panel, /vehicle\.engineModel[\s\S]*c\.engine_model/);
assert.match(panel, /No published architecture matches this truck yet/);
assert.match(panel, /Sign in to access the architecture catalog/);
assert.match(panel, /Your case and intake details have not been uploaded/);
assert.match(panel, /Never substitute another model year, engine, or chassis architecture/);
assert.match(panel, /architecture_sources/);
assert.match(panel, /architecture_controllers/);
assert.match(panel, /architecture_network_segments/);
assert.match(panel, /architecture_power_distributions/);
assert.match(panel, /architecture_connectors/);
assert.match(client, /export const supabase = createClient/);
assert.equal((client.match(/createClient\(/g)||[]).length,1);
assert.match(dcc, /id="vehicleArchitecturePanel"/);
assert.match(dcc, /mountVehicleArchitecturePanel\("vehicleArchitecturePanel"\)/);
assert.match(wiring, /id="vehicleArchitecturePanel"/);
assert.match(workspace, /mountVehicleArchitecturePanel\("vehicleArchitecturePanel"\)/);
assert.match(workspace, /import \{ supabase as client \} from "\.\/supabase-client\.js"/);
assert.match(vault, /import \{ supabase as client \} from "\.\/supabase-client\.js"/);
assert.doesNotMatch(workspace, /createClient\(/);
assert.doesNotMatch(vault, /createClient\(/);

console.log("Vehicle architecture DCC/WiringHound integration checks passed.");
