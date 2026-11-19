// Boat Score 2 research-only adapter. Does not modify deployed Worker.
// Makulabo heatmap is course-by-finishing-position data; a flattened six-number row
// lacks the course axis and cannot establish a course-specific finish rate.
import {matchRecent50Racers} from './boat-score-2-recent50-identity.js';
export function reconcileMakulaboHeatmap(official, heatmapRows) {
  if (!Array.isArray(heatmapRows) || heatmapRows.length !== 6)
    return {verified:false,reason:'six_heatmap_rows_required',racers:[]};
  const matched=matchRecent50Racers(official,heatmapRows);
  if (!matched.verified)
    return {verified:false,reason:matched.reason,racers:[],matches:matched.matches};
  const racers=[];
  for (const match of matched.matches) {
    const row=heatmapRows[match.recentIndex];
    const counts=row?.counts;
    if (!Array.isArray(counts)||counts.length!==6||counts.some(n=>!Number.isInteger(n)||n<0))
      return {verified:false,reason:'invalid_heatmap_counts',racers:[]};
    if (Number.isInteger(row.boat) && row.boat!==match.boat)
      return {verified:false,reason:'boat_conflict',racers:[]};
    const runs=counts.reduce((a,b)=>a+b,0);
    if (row.runs!==undefined && (!Number.isInteger(row.runs)||row.runs!==runs))
      return {verified:false,reason:'run_count_conflict',racers:[]};
    // The flag must be backed by the source parser's actual header check.
    const finishHeadersVerified=row.finishHeadersVerified===true;
    const rate=n=>runs>0?Math.round(n/runs*10000)/100:null;
    racers.push({boat:match.boat,racerId:official.find(r=>r.boat===match.boat).racerId,
      name:official.find(r=>r.boat===match.boat).name,counts:[...counts],runs,
      firstColumnShare:runs>0?Math.round(counts[0]/runs*10000)/100:null,
      firstPlaceRate:finishHeadersVerified?rate(counts[0]):null,
      top2Rate:finishHeadersVerified?rate(counts[0]+counts[1]):null,
      top3Rate:finishHeadersVerified?rate(counts[0]+counts[1]+counts[2]):null,
      finishHeadersVerified,courseFinishMatrixVerified:false,
      eligibleForCourseSpecificScoring:false,
      eligibleAsVerifiedRecent50:false});
  }
  return {verified:true,reason:null,racers,warning:'Finish rates require verified 1着–6着 column labels for each source row. Course-specific matrix and exactly 50 runs remain unverified; do not use these rates as course-specific evidence.'};
}
