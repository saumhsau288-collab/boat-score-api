// Research-only stage-aware completeness of six ORIGINAL racer records.
// Does not authenticate provenance or infer fields from ranked scores.
const limits={nationalWinRate:10,localWinRate:10,motorTwoWinRate:100,recent50WinRate:100,exhibitionScore:100,averageStartTiming:1,exhibitionStartTiming:1};
export function inspectSixRacerStage(rows,stage='morning'){
 if(!['morning','pre_cutoff'].includes(stage))throw Error('Invalid capture stage');
 const missing={};const invalid={};
 if(!Array.isArray(rows)||rows.length!==6)return {stage,status:'missing_six_racers',complete:false,missing:{six_racers_required:1},invalid,authenticated:false};
 const boats=new Set(),ids=new Set(),courses=new Set();
 const fields=stage==='morning'?['nationalWinRate','localWinRate','motorTwoWinRate','recent50WinRate','averageStartTiming']:Object.keys(limits);
 for(const r of rows){
  if(!Number.isInteger(r?.boat)||r.boat<1||r.boat>6||boats.has(r.boat))invalid.boat=(invalid.boat||0)+1;else boats.add(r.boat);
  if(typeof r?.racerId!=='string'&&!Number.isInteger(r?.racerId)||!String(r?.racerId??'').trim()||ids.has(String(r.racerId)))invalid.racerId=(invalid.racerId||0)+1;else ids.add(String(r.racerId));
  // Morning entry course may not be independently verified; do not require it.
  if(stage==='pre_cutoff'){
   if(!Number.isInteger(r?.course)||r.course<1||r.course>6||courses.has(r.course))invalid.course=(invalid.course||0)+1;else courses.add(r.course);
  }
  for(const field of fields){
   const v=r?.[field];
   if(v===null||v===undefined){missing[field]=(missing[field]||0)+1;continue;}
   if(typeof v!=='number'||!Number.isFinite(v)||v<0||v>limits[field])invalid[field]=(invalid[field]||0)+1;
  }
 }
 const complete=Object.keys(missing).length===0&&Object.keys(invalid).length===0;
 return {stage,status:complete?'complete_unverified':'incomplete',complete,missing,invalid,authenticated:false,
  warning:'Field completeness is not proof of provenance, pre-race timing, official cutoff or prediction accuracy.'};
}
