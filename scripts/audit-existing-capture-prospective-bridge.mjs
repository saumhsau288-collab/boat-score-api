// Research-only bridge for existing deployed prediction captures.
// The existing API response is not an authenticated official pre-race snapshot.
import {prepareStrictProspectiveSnapshot} from './prepare-strict-prospective-snapshot.mjs';
export function inspectExistingCaptureForProspectiveReview(row){
 const base={date:row?.date,venue:row?.venue,race:row?.race,receivedAt:row?.receivedAt};
 const boats=row?.response?.scoreInputsByBoat;
 if(!Array.isArray(boats)||boats.length!==6)return {...base,readyForReview:false,reason:'missing_six_score_inputs',admitted:false};
 if(typeof row?.officialCutoffAt!=='string')return {...base,readyForReview:false,reason:'missing_official_cutoff',admitted:false};
 // API scoreInputsByBoat is not the raw racer form and may omit average ST.
 const racers=boats.map(b=>({boat:b.boat,nationalWinRate:b.nationalWinRate,averageStartTiming:b.averageStartTiming}));
 let reviewed;
 try{reviewed=prepareStrictProspectiveSnapshot({venue:row.venue,date:row.date,race:row.race,sourceUrl:'https://boat-score-2-preview.saumh-sau-288.workers.dev/api/predict/selected-race',capturedAt:row.receivedAt,scheduledStartAt:row.officialCutoffAt,racers});}
 catch(e){return {...base,readyForReview:false,reason:'invalid_timing_or_identity',details:String(e.message),admitted:false};}
 return {...base,readyForReview:reviewed.readyForReview,reason:reviewed.readyForReview?'requires_independent_source_review':'missing_required_raw_features',errors:reviewed.errors,admitted:false};
}
export function auditExistingCaptureProspectiveBridge(capture){
 if(!Array.isArray(capture?.records))throw new TypeError('capture records required');
 const rows=capture.records.map(inspectExistingCaptureForProspectiveReview);
 return {total:rows.length,readyForReview:rows.filter(r=>r.readyForReview).length,admitted:0,rows,warning:'Existing prediction API response and self-reported cutoff do not authenticate official pre-race source or justify historical calibration.'};
}
