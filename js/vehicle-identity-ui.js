import {platformRegistry,engineFamilies,resolveVehiclePlatform} from "./vehicle-platform-registry.js";

const makeOptions=[...new Set(platformRegistry.flatMap(platform=>platform.makes))].sort();
const engineMakes=[...new Set(engineFamilies.map(family=>family.manufacturer))].concat(["Mack","Volvo"]).filter((value,index,all)=>all.indexOf(value)===index).sort();
const engineModels=[...new Set(engineFamilies.flatMap(family=>family.models))].sort();
const transmissionMakes=["Allison","Eaton","Mack","PACCAR","Detroit","Volvo","ZF","Meritor"];

function setOptions(id,values){
  const list=document.getElementById(id);
  if(!list)return;
  list.replaceChildren(...values.map(value=>{const option=document.createElement("option");option.value=value;return option}));
}

export function bindVehicleIdentity(){
  setOptions("truckMakes",makeOptions);
  setOptions("engineMakes",engineMakes);
  setOptions("engineModels",engineModels);
  setOptions("transmissionMakes",transmissionMakes);
  const ids=["year","make","model","engineMake","engine","transmissionMake","transmissionModel","emissions","vin"];
  const fields=ids.map(id=>document.getElementById(id)).filter(Boolean);
  const status=document.getElementById("vehicleIdentityStatus");
  if(!status)return;
  const refresh=()=>{
    const result=resolveVehiclePlatform({
      year:document.getElementById("year")?.value,
      make:document.getElementById("make")?.value,
      model:document.getElementById("model")?.value,
      engineMake:document.getElementById("engineMake")?.value,
      engineModel:document.getElementById("engine")?.value,
      transmissionMake:document.getElementById("transmissionMake")?.value,
      transmissionModel:document.getElementById("transmissionModel")?.value,
      emissionsFamily:document.getElementById("emissions")?.value,
      vin:document.getElementById("vin")?.value
    });
    const hasVehicle=Boolean(result.normalizedMake&&result.model&&result.modelYear);
    const hasEngine=Boolean(result.engine.manufacturer&&result.engine.model);
    if(!hasVehicle&&!hasEngine){
      status.textContent="Vehicle identity is optional at intake. Add the truck and engine details you know.";
      status.dataset.state="pending";
      return;
    }
    const engineText=hasEngine?(result.engine.familyId||"engine family not mapped"):"engine identity incomplete";
    status.textContent=result.platformName+" · "+result.modelYear+" "+result.model+" · "+engineText+
      (result.warnings.length?" — "+result.warnings[0]:"");
    status.dataset.state=result.warnings.length?"review":"resolved";
  };
  fields.forEach(field=>field.addEventListener("input",refresh));
  refresh();
}
