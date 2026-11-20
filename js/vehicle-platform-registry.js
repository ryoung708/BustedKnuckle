// IronKnuckle multi-OEM vehicle and specification data foundation.
// This registry contains platform identity metadata only. It intentionally contains
// no OEM service specifications, procedures, wiring diagrams or copied publication text.
const clean = value => String(value ?? "").trim();
const key = value => clean(value).toLowerCase().replace(/[^a-z0-9]+/g," ").trim();
const compact = value => key(value).replace(/\s+/g,"");

export const platformRegistry = Object.freeze([
  {
    id:"mack-volvo",
    group:"Mack / Volvo",
    makes:["Mack","Volvo"],
    vehicleTypes:["heavy-duty"],
    coverage:"foundation",
    notes:"Initial IronKnuckle development platform; vehicle and engine identity must still be confirmed per case."
  },
  {
    id:"freightliner-western-star",
    group:"Freightliner / Western Star",
    makes:["Freightliner","Western Star"],
    vehicleTypes:["heavy-duty"],
    coverage:"identity-ready",
    notes:"First additional truck-manufacturer platform targeted for expansion."
  },
  {
    id:"kenworth-peterbilt",
    group:"Kenworth / Peterbilt",
    makes:["Kenworth","Peterbilt"],
    vehicleTypes:["heavy-duty"],
    coverage:"identity-ready",
    notes:"Shared PACCAR vehicle family; engine manufacturer and engine model remain separate vehicle attributes."
  },
  {
    id:"international",
    group:"International",
    makes:["International","International Truck","Navistar"],
    vehicleTypes:["heavy-duty","medium-duty"],
    coverage:"identity-ready",
    notes:"Normalize legacy and current make names without assuming identical vehicle configurations."
  },
  {
    id:"isuzu-hino",
    group:"Isuzu / Hino",
    makes:["Isuzu","Hino"],
    vehicleTypes:["medium-duty"],
    coverage:"identity-ready",
    notes:"Medium-duty expansion group; individual OEM identity remains explicit."
  }
]);

export const engineFamilies = Object.freeze([
  {id:"detroit-dd13",manufacturer:"Detroit Diesel",models:["DD13"],vehicleGroups:["freightliner-western-star"],coverage:"identity-ready"},
  {id:"detroit-dd15",manufacturer:"Detroit Diesel",models:["DD15"],vehicleGroups:["freightliner-western-star"],coverage:"identity-ready"},
  {id:"detroit-dd16",manufacturer:"Detroit Diesel",models:["DD16"],vehicleGroups:["freightliner-western-star"],coverage:"identity-ready"},
  {id:"cummins-x12",manufacturer:"Cummins",models:["X12"],vehicleGroups:["freightliner-western-star","kenworth-peterbilt","international"],coverage:"identity-ready"},
  {id:"cummins-x15",manufacturer:"Cummins",models:["X15"],vehicleGroups:["freightliner-western-star","kenworth-peterbilt","international"],coverage:"identity-ready"},
  {id:"paccar-mx11",manufacturer:"PACCAR",models:["MX-11","MX11"],vehicleGroups:["kenworth-peterbilt"],coverage:"identity-ready"},
  {id:"paccar-mx13",manufacturer:"PACCAR",models:["MX-13","MX13"],vehicleGroups:["kenworth-peterbilt"],coverage:"identity-ready"},
  {id:"international-a26",manufacturer:"International",models:["A26"],vehicleGroups:["international"],coverage:"identity-ready"}
]);

export const specificationSourceStates = Object.freeze([
  "licensed",
  "independently-verified",
  "link-out-only",
  "unverified",
  "not-available"
]);

const normalizeMake = make => {
  const normalized = key(make);
  if (!normalized) return "";
  for (const platform of platformRegistry) {
    if (platform.makes.some(alias => key(alias) === normalized)) return platform.makes[0];
  }
  return clean(make);
};

