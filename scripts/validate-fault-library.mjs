import { globalFaultLibrary, faultCodeDatabase } from '../js/database.js';
import additions from '../data/fault-overrides.json' with { type: 'json' };
const errors=[];
const faults=additions.faults||{};
const manifests=additions.engine_manifests||{};
const tools={...(faultCodeDatabase.tools||{}),...(additions.tools||{})};
for (const [id,record] of Object.entries(faults)) {
  if (globalFaultLibrary[id]) errors.push('Duplicate live fault key: '+id);
  if (!Number.isInteger(record.spn) || record.spn < 0) errors.push('Invalid SPN: '+id);
  if (!Number.isInteger(record.fmi) || record.fmi < 0 || record.fmi > 31) errors.push('Invalid FMI: '+id);
  if (!record.description?.trim() || !record.common_causes?.length || !record.diagnostic_steps?.length) errors.push('Incomplete fault record: '+id);
  for (const tool of record.required_tools||[]) if (!tools[tool]) errors.push('Unknown tool reference '+tool+' on '+id);
}
for (const [engineId,entries] of Object.entries(manifests)) {
  const engine=faultCodeDatabase.engines[engineId];
  if (!engine) { errors.push('Unknown engine: '+engineId); continue; }
  const seen=new Set();
  for (const item of entries) {
    const pair=item.code_id+'|'+item.emission_level;
    if(seen.has(pair)) errors.push('Duplicate engine manifest entry: '+pair);
    seen.add(pair);
    if (!faults[item.code_id] && !globalFaultLibrary[item.code_id]) errors.push('Manifest references missing fault: '+item.code_id);
    if (!engine.emission_levels?.[item.emission_level]) errors.push('Invalid emissions tier '+item.emission_level+' for '+engineId);
    const record=faults[item.code_id];
    if(record) for(const circuit of record.shared_circuits||[]) {
      if(!engine.circuit_intersections?.[circuit]) errors.push('Unknown circuit '+circuit+' for '+item.code_id+' on '+engineId);
    }
  }
}
for (const id of Object.keys(faults)) {
  if (!Object.values(manifests).some(entries=>entries.some(item=>item.code_id===id))) errors.push('Fault is not linked to an engine: '+id);
}
if(errors.length){console.error('FAULT LIBRARY VALIDATION FAILED');errors.forEach(e=>console.error(' - '+e));process.exit(1)}
console.log('FAULT LIBRARY VALIDATION PASSED');
