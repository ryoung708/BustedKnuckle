import { supabase } from "./supabase-client.js";
import { resolveVehiclePlatform } from "./vehicle-platform-registry.js";

const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const clean = value => String(value ?? "").trim();
const $ = id => document.getElementById(id);

export function architectureQueryIdentity(vehicle = {}) {
  return resolveVehiclePlatform(vehicle);
}

function vehicleFromForm() {
  return {
    year:$("year")?.value, make:$("make")?.value, model:$("model")?.value,
    engineMake:$("engineMake")?.value, engineModel:$("engine")?.value,
    transmissionMake:$("transmissionMake")?.value, transmissionModel:$("transmissionModel")?.value,
    emissionsFamily:$("emissions")?.value, vin:$("vin")?.value
  };
}

function renderMessage(host, title, message, tone = "muted") {
  host.innerHTML = '<div class="ik-architecture-state '+tone+'"><b>'+esc(title)+'</b><p>'+esc(message)+'</p></div>';
}

function renderResults(host, identity, rows) {
  if (!rows.length) {
    renderMessage(host, "No published architecture matches this truck yet.",
      "The architecture catalog is new and currently has no published vehicle records. IronKnuckle will not substitute another model year, engine, or chassis architecture. Existing diagnostic workflows remain available.");
    return;
  }
  host.innerHTML = '<div class="ik-architecture-match"><b>'+esc(identity.platformName)+' · '+esc(identity.modelYear)+' '+esc(identity.model)+'</b><span>Published vehicle architecture</span></div>'+
    rows.map(row => {
      const cfg = row.configuration, arch = row.architecture;
      const controllers = row.controllers || [], networks = row.networks || [], power = row.power || [], connectors = row.connectors || [];
      const sourceLabels = [...new Set([...(row.sources||[]).map(s=>s.source_title+' · '+(s.revision||"revision not stated"))])];
      return '<article class="ik-architecture-record"><header><b>'+esc(arch.architecture_name)+'</b><small>Rev '+esc(arch.revision)+' · '+esc(arch.source_confidence)+'</small></header>'+
        '<p>'+esc(cfg.model_name)+' '+esc(cfg.model_year)+' · '+esc(cfg.engine_manufacturer||"Engine not recorded")+' '+esc(cfg.engine_model||"")+'</p>'+
        '<div class="ik-architecture-columns"><section><b>Controllers ('+controllers.length+')</b>'+ (controllers.length?'<ul>'+controllers.map(c=>'<li>'+esc(c.controller_name)+' · '+esc(c.physical_location||"Location not recorded")+'</li>').join("")+'</ul>':'<p>Not documented</p>')+'</section>'+
        '<section><b>Networks ('+networks.length+')</b>'+(networks.length?'<ul>'+networks.map(n=>'<li>'+esc(n.network_name)+' · '+esc(n.protocol)+'</li>').join("")+'</ul>':'<p>Not documented</p>')+'</section>'+
        '<section><b>Power / grounds ('+power.length+')</b>'+(power.length?'<ul>'+power.map(p=>'<li>'+esc(p.distribution_name)+' · '+esc(p.distribution_type)+' · '+esc(p.physical_location||"Location not recorded")+'</li>').join("")+'</ul>':'<p>Not documented</p>')+'</section>'+
        '<section><b>Connectors ('+connectors.length+')</b>'+(connectors.length?'<ul>'+connectors.map(c=>'<li>'+esc(c.connector_designation)+' · '+esc(c.connector_location||"Location not recorded")+'</li>').join("")+'</ul>':'<p>Not documented</p>')+'</section></div>'+
        '<p class="ik-architecture-sources"><b>Sources:</b> '+esc(sourceLabels.join("; ")||"Source metadata unavailable")+'</p></article>';
    }).join("");
}

