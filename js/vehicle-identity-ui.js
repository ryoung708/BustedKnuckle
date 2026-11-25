import {platformRegistry,engineFamilies,resolveVehiclePlatform} from "./vehicle-platform-registry.js";

const makeOptions=[...new Set(platformRegistry.flatMap(platform=>platform.makes))].sort();
const engineMakes=[...new Set(engineFamilies.map(family=>family.manufacturer))].concat(["Mack","Volvo"]).filter((value,index,all)=>all.indexOf(value)===index).sort();
const transmissionMakes=["Allison","Eaton","Mack","PACCAR","Detroit","Volvo","ZF","Meritor"];
const normalize=value=>String(value??"").toLowerCase().replace(/[^a-z0-9]+/g,"");
const engineManufacturerAliases={
  "detroit":["detroit","detroitdiesel"],
  "detroitdiesel":["detroit","detroitdiesel"],
  "paccar":["paccar"],
  "navistar":["international","navistar"],
  "international":["international","navistar"]
};

function setOptions(id,values){
  const list=document.getElementById(id);
  if(!list)return;
  list.replaceChildren(...values.map(value=>{const option=document.createElement("option");option.value=value;return option}));
}

function modelsForManufacturer(value){
  const selected=normalize(value);
  if(!selected)return [];
  const aliases=engineManufacturerAliases[selected]||[selected];
  return [...new Set(engineFamilies
    .filter(family=>aliases.includes(normalize(family.manufacturer)))
    .flatMap(family=>family.models))].sort((a,b)=>a.localeCompare(b,undefined,{numeric:true}));
}

export function bindVehicleIdentity(){
  setOptions("truckMakes",makeOptions);
  setOptions("engineMakes",engineMakes);
  setOptions("transmissionMakes",transmissionMakes);
  const engineMakeField=document.getElementById("engineMake");
  const engineField=document.getElementById("engine");
  const refreshEngineModels=({clearInvalid=false}={})=>{
    const models=modelsForManufacturer(engineMakeField?.value);
    setOptions("engineModels",models);
    if(engineField){
      engineField.placeholder=engineMakeField?.value
        ? (models.length?"Select or enter engine model":"No mapped models yet — enter engine model")
        : "Select engine manufacturer first";
      if(clearInvalid&&engineField.value&&!models.some(model=>normalize(model)===normalize(engineField.value))){
        engineField.value="";
      }
    }
  };
  refreshEngineModels();
  engineMakeField?.addEventListener("change",()=>refreshEngineModels({clearInvalid:true}));
  engineMakeField?.addEventListener("input",()=>refreshEngineModels());
  const ids=["year","make","model","engineMake","engine","transmissionMake","transmissionModel","emissions","vin"];
  const fields=ids.map(id=>document.getElementById(id)).filter(Boolean);
  const status=document.getElementById("vehicleIdentityStatus");
  if(!status)return;
  const refresh=()=>{
    const result=resolveVehiclePlatform({
      year:document.getElementById("year")?.value,
      make:document.getElementById("make")?.value,
      model:document.getElementById("model")?.value,
      engineMake:engineMakeField?.value,
      engineModel:engineField?.value,
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
