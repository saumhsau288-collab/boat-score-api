// Research-only: inspect rankedScores structure without treating it as raw feature evidence.
export function auditArchivedRankedScores(archives){
 const out={readyResponses:0,rankedScoresArrays:0,sixUniqueBoats:0,finiteScoreRows:0,shapeKeys:{},sampleShapes:[],warning:'Aggregated rankedScores are not raw national/local/motor/recent50/ST features. Do not back-calculate missing features or claim historical accuracy.'};
 for(const archive of archives)for(const record of Array.isArray(archive?.records)?archive.records:[]){
  const p=record?.response;
  if(p?.ready!==true)continue;
  out.readyResponses++;
  const a=p.rankedScores;
  if(!Array.isArray(a))continue;
  out.rankedScoresArrays++;
  const keys=[...new Set(a.flatMap(x=>x&&typeof x==='object'&&!Array.isArray(x)?Object.keys(x):[]))].sort();
  for(const k of keys)out.shapeKeys[k]=(out.shapeKeys[k]??0)+1;
  if(out.sampleShapes.length<2)out.sampleShapes.push({date:archive?.date??null,recordCount:a.length,keys});
  const boats=a.map(x=>x?.boat);
  if(a.length===6&&new Set(boats).size===6&&boats.every(x=>Number.isInteger(x)&&x>=1&&x<=6)){
   out.sixUniqueBoats++;
   if(a.every(x=>typeof x.score==='number'&&Number.isFinite(x.score)))out.finiteScoreRows++;
  }
 }
 return out;
}
