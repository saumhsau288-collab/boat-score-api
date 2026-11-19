// Boat Score 2 isolated adapter for the existing /api/makulabo/heatmap response.
// No live Worker or published UI changes.
import {reconcileMakulaboHeatmap} from './boat-score-2-makulabo-heatmap-adapter.js';
export function inspectMakulaboApiResponse(payload) {
  if (!payload || payload.status !== 'fetched')
    return {status:'unavailable',reason:'heatmap_fetch_not_confirmed',racers:[]};
  const official=payload.officialRacersInspection;
  if (official?.verified!==true || !Array.isArray(official.racers) || official.racers.length!==6)
    return {status:'unverified',reason:'official_six_not_verified',racers:[]};
  if (!Array.isArray(payload.heatmapRows) || payload.heatmapRows.length!==6)
    return {status:'unverified',reason:'heatmap_six_not_extracted',racers:[]};
  const result=reconcileMakulaboHeatmap(official.racers,payload.heatmapRows);
  if (!result.verified)
    return {status:'unverified',reason:result.reason,racers:[]};
  return {status:'heatmap_matched',racers:result.racers,
    recent50Ready:false,warning:'Matched heatmap counts do not establish a verified 50-race win rate.'};
}
