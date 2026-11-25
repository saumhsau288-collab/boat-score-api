// Read-only completeness audit of existing six-boat score inputs.
// Missing fields are unknown, not zero. No source authenticity claims.
export function auditCaptureRacerFields(capture){
 if(!capture||!Array.isArray(capture.records)||capture.authenticatedBeforeRace!==false)throw Error('invalid_capture_provenance');
 const fields={nationalWinRate:[0,10],averageStartTiming:[0,1],localWinRate:[0,10],motorTwoWinRate:[0,100],recent50WinRate:[0,100],exhibitionScore:[0,100]};
 const counts=Object.fromEntries(Object.keys(fields).map(k=>[k,{validBoats:0,completeRaces:0}]));
 let ready=0,sixBoatInputs=0,allFieldsComplete=0;
 for(const row of capture.records){
  if(row?.response?.ready!==true)continue;
  ready++;
  const boats=row.response.scoreInputsByBoat;
  if(!Array.isArray(boats)||boats.length!==6||new Set(boats.map(b=>b?.boat)).size!==6||!boats.every(b=>Number.isInteger(b?.boat)&&b.boat>=1&&b.boat<=6))continue;
  sixBoatInputs++;
  let all=true;
  for(const [key,[min,max]] of Object.entries(fields)){
   const valid=boats.filter(b=>typeof b[key]==='number'&&Number.isFinite(b[key])&&b[key]>=min&&b[key]<=max).length;
   counts[key].validBoats+=valid;
   if(valid===6)counts[key].completeRaces++;else all=false;
  }
  if(all)allFieldsComplete++;
 }
 return {readyPredictions:ready,withSixBoatInputs:sixBoatInputs,allFieldsComplete,fields:counts,verifiedPreRace:0,warning:'API response field availability only. No pre-race authentication, no accuracy estimate, and no score changes.'};
}