function engineFamilyFor(engineMake, engineModel) {
  const model = compact(engineModel);
  if (!model) return null;
  const make = key(engineMake);
  const match = engineFamilies.find(family =>
    family.models.some(candidate => compact(candidate) === model) &&
    (!make || key(family.manufacturer) === make)
  );
  return match ? {...match} : null;
}

export function resolveVehiclePlatform(vehicle = {}) {
  const make = normalizeMake(vehicle.make);
  const platform = platformRegistry.find(item =>
    item.makes.some(alias => key(alias) === key(make))
  ) || null;
  const engineMake = clean(vehicle.engineMake || vehicle.engineManufacturer);
  const engineModel = clean(vehicle.engineModel || vehicle.engine);
  const engineFamily = engineFamilyFor(engineMake,engineModel);
  const warnings = [];
  if (!make) warnings.push("Truck manufacturer is missing.");
  if (!clean(vehicle.model)) warnings.push("Truck model is missing.");
  if (!clean(vehicle.year)) warnings.push("Model year is missing.");
  if (!engineMake) warnings.push("Engine manufacturer is not identified.");
  if (!engineModel) warnings.push("Engine model is missing.");
  if (engineModel && !engineFamily) warnings.push("No engine-family mapping is available; do not infer specifications from the truck make.");
  if (engineFamily && platform && !engineFamily.vehicleGroups.includes(platform.id)) {
    warnings.push("This engine-family mapping is not currently associated with the selected truck platform in the registry; verify the actual configuration.");
  }
  return {
    platformId:platform?.id || "unmapped",
    platformName:platform?.group || make || "Unknown platform",
    normalizedMake:make,
    model:clean(vehicle.model),
    modelYear:clean(vehicle.year),
    vin:clean(vehicle.vin),
    engine:{manufacturer:engineMake,model:engineModel,familyId:engineFamily?.id || null},
    transmission:{manufacturer:clean(vehicle.transmissionMake || vehicle.transmissionManufacturer),model:clean(vehicle.transmissionModel || vehicle.transmission)},
    emissionsFamily:clean(vehicle.emissionsFamily || vehicle.emissions),
    completeness:{
      make:Boolean(make),model:Boolean(clean(vehicle.model)),modelYear:Boolean(clean(vehicle.year)),
      engineManufacturer:Boolean(engineMake),engineModel:Boolean(engineModel),vin:Boolean(clean(vehicle.vin))
    },
    warnings
  };
}

export function specificationDisplayDecision(record = {}) {
  const state = specificationSourceStates.includes(record.sourceState)
    ? record.sourceState : "unverified";
  const hasSource = Boolean(clean(record.sourceName) && clean(record.sourceRevision || record.revisionDate));
  const hasApplicability = Boolean(clean(record.platformId) && clean(record.engineFamilyId || record.vehicleApplicability));
  const permissionConfirmed = record.permissionConfirmed === true;
  const mayDisplayValue = (state === "licensed" && permissionConfirmed) ||
    (state === "independently-verified" && record.legalReviewApproved === true);
  const complete = hasSource && hasApplicability;
  return {
    sourceState:state,
    mayDisplayValue:Boolean(mayDisplayValue && complete),
    status:mayDisplayValue && complete ? "approved-for-display" :
      state === "link-out-only" ? "link-out-only" : "verification-required",
    reasons:[
      ...(!hasSource ? ["A named source and revision/date are required."] : []),
      ...(!hasApplicability ? ["Vehicle and engine applicability must be identified."] : []),
      ...(state === "licensed" && !permissionConfirmed ? ["Commercial display permission has not been confirmed."] : []),
      ...(state === "independently-verified" && record.legalReviewApproved !== true ? ["Independent-source content requires legal/content approval before display."] : []),
      ...(state === "unverified" || state === "not-available" ? ["No verified permissioned specification is available for display."] : [])
    ]
  };
}
