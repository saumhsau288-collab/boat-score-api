// Research-only: retrospective rank-versus-finish audit, no model calibration.
export function auditRankFinishWithOfficial({savedRecords=[],officialRaces=[],results=[]}={}){
 const dateOf=x=>{const d=String(x?.date??x?.raceDate??x?.hd??'').replaceAll('-','');return /^20\d{6}$/.test(d)?d:null;};
 const key=x=>dateOf(x)?dateOf(x)+'-'+Number(x?.venue)+'-'+Number(x?.race):null;
 const uniqueMap=items=>{const map=new Map(),duplicates=new Set();for(const x of items){const k=key(x);if(!k)continue;if(map.has(k))duplicates.add(k);else map.set(k,x);}for(const k of duplicates)map.delete(k);return map;};
 const officialByKey=uniqueMap(officialRaces);
 const resultByKey=uniqueMap(results.filter(x=>x?.verified===true));
 const rows=[];
 for(const record of savedRecords.filter(x=>x?.response?.ready===true&&!(Number(x.venue)===9&&Number(x.race)===6))){
  const k=key(record),official=k?officialByKey.get(k):null,result=k?resultByKey.get(k):null;
  const scores=record?.response?.rankedScores;
  if(!official?.comparison?.rows||official.comparison.rows.length!==6||
    !Array.isArray(result?.finishOrder)||result.finishOrder.length!==6||
    !Array.isArray(scores)||scores.length!==6){
   rows.push({date:dateOf(record),venue:Number(record.venue),race:Number(record.race),status:k?'held_missing_join_data':'held_missing_date'});
   continue;
  }
  const ranked=scores.map((s,i)=>({boat:Number(s.boat??s.waku??s.lane??0),score:Number(s.score??s.totalScore??NaN),index:i}));
  if(new Set(ranked.map(x=>x.boat)).size!==6||ranked.some(x=>!Number.isInteger(x.boat)||x.boat<1||x.boat>6||!Number.isFinite(x.score))||
    new Set(result.finishOrder).size!==6||result.finishOrder.some(x=>!Number.isInteger(x)||x<1||x>6)){
   rows.push({date:dateOf(record),venue:Number(record.venue),race:Number(record.race),status:'held_invalid_rank_or_finish'});
   continue;
  }
  ranked.sort((a,b)=>b.score-a.score||a.boat-b.boat);
  const boats=ranked.map((x,i)=>({boat:x.boat,scoreRank:i+1,actualFinish:result.finishOrder.indexOf(x.boat)+1,
    officialMetricsAvailable:official.comparison.rows.some(o=>o.boat===x.boat)}));
  rows.push({date:dateOf(record),venue:Number(record.venue),race:Number(record.race),status:'retrospective_comparison_only',
    topScoreBoat:ranked[0].boat,topScoreActualFinish:boats[0].actualFinish,
    winnerScoreRank:boats.find(x=>x.actualFinish===1)?.scoreRank,boats});
 }
 return {status:'research_diagnostic',joinedCount:rows.filter(x=>x.status==='retrospective_comparison_only').length,
  rows,eligibleForCalibration:false,scoreChangeApplied:false};
}
