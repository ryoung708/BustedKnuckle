// Cross-workspace reference snapshot. No original case mutation, automatic pass,
// attachment copying, URL disclosure, or new database permissions.
const KEY="ironknuckle.diagnostic-handoff.v1";
const TTL=10*60*1000;
const APPS=["dcc","wiringhound"];
const fields={year:"year",make:"make",model:"model",engineMake:"engineMake",engine:"engine",transmissionMake:"transmissionMake",transmissionModel:"transmissionModel",emissions:"emissions",vin:"vinLast6"};
const clean=(value,max=1000)=>String(value??"").trim().slice(0,max);
const esc=value=>clean(value,5000).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const label=app=>app==="dcc"?"Diagnostic Command Center":"WiringHound";
function identity(v={}){return {year:clean(v.year,20),make:clean(v.make,100),model:clean(v.model,100),engineMake:clean(v.engineMake||v.engineManufacturer,100),engine:clean(v.engine||v.engineModel,100),transmissionMake:clean(v.transmissionMake||v.transmissionManufacturer,100),transmissionModel:clean(v.transmissionModel||v.transmission,100),emissions:clean(v.emissions||v.emissionsFamily,100),vinLast6:clean(v.vinLast6,6)};}
export function createDiagnosticHandoff(record,source,target,now=Date.now()){
 if(!record?.id||!APPS.includes(source)||!APPS.includes(target)||source===target)throw new TypeError("A saved source case and different destination are required.");
 const rows=Object.entries(record.entries||{}).filter(([,e])=>e&&typeof e==="object").slice(0,80).map(([id,e])=>({stage:clean(id,100),observation:clean(e.choice),measurements:Object.entries(e.measurements||{}).slice(0,20).map(([k,v])=>[clean(k,100),clean(typeof v==="object"?JSON.stringify(v):v)]).filter(([,v])=>v),notes:clean(e.notes),faults:(Array.isArray(e.faultCodes)?e.faultCodes:[]).slice(0,40).map(f=>({code:clean(f?.code,100),controller:clean(f?.controller,100),status:clean(f?.status,50)})).filter(f=>f.code),attachmentCount:Array.isArray(e.evidence)?e.evidence.length:0}));
 return {version:1,source,target,sourceCaseId:clean(record.id,160),sourceWorkflow:clean(record.workflowId,100),createdAt:now,vehicle:identity(record.vehicle),complaint:clean(record.complaint,2000),rows};
}
export function isValidHandoff(value,target,now=Date.now()){
 return !!(value&&value.version===1&&APPS.includes(value.source)&&APPS.includes(target)&&value.target===target&&value.source!==target&&value.sourceCaseId&&Number.isFinite(value.createdAt)&&now>=value.createdAt&&now-value.createdAt<=TTL&&value.vehicle&&Array.isArray(value.rows));
}
export function matchesHandoffVehicle(handoff,record){
 const a=identity(handoff?.vehicle),b=identity(record?.vehicle);
 return Object.keys(a).every(k=>!a[k]||a[k].toLowerCase()===b[k].toLowerCase());
}
export function handoffReferenceMarkup(ref){
 if(!ref||!APPS.includes(ref.source)||!Array.isArray(ref.rows))return "";
 const rows=ref.rows.filter(row=>row&&typeof row==="object").map(row=>'<article class="case-card"><b>'+esc(row.stage)+'</b>'+(row.observation?'<p>Recorded observation: '+esc(row.observation)+'</p>':"")+(Array.isArray(row.measurements)?row.measurements.filter(pair=>Array.isArray(pair)&&pair.length===2).map(([k,v])=>'<p>'+esc(k)+': '+esc(v)+'</p>').join(""):"")+(row.notes?'<p>Notes: '+esc(row.notes)+'</p>':"")+(Array.isArray(row.faults)?row.faults.filter(f=>f&&typeof f==="object").map(f=>'<p>Previous scan: '+esc(f.code)+' · '+esc(f.controller)+' · '+esc(f.status||"unknown")+'</p>').join(""):"")+(row.attachmentCount?'<p>Files remain in the original case.</p>':"")+'</article>').join("");
 return '<details class="details-card"><summary>Transferred findings — '+esc(label(ref.source))+'</summary><p class="small">Reference only. Reconfirm applicability, current fault status and test conditions. No receiving-workflow tests have been marked complete. Source case: '+esc(ref.sourceCaseId)+'</p>'+rows+'</details>';
}
export function bindHandoffSender(source,getRecord){
 document.addEventListener("click",event=>{
  const button=event.target.closest?.("[data-ik-handoff]");
  if(!button)return;
  const record=getRecord();if(!record)return;
  const target=source==="dcc"?"wiringhound":"dcc";
  if(!confirm("Carry the saved vehicle, complaint and recorded findings to "+label(target)+"? Files remain in the source case. Unsaved edits are not included."))return;
  try{sessionStorage.setItem(KEY,JSON.stringify(createDiagnosticHandoff(record,source,target)));location.href=(target==="dcc"?"./diagnostics.html":"./wiringhound.html")+"?handoff=1";}catch{alert("Could not prepare the handoff in this browser. The source case is unchanged.");}
 });
}
export function mountHandoffIntake(target){
 let pending=null,accepted=null;
 if(new URLSearchParams(location.search).get("handoff")==="1"){
  try{const raw=sessionStorage.getItem(KEY);sessionStorage.removeItem(KEY);const value=JSON.parse(raw||"null");if(isValidHandoff(value,target))pending=value;}catch{}
 }
 if(!pending)return ()=>null;
 const complaint=document.getElementById("complaint");if(!complaint)return ()=>null;
 const panel=document.createElement("section");panel.className="case-card";panel.setAttribute("aria-label","Incoming diagnostic handoff");
 const heading=document.createElement("strong");heading.textContent="Incoming findings from "+label(pending.source);
 const description=document.createElement("p");description.textContent=[pending.vehicle.year,pending.vehicle.make,pending.vehicle.model,pending.vehicle.engine,pending.vehicle.vinLast6].filter(Boolean).join(" ")+" · "+pending.rows.length+" saved stages. Confirm this is the correct truck before accepting.";
 const use=document.createElement("button");use.type="button";use.className="btn";use.textContent="Use transferred case details";
 const discard=document.createElement("button");discard.type="button";discard.className="btn";discard.textContent="Discard transfer";
 panel.append(heading,description,use,discard);(complaint.closest(".field")||complaint).before(panel);
 use.onclick=()=>{accepted=pending;for(const [id,key] of Object.entries(fields)){const field=document.getElementById(id);if(field){field.value=accepted.vehicle[key]||"";field.dispatchEvent(new Event("input",{bubbles:true}));field.dispatchEvent(new Event("change",{bubbles:true}));}}complaint.value=accepted.complaint;complaint.dispatchEvent(new Event("input",{bubbles:true}));if(target==="dcc"&&accepted.sourceWorkflow==="starting_system"&&accepted.rows.some(row=>row?.stage==="start_symptom"&&row.observation==="Normal crank but no start")){const picker=document.getElementById("workflow");if(picker){picker.value="crank_no_start";picker.dispatchEvent(new Event("change",{bubbles:true}));}}document.dispatchEvent(new Event("ironknuckle:vehicle-prefilled"));description.textContent="Details accepted. Verify vehicle and choose the destination workflow before starting. Findings will be linked as reference only.";use.disabled=true;};
 discard.onclick=()=>{accepted=null;pending=null;panel.remove();};
 return record=>{if(!accepted)return null;if(!isValidHandoff(accepted,target)){alert("This transfer expired. Start a new handoff; no findings were attached.");accepted=null;panel.remove();return null;}if(!matchesHandoffVehicle(accepted,record)){alert("Vehicle details changed; transferred findings were not attached. Start a new handoff if this is the same truck.");accepted=null;panel.remove();return null;}const value=accepted;accepted=null;panel.remove();return value;};
}
