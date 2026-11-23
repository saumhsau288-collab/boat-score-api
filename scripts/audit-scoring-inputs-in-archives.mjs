// Research-only: inspect whether archived ready responses expose the six original
// pre-race scorer fields plus historical average ST. Never synthesize inputs.
export function auditScoringInputsInArchives(archives){
 const required=['nationalWinRate','localWinRate','motorTwoWinRate','recent50WinRate','exhibitionScore','avgStart'];
 const result={readyResponses:0,candidateSixBoatArrays:0,completeForComparison:0,missingByField:Object.fromEntries(required.map(k=>[k,0])),observedArrayFields:{},examples:[]};
 for(const archive of archives)for(const record of Array.isArray(archive?.records)?archive.records:[]){
  const response=record?.response;
  if(response?.ready!==true)continue;
  result.readyResponses++;
  const arrays=Object.entries(response).filter(([,v])=>Array.isArray(v)&&v.length===6);
  for(const [k] of arrays)result.observedArrayFields[k]=(result.observedArrayFields[k]??0)+1;
  // Only exact 'racers' array is accepted, not similarly shaped guesses.
  const racers=response.racers;
  if(!Array.isArray(racers)||racers.length!==6||new Set(racers.map(x=>x?.boat)).size!==6||!racers.every(x=>Number.isInteger(x?.boat)&&x.boat>=1&&x.boat<=6))continue;
  result.candidateSixBoatArrays++;
  const missing=required.filter(k=>!racers.every(x=>Number.isFinite(x?.[k])));
  if(missing.length===0)result.completeForComparison++;
  else for(const field of missing)result.missingByField[field]++;
  if(result.examples.length<3)result.examples.push({date:archive.date,venue:record.venue,race:record.race,missing});
 }
 return {...result,required,warning:'Only exact six-boat rac ers arrays with finite raw fields count. A response score is not evidence of its original feature inputs or pre-race provenance. No accuracy inferred.'.replace('rac ers','racers')};
}
