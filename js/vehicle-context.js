import { resolveVehiclePlatform } from "./vehicle-platform-registry.js";

const clean = value => String(value ?? "").trim();
const compact = value => clean(value).toLowerCase().replace(/[^a-z0-9]+/g,"");

export function normalizeVehicleIdentity(vehicle = {}) {
  const source = vehicle && typeof vehicle === "object" ? vehicle : {};
  return {
    year:clean(source.year || source.modelYear),
    make:clean(source.make || source.manufacturer),
    model:clean(source.model || source.chassis),
    vinLast6:clean(source.vinLast6 || source.vin_last6 || (String(source.vin || "").length >= 6 ? String(source.vin).slice(-6) : "")),
    engineManufacturer:clean(source.engineManufacturer || source.engineMake),
    engineModel:clean(source.engineModel || source.engine),
    transmissionManufacturer:clean(source.transmissionManufacturer || source.transmissionMake),
    transmissionModel:clean(source.transmissionModel || source.transmission),
    emissionsFamily:clean(source.emissionsFamily || source.emissions)
  };
}

export function buildVehicleContext(vehicle = {}) {
  const identity = normalizeVehicleIdentity(vehicle);
  const resolved = resolveVehiclePlatform({
    year:identity.year, make:identity.make, model:identity.model,
    engineMake:identity.engineManufacturer, engineModel:identity.engineModel,
    transmissionMake:identity.transmissionManufacturer, transmissionModel:identity.transmissionModel,
    emissionsFamily:identity.emissionsFamily, vin:identity.vinLast6
  });
  const completeness = {
    make:Boolean(identity.make), model:Boolean(identity.model), modelYear:Boolean(identity.year),
    engineManufacturer:Boolean(identity.engineManufacturer), engineModel:Boolean(identity.engineModel),
    transmissionManufacturer:Boolean(identity.transmissionManufacturer), transmissionModel:Boolean(identity.transmissionModel),
    emissionsFamily:Boolean(identity.emissionsFamily), vinLast6:Boolean(identity.vinLast6)
  };
  const missing = Object.entries(completeness).filter(([,present])=>!present).map(([field])=>field);
  const identityKey = [
    identity.make,identity.model,identity.year,identity.engineManufacturer,
    identity.engineModel,identity.transmissionManufacturer,identity.transmissionModel,identity.emissionsFamily
  ].map(compact).join("|");
  return {
    schema:"ironknuckle.vehicle-context",
    schemaVersion:1,
    identity,
    identityKey,
    platformId:resolved.platformId,
    platformName:resolved.platformName,
    engineFamilyId:resolved.engine.familyId,
    completeness,
    missing,
    warnings:[...resolved.warnings],
    identityStatus:missing.length===0 ? (resolved.platformId==="unmapped" ? "unmapped" : "identified") : "incomplete",
    applicabilityStatus:"unverified",
    applicabilityNote:"Vehicle identity is not proof that a specific OEM architecture, procedure, bulletin or specification applies. Confirm exact build/VIN, serial range, emissions and source scope before use.",
    provenance:"technician-entered"
  };
}
