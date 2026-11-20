// Offline batch summary of verified descriptive score-vs-finish audits.
// Does not interpret retrospective research scores as pre-race predictions.
import {diagnoseResearchScoreFinishGap} from './diagnose-research-score-finish-gap.mjs';
export function summarizeResearchFinishGaps(cases){
 if(!Array.isArray(cases))return {status:'held',reason:'cases_array_required'};
 const seen=new Set(),rows=[],held=[];
 for(const [index,item] of cases.entries()){
  const s=item?.snapshot;
  const key=s?[String(s.date),String(s.venue),String(s.race)].join(':'):null;
  if(!key||seen.has(key)){held.push({index,reason:key?'duplicate_race':'missing_race_identity'});continue;}
  seen.add(key);
  const r=diagnoseResearchScoreFinishGap(s,item.recent50,item.officialResult,item.courseMapping);
  if(r.status!=='descriptive_gap_diagnosis'){held.push({index,key,reason:r.reason||'unverified_inputs'});continue;}
  rows.push({key,underperformed:r.groups.underperformed.map(x=>({boat:x.boat,entryCourse:x.entryCourse,scoreRank:x.scoreRank,finishPosition:x.finishPosition})),
   outperformed:r.groups.outperformed.map(x=>({boat:x.boat,entryCourse:x.entryCourse,scoreRank:x.scoreRank,finishPosition:x.finishPosition}))});
 }
 const underperformed=rows.reduce((n,r)=>n+r.underperformed.length,0);
 const outperformed=rows.reduce((n,r)=>n+r.outperformed.length,0);
 return {status:'descriptive_batch_summary',submitted:cases.length,compared:rows.length,held:held.length,
  underperformedCount:underperformed,outperformedCount:outperformed,rows,heldRows:held,
  eligibleForCalibration:false,authenticatedHistoricalPredictions:0,
  warning:'Descriptive retrospective ranking only. No hit-rate, causal attribution or weight optimization without independently authenticated pre-race evidence.'};
}