async function loadPublishedArchitecture(host, button) {
  const vehicle = vehicleFromForm();
  const identity = architectureQueryIdentity(vehicle);
  if (!identity.normalizedMake || !identity.model || !identity.modelYear) {
    renderMessage(host,"Vehicle details needed","Enter the truck manufacturer, model and model year first. Add engine manufacturer/model to narrow applicability.");
    return;
  }
  button.disabled = true;
  button.textContent = "CHECKING CATALOG…";
  renderMessage(host,"Checking exact vehicle applicability…","Only published architecture records matching the selected vehicle will be shown.");
  try {
    const {data:sessionData,error:sessionError} = await supabase.auth.getSession();
    if (sessionError) throw sessionError;
    if (!sessionData.session) {
      renderMessage(host,"Sign in to access the architecture catalog","Vehicle architecture records are restricted to authenticated IronKnuckle users. Your case and intake details have not been uploaded.");
      return;
    }
    const {data:makers,error:makerError} = await supabase.from("vehicle_manufacturers").select("id,canonical_name,aliases");
    if (makerError) throw makerError;
    const makeKey = identity.normalizedMake.toLowerCase().replace(/[^a-z0-9]+/g,"");
    const maker = (makers||[]).find(item => [item.canonical_name,...(item.aliases||[])].some(name=>String(name).toLowerCase().replace(/[^a-z0-9]+/g,"")===makeKey));
    if (!maker) { renderResults(host,identity,[]); return; }
    const {data:platforms,error:platformError} = await supabase.from("vehicle_platforms").select("id,platform_name,model_year_start,model_year_end,generation").eq("manufacturer_id",maker.id).eq("status","published");
    if(platformError)throw platformError;
    const platformIds=(platforms||[]).filter(p=>(p.model_year_start==null||Number(identity.modelYear)>=p.model_year_start)&&(p.model_year_end==null||Number(identity.modelYear)<=p.model_year_end)).map(p=>p.id);
    if(!platformIds.length){renderResults(host,identity,[]);return;}
    const {data:configs,error:configError}=await supabase.from("vehicle_configurations").select("id,platform_id,model_name,model_year,engine_manufacturer,engine_model,transmission_manufacturer,transmission_model,emissions_family,applicability_notes").in("platform_id",platformIds).eq("status","published").eq("model_year",Number(identity.modelYear)).ilike("model_name",identity.model);
    if(configError)throw configError;
    const matches=(configs||[]).filter(c=>
      (!vehicle.engineMake||!c.engine_manufacturer||c.engine_manufacturer.toLowerCase()===vehicle.engineMake.toLowerCase())&&
      (!vehicle.engineModel||!c.engine_model||c.engine_model.toLowerCase()===vehicle.engineModel.toLowerCase())
    );
    if(!matches.length){renderResults(host,identity,[]);return;}
    const results=[];
    for(const config of matches){
      const {data:architectures,error:archError}=await supabase.from("electrical_architectures").select("id,architecture_name,revision,source_confidence").eq("configuration_id",config.id).eq("status","published");
      if(archError)throw archError;
      for(const architecture of architectures||[]){
        const [controllers,networks,power,connectors,sources]=await Promise.all([
          supabase.from("architecture_controllers").select("controller_code,controller_name,physical_location").eq("architecture_id",architecture.id).eq("status","published"),
          supabase.from("architecture_network_segments").select("network_name,protocol,topology").eq("architecture_id",architecture.id).eq("status","published"),
          supabase.from("architecture_power_distributions").select("distribution_name,distribution_type,physical_location").eq("architecture_id",architecture.id).eq("status","published"),
          supabase.from("architecture_connectors").select("connector_designation,connector_location,pin_count").eq("architecture_id",architecture.id).eq("status","published"),
          supabase.from("architecture_sources").select("source_title,revision,page_reference,source_url,rights_status,validation_level").eq("architecture_id",architecture.id).eq("status","published")
        ]);
        for(const result of [controllers,networks,power,connectors,sources])if(result.error)throw result.error;
        results.push({configuration:config,architecture,controllers:controllers.data,networks:networks.data,power:power.data,connectors:connectors.data,sources:sources.data});
      }
    }
    renderResults(host,identity,results);
  } catch(error) {
    console.error("Vehicle architecture lookup failed:",error);
    renderMessage(host,"Architecture lookup unavailable",error?.message||"Could not load the published vehicle architecture. Existing diagnostic workflows are unchanged.","error");
  } finally {
    button.disabled=false;
    button.textContent="LOOK UP VEHICLE ARCHITECTURE";
  }
}

export function mountVehicleArchitecturePanel(hostId) {
  const host=$(hostId);
  if(!host)return;
  host.innerHTML='<div class="ik-architecture-heading"><div><span>VEHICLE-SPECIFIC REFERENCE</span><h2>Electrical Architecture</h2><p>Controllers, networks, connectors, power distribution and source traceability for the selected truck.</p></div><button type="button" class="btn" data-architecture-search>LOOK UP VEHICLE ARCHITECTURE</button></div><div class="ik-architecture-results" aria-live="polite"><p>Run a lookup after confirming the vehicle details.</p></div>';
  const button=host.querySelector("[data-architecture-search]"),results=host.querySelector(".ik-architecture-results");
  button.addEventListener("click",()=>loadPublishedArchitecture(results,button));
  const refresh=()=>{results.innerHTML='<p>Vehicle details changed. Run a new lookup to confirm exact applicability.</p>';};
  ["year","make","model","engineMake","engine","transmissionMake","transmissionModel","emissions"].forEach(id=>$(id)?.addEventListener("change",refresh));
}

