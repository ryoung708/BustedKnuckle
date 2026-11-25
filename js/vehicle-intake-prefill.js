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
  const query = fromQuery();
  const stored = readStored();
  const source = hasDetails(query) ? "carried over from the other diagnostic workspace" :
    hasDetails(stored) ? "your last diagnostic case" : "your most recent saved case";
  const profile = hasDetails(query) ? query : (hasDetails(stored) ? stored : latestSavedCase());
  if (!hasDetails(profile)) return null;
  let filled = 0;
  for (const [id,key] of Object.entries(FIELD_MAP)) {
    const field = document.getElementById(id);
    if (field && !clean(field.value) && clean(profile[key])) { field.value = profile[key]; field.dispatchEvent(new Event("input", {bubbles:true})); filled++; }
  }
  const note = document.getElementById("vehiclePrefillStatus");
  if (note) {
    note.textContent = (hasDetails(query) ? "Vehicle details carried over from DCC." : "Vehicle details prefilled from saved history.") +
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
  const clear = document.getElementById("clearVehiclePrefill");
  clear?.addEventListener("click", () => {
    for (const id of Object.keys(FIELD_MAP)) { const field=document.getElementById(id); if(field) { field.value=""; field.dispatchEvent(new Event("input", {bubbles:true})); } }
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
    const note=document.getElementById("vehiclePrefillStatus");
    if(note) { note.textContent="Saved vehicle details cleared. Enter the current truck."; note.hidden=false; }
    clear.hidden=true;
    document.dispatchEvent(new Event("ironknuckle:vehicle-prefilled"));
  });
}
