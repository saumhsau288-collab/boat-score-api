// Adapt retained deployed Boat Score 2 capture records into research-only
// snapshots. Requires externally verified per-race cutoff timestamps.
// Never treats workflow timestamps as independent proof of pre-race forecasts.
import {prepareCaptureFromApiResponse} from './prepare-capture-from-api-response.mjs';
export function prepareSnapshotsFromMorningCapture(capture, cutoffByRace) {
 if(!Array.isArray(capture?.records) || !cutoffByRace || typeof cutoffByRace!=='object')
  return {status:'invalid_input'};
 const snapshots=[],excluded=[];
 for(const row of capture.records){
  const key=[row?.date,row?.venue,row?.race].join(':');
  const cutoffAt=cutoffByRace[key];
  if(row?.httpStatus!==200 || row?.response?.ready!==true){
   excluded.push({key,reason:'not_ready'});continue;
  }
  if(typeof cutoffAt!=='string'){
   excluded.push({key,reason:'missing_verified_cutoff'});continue;
  }
  if(typeof row.receivedAt!=='string' || typeof row.requestedAt!=='string' ||
     !Number.isFinite(Date.parse(row.receivedAt)) ||
     !Number.isFinite(Date.parse(row.requestedAt)) ||
     Date.parse(row.requestedAt)>Date.parse(row.receivedAt)){
   excluded.push({key,reason:'invalid_capture_interval'});continue;
  }
  const result=prepareCaptureFromApiResponse({
   selection:{date:row.date,venue:row.venue,race:row.race},
   response:row.response,cutoffAt,capturedAt:row.receivedAt,
   scoreInputs:row.response?.scoreInputsByBoat??null
  });
  if(result.status==='prepared_not_authenticated')
   snapshots.push({...result.snapshot,sourceResponseSha256:row.responseSha256??null,
    captureRunId:capture.run?.workflowRunId??null});
  else excluded.push({key,reason:result.status});
 }
 return {status:'prepared_not_authenticated',snapshots,excluded,
  warning:'Cutoff mapping must be independently verified. These snapshots are NOT authenticated forecasts and cannot enter hit-rate audit without independent evidence.'};
}
