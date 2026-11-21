// Research-only: retrospective rank-versus-finish audit, no model calibration.
export function auditRankFinishWithOfficial({savedRecords=[],officialRaces=[],results=[]}={}){
 const key=x=>Number(x?.venue)+'-'+Number(x?.race);
 const officialByKey=new Map(officialRaces.map(x=>[key(x),x]));
 const resultByKey=new Map(results.filter(x=>x?.verified===true).map(x=>[key(x),x]));
 const rows=[];
 for(const record of savedRecords.filter(x=>x?.response?.ready===true&&!(Number(x.venue)===9&&Number(x.race)===6))){
  const k=key(record),official=officialByKey.get(k),result=resultByKey.get(k);
  const scores=record?.response?.rankedScores;
  if(!official?.comparison?.rows||official.comparison.rows.length!==6||
    !Array.isArray(result?.finishOrder)||result.finishOrder.length!==6||
    !Array.isArray(scores)||scores.length!==6){
   rows.push({venue:Number(record.venue),race:Number(record.race),status:'held_missing_join_data'});
   continue;
  }
  const ranked=scores.map((s,i)=>({boat:Number(s.boat??s.waku??s.lane??0),score:Number(s.score??s.totalScore??NaN),index:i}));
  if(new Set(ranked.map(x=>x.boat)).size!==6||ranked.some(x=>!Number.isInteger(x.boat)||x.boat<1||x.boat>6||!Number.isFinite(x.score))||
    new Set(result.finishOrder).size!==6||result.finishOrder.some(x=>!Number.isInteger(x)||x<1||x>6)){
   rows.push({venue:Number(record.venue),race:Number(record.race),status:'held_invalid_rank_or_finish'});
   continue;
  }
  ranked.sort((a,b)=>b.score-a.score||a.boat-b.boat);
  const boats=ranked.map((x,i)=>({boat:x.boat,scoreRank:i+1,actualFinish:result.finishOrder.indexOf(x.boat)+1,
    officialMetricsAvailable:official.comparison.rows.some(o=>o.boat===x.boat)}));
  rows.push({venue:Number(record.venue),race:Number(record.race),status:'retrospective_comparison_only',
    topScoreBoat:ranked[0].boat,topScoreActualFinish:boats[0].actualFinish,
    winnerScoreRank:boats.find(x=>x.actualFinish===1)?.scoreRank,boats});
 }
 return {status:'research_diagnostic',joinedCount:rows.filter(x=>x.status==='retrospective_comparison_only').length,
  rows,eligibleForCalibration:false,scoreChangeApplied:false};
}
