// Boat Score 2 isolated adapter for the existing /api/makulabo/heatmap response.
// No live Worker or published UI changes.
import {reconcileMakulaboHeatmap} from './boat-score-2-makulabo-heatmap-adapter.js';
import {annotateMakulaboFinishRows} from './boat-score-2-makulabo-finish-headers.js';
export function inspectMakulaboApiResponse(payload) {
  if (!payload || payload.status !== 'fetched')
    return {status:'unavailable',reason:'heatmap_fetch_not_confirmed',racers:[]};
  const official=payload.officialRacersInspection;
  if (official?.verified!==true || !Array.isArray(official.racers) || official.racers.length!==6)
    return {status:'unverified',reason:'official_six_not_verified',racers:[]};
  if (!Array.isArray(payload.heatmapRows) || payload.heatmapRows.length!==6)
    return {status:'unverified',reason:'heatmap_six_not_extracted',racers:[]};
  let rows=payload.heatmapRows;
  if (payload.finishTable) {
    const parsed=annotateMakulaboFinishRows(payload.finishTable.headers,payload.finishTable.rows);
    if(!parsed.verified)return {status:'unverified',reason:parsed.reason,racers:[]};
    // Match labelled source rows to existing identity-matched rows by boat and name.
    if(parsed.rows.length!==6 || parsed.rows.some(row=>{
      const original=rows.find(x=>x.boat===row.boat);
      return !original || original.name!==row.name ||
        !Array.isArray(original.counts) || original.counts.length!==6 ||
        original.counts.some((n,i)=>n!==row.counts[i]);
    }))return {status:'unverified',reason:'labelled_row_mismatch',racers:[]};
    rows=rows.map(row=>({...row,finishHeadersVerified:true}));
  }
  const result=reconcileMakulaboHeatmap(official.racers,rows);
  if (!result.verified)
    return {status:'unverified',reason:result.reason,racers:[]};
  return {status:'heatmap_matched',racers:result.racers,
    recent50Ready:false,warning:'Matched heatmap counts do not establish a verified 50-race win rate.'};
}
