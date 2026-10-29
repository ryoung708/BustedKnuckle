import { globalFaultLibrary, faultCodeDatabase } from '../js/database.js';
import additions from '../data/fault-overrides.json' with { type: 'json' };
const errors=[];
for (const [id,record] of Object.entries(additions.faults||{})) {
  if (globalFaultLibrary[id]) errors.push('Duplicate live fault key: '+id);
  if (!record.description || !record.common_causes?.length || !record.diagnostic_steps?.length) errors.push('Incomplete fault record: '+id);
}
for (const [engineId,entries] of Object.entries(additions.engine_manifests||{})) {
  const engine=faultCodeDatabase.engines[engineId];
  if (!engine) { errors.push('Unknown engine: '+engineId); continue; }
  for (const item of entries) {
    if (!(additions.faults||{})[item.code_id] && !globalFaultLibrary[item.code_id]) errors.push('Manifest references missing fault: '+item.code_id);
    if (!engine.emission_levels?.[item.emission_level]) errors.push('Invalid emissions tier '+item.emission_level+' for '+engineId);
  }
}
for (const [id,record] of Object.entries(additions.faults||{})) {
  if (!Object.values(additions.engine_manifests||{}).some(entries=>entries.some(item=>item.code_id===id))) errors.push('Fault is not linked to an engine: '+id);
  for (const tool of record.required_tools||[]) if (!faultCodeDatabase.tools?.[tool] && !additions.tools?.[tool]) errors.push('Unknown tool reference '+tool+' on '+id);
}
if(errors.length){console.error('FAULT LIBRARY VALIDATION FAILED');errors.forEach(e=>console.error(' - '+e));process.exit(1)}
console.log('FAULT LIBRARY VALIDATION PASSED');
