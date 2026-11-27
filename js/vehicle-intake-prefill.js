// Shared, local-only vehicle intake memory for DCC and WiringHound.
const STORAGE_KEY = "ironknuckle.vehicle-intake.last.v1";
const FIELD_MAP = {
  year:"year", make:"make", model:"model", engineMake:"engineMake", engine:"engine",
  transmissionMake:"transmissionMake", transmissionModel:"transmissionModel",
  emissions:"emissions", vin:"vin"
};
const clean = value => String(value ?? "").trim();
const hasDetails = profile => Object.values(profile || {}).some(value => clean(value));

function fromCase(item) {
  const v = item?.vehicle || item?.caseEnvelope?.vehicle || {};
  return {
    year:clean(v.year), make:clean(v.make), model:clean(v.model),
    engineMake:clean(v.engineMake || v.engineManufacturer),
    engine:clean(v.engine || v.engineModel),
    transmissionMake:clean(v.transmissionMake || v.transmissionManufacturer),
    transmissionModel:clean(v.transmissionModel || v.transmission),
    emissions:clean(v.emissions || v.emissionsFamily),
    vin:clean(v.vinLast6 || v.vin)
  };
}
function readStored() {
  try { const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null"); return value?.vehicle || value; }
  catch { return null; }
}
function fromQuery() {
  const params = new URLSearchParams(location.search);
  return Object.fromEntries(Object.keys(FIELD_MAP).map(key => [key, clean(params.get(key))]));
}
function latestSavedCase() {
  const rows = [];
  for (const key of ["ironknuckle.sessions.v1", "ironknuckle.wiringhound.cases.v2"]) {
    try {
      const list = JSON.parse(localStorage.getItem(key) || "[]");
      if (Array.isArray(list)) rows.push(...list);
    } catch {}
  }
  rows.sort((a,b) => Date.parse(b.updatedAt || b.createdAt || 0) - Date.parse(a.updatedAt || a.createdAt || 0));
  return rows.map(fromCase).find(hasDetails) || null;
}
export function applyVehiclePrefill() {
  const query = new URLSearchParams(location.search).has("handoff") ? {} : fromQuery();
  const stored = readStored();
  const source = hasDetails(query) ? "carried over from the other diagnostic workspace" :
    hasDetails(stored) ? "your last diagnostic case" : "your most recent saved case";
  if(new URLSearchParams(location.search).get("handoff")==="1") return null;
  const profile = hasDetails(query) ? query : (hasDetails(stored) ? stored : latestSavedCase());
  if (!hasDetails(profile)) return null;
  let filled = 0;
  for (const [id,key] of Object.entries(FIELD_MAP)) {
    const field = document.getElementById(id);
    if (field && !clean(field.value) && clean(profile[key])) { field.value = profile[key]; field.dispatchEvent(new Event("input", {bubbles:true})); filled++; }
  }
  const note = document.getElementById("vehiclePrefillStatus");
  if (note) {
    note.textContent = (hasDetails(query) ? "Vehicle details carried over from another diagnostic workspace." : "Vehicle details prefilled from saved history.") +
      " Verify this is the correct truck before starting a new case.";
    note.hidden = false;
  }
  const clear = document.getElementById("clearVehiclePrefill");
  if (clear) clear.hidden = false;
  document.dispatchEvent(new Event("ironknuckle:vehicle-prefilled"));
  return {profile, filled, source};
}
export function rememberVehiclePrefill() {
  const vehicle = Object.fromEntries(Object.entries(FIELD_MAP).map(([id,key]) => [key, clean(document.getElementById(id)?.value)]));
  if (hasDetails(vehicle)) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({vehicle, savedAt:new Date().toISOString()})); } catch {}
  }
  return vehicle;
}
export function bindVehiclePrefillControls() {
  bindVinLookup();
  const clear = document.getElementById("clearVehiclePrefill");
  clear?.addEventListener("click", () => {
    for (const id of Object.keys(FIELD_MAP)) { const field=document.getElementById(id); if(field) { field.value=""; field.dispatchEvent(new Event("input", {bubbles:true})); } }
    const fullVin=document.getElementById("ikFullVin");if(fullVin)fullVin.value="";
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
    const note=document.getElementById("vehiclePrefillStatus");
    if(note) { note.textContent="Saved vehicle details cleared. Enter the current truck."; note.hidden=false; }
    clear.hidden=true;
    document.dispatchEvent(new Event("ironknuckle:vehicle-prefilled"));
  });
}

 
// Suggestions are deliberately not persisted as confirmed emissions.
export function suggestEmissions(year, make, engine) {
  const y=Number(year);
  if(!/^\d{4}$/.test(clean(year)) || y<2007 || y>2026) return "";
  if(!/^(mack|volvo)$/i.test(clean(make)) || !/^(MP7|MP8|D11|D13)$/i.test(clean(engine))) return "";
  if(y>=2017 && y<=2020) return "US17 family — confirm OBD generation and build date";
  return "";
}
export function vinLookupFields(row={}) {
  return {year:clean(row.ModelYear),make:clean(row.Make),model:clean(row.Model),engineMake:clean(row.EngineManufacturer),engine:clean(row.EngineModel)};
}
export function bindVinLookup() {
  const vin=document.getElementById("vin"), emissions=document.getElementById("emissions");
  if(!vin||!emissions||document.getElementById("ikVinLookup")) return;
  const panel=document.createElement("div");
  panel.id="ikVinLookup";panel.className="field";
  panel.innerHTML='<label for="ikFullVin">Full VIN lookup (optional)</label><input id="ikFullVin" maxlength="17" autocomplete="off" autocapitalize="characters" placeholder="17-character VIN"><button class="btn" type="button" id="ikDecodeVin">Decode VIN</button><p class="small" id="ikVinStatus" role="status">Lookup sends the VIN to NHTSA. Only the last six characters are retained in your case.</p>';
  vin.closest(".field").before(panel);
  const input=panel.querySelector("input"), button=panel.querySelector("button"), status=panel.querySelector("p");
  const hint=document.createElement("p");hint.className="small";hint.setAttribute("role","status");emissions.after(hint);
  const refresh=()=>{const suggestion=suggestEmissions(document.getElementById("year")?.value,document.getElementById("make")?.value,document.getElementById("engine")?.value);hint.textContent=suggestion?"Likely emissions: "+suggestion+". Enter the confirmed value above; this suggestion is not OEM verification.":"";};
  for(const id of ["year","make","engine"])document.getElementById(id)?.addEventListener("input",refresh);
  document.addEventListener("ironknuckle:vehicle-prefilled",refresh);refresh();
  button.addEventListener("click",async()=>{
    const value=clean(input.value).toUpperCase();
    if(!/^[A-HJ-NPR-Z0-9]{17}$/.test(value)){status.textContent="Enter a valid 17-character VIN (no I, O or Q).";return;}
    button.disabled=true;status.textContent="Looking up vehicle…";
    const before=Object.fromEntries(Object.keys(FIELD_MAP).map(id=>[id,document.getElementById(id)?.value]));
    try{
      const response=await fetch("https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues/"+encodeURIComponent(value)+"?format=json",{signal:AbortSignal.timeout(15000)});
      if(!response.ok)throw Error("lookup");
      const row=(await response.json()).Results?.[0];
      if(!row||clean(row.ErrorCode)!=="0"||!row.Make||!row.ModelYear)throw Error("unverified");
      if(Object.keys(before).some(id=>document.getElementById(id)?.value!==before[id])||clean(input.value).toUpperCase()!==value){status.textContent="Vehicle details changed during lookup. Try again.";return;}
      const fields=vinLookupFields(row);
      if(Object.entries(fields).some(([id,v])=>v&&clean(before[id])&&clean(before[id]).toLowerCase()!==v.toLowerCase())|| (clean(before.vin)&&clean(before.vin).toUpperCase()!==value.slice(-6))){status.textContent="Decoded vehicle differs from existing details. Clear the prefilled vehicle before retrying, or enter details manually.";return;}
      for(const [id,v] of Object.entries({...fields,vin:value.slice(-6)})){const field=document.getElementById(id);if(field&&v&&!clean(field.value)){field.value=v;field.dispatchEvent(new Event("input",{bubbles:true}));}}
      input.value="";refresh();status.textContent="VIN decoded. Review the populated fields and confirm emissions from the engine label or OEM build information.";
    }catch{status.textContent="VIN lookup unavailable or incomplete. Continue with manual vehicle entry.";}
    finally{button.disabled=false;}
  });
}
