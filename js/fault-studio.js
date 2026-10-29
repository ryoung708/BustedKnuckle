import { faultCodeDatabase, globalFaultLibrary } from './database.js';
const $ = id => document.getElementById(id);
const engineSelect=$('engine'), emissionSelect=$('emission'), queue=$('queue');
let staged={version:1,faults:{},engine_manifests:{},tools:{}};
const engines=faultCodeDatabase.engines||{};
Object.entries(engines).forEach(([id,engine])=>{const o=document.createElement('option');o.value=id;o.textContent=engine.name||id;engineSelect.append(o)});
function fillEmissions(){emissionSelect.innerHTML='';Object.entries(engines[engineSelect.value]?.emission_levels||{}).forEach(([id,name])=>{const o=document.createElement('option');o.value=id;o.textContent=name;emissionSelect.append(o)})}
engineSelect.addEventListener('change',fillEmissions);fillEmissions();
function splitLines(v){return v.split(/\r?\n/).map(x=>x.trim()).filter(Boolean)}
function splitKeys(v){return v.split(',').map(x=>x.trim()).filter(Boolean)}
function validate(record,engineId,emission){
 const errors=[];
 if(globalFaultLibrary[record.code_id]||staged.faults[record.code_id])errors.push('Fault key already exists in the live or staged library.');
 if(!record.description)errors.push('Description is required.');
 if(!record.common_causes.length)errors.push('At least one common cause is required.');
 if(!record.diagnostic_steps.length)errors.push('At least one diagnostic step is required.');
 const engine=engines[engineId];
 if(!engine?.emission_levels?.[emission])errors.push('Selected engine/emissions tier is invalid.');
 const tools={...(faultCodeDatabase.tools||{}),...(staged.tools||{})};
 record.required_tools.forEach(id=>{if(!tools[id])errors.push('Unknown tool ID: '+id)});
 const knownCircuits=Object.keys(engine?.circuit_intersections||{});
 record.shared_circuits.forEach(id=>{if(!knownCircuits.includes(id))errors.push('Circuit not defined on '+engineId+': '+id)});
 return errors;
}
function refresh(){
 const records=Object.keys(staged.faults);const links=Object.values(staged.engine_manifests).reduce((n,a)=>n+a.length,0);
 $('countFaults').textContent=records.length;$('countLinks').textContent=links;
 let allErrors=0;queue.innerHTML='';
 records.forEach(id=>{const r=staged.faults[id];const el=document.createElement('div');el.className='item';const remove=document.createElement('button');remove.textContent='REMOVE';remove.onclick=()=>{delete staged.faults[id];Object.keys(staged.engine_manifests).forEach(k=>staged.engine_manifests[k]=staged.engine_manifests[k].filter(x=>x.code_id!==id));refresh()};const strong=document.createElement('strong');strong.textContent=id+' · '+r.description;const small=document.createElement('small');const engineNames=Object.entries(staged.engine_manifests).filter(([k,a])=>a.some(x=>x.code_id===id)).map(([k])=>engines[k]?.name||k);small.textContent=engineNames.join(', ');el.append(remove,strong,small);queue.append(el)});
 if(!records.length)queue.innerHTML='<div class="hint">No fault records staged yet. Build your first record.</div>';
 $('countErrors').textContent=allErrors;
}
$('faultForm').addEventListener('submit',e=>{e.preventDefault();
 const record={code_id:$('codeId').value.trim().toUpperCase(),spn:Number($('spn').value),fmi:Number($('fmi').value),p_code:$('pCode').value.trim()||'N/A',description:$('description').value.trim(),common_causes:splitLines($('causes').value),diagnostic_steps:splitLines($('steps').value),shared_circuits:splitKeys($('circuits').value),required_tools:splitKeys($('tools').value),source_note:$('source').value.trim()};
 const errors=validate(record,engineSelect.value,emissionSelect.value);
 const box=$('validation');if(errors.length){box.className='validation bad';box.textContent='RECORD REJECTED: '+errors.join(' ');$('countErrors').textContent=errors.length;return}
 staged.faults[record.code_id]=record;staged.engine_manifests[engineSelect.value]??=[];
 staged.engine_manifests[engineSelect.value].push({code_id:record.code_id,emission_level:emissionSelect.value});
 box.className='validation good';box.textContent='RECORD ACCEPTED: '+record.code_id+' staged and linked to '+engines[engineSelect.value].name+'.';
 $('faultForm').reset();engineSelect.value=Object.keys(engines)[0];fillEmissions();refresh();
});
$('resetBtn').onclick=()=>$('faultForm').reset();
$('clearQueue').onclick=()=>{if(confirm('Clear every staged record from this workbench?')){staged={version:1,faults:{},engine_manifests:{},tools:{}};refresh();$('validation').textContent='Staging queue cleared.'}};
$('exportBtn').onclick=()=>{
 const errors=[];Object.entries(staged.faults).forEach(([id,r])=>{if(!Object.values(staged.engine_manifests).some(a=>a.some(x=>x.code_id===id)))errors.push(id+' is not linked to an engine')});
 if(errors.length){$('validation').className='validation bad';$('validation').textContent='EXPORT BLOCKED: '+errors.join('; ');return}
 const blob=new Blob([JSON.stringify(staged,null,2)+'\n'],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='fault-overrides.json';a.click();URL.revokeObjectURL(url);
 $('validation').className='validation good';$('validation').textContent='EXPORT READY: Add fault-overrides.json to the repository at data/fault-overrides.json.';
};
$('importBtn').onclick=()=>$('importFile').click();
$('importFile').onchange=async e=>{const file=e.target.files[0];if(!file)return;try{const data=JSON.parse(await file.text());if(!data.faults||!data.engine_manifests)throw Error('Missing faults or engine_manifests');staged=data;refresh();$('validation').className='validation good';$('validation').textContent='Staging package imported.'}catch(err){$('validation').className='validation bad';$('validation').textContent='IMPORT FAILED: '+err.message}e.target.value=''};
refresh();