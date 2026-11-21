import {validatePreRaceSnapshot} from './audit-snapshot-timing.mjs';
// Construct a prospective record only from explicitly timestamped inputs.
// This does not fetch data and does not attest that the source is authentic.
export function buildProspectiveRaceRecord({venue,date,race,source,capturedAt,scheduledStartAt,racers}){
 const timing=validatePreRaceSnapshot({source,capturedAt,scheduledStartAt});
 if(!timing.valid)throw new Error('invalid snapshot timing: '+timing.reason);
 if(typeof venue!=='string'||!venue.trim()||!/^20\d{6}$/.test(String(date))||!Number.isInteger(race)||race<1||race>12)throw new Error('invalid race identity');
 if(!Array.isArray(racers)||racers.length!==6||new Set(racers.map(x=>x?.boat)).size!==6||!racers.every(x=>Number.isInteger(x?.boat)&&x.boat>=1&&x.boat<=6))throw new Error('six distinct boat records required');
 const normalized=racers.map(r=>({boat:r.boat,nationalWinRate:Number.isFinite(r.nationalWinRate)&&r.nationalWinRate>=0?r.nationalWinRate:null,averageStartTiming:Number.isFinite(r.averageStartTiming)&&r.averageStartTiming>=0?r.averageStartTiming:null,motorTwoRate:Number.isFinite(r.motorTwoRate)&&r.motorTwoRate>=0?r.motorTwoRate:null,exhibitionTime:Number.isFinite(r.exhibitionTime)&&r.exhibitionTime>=0?r.exhibitionTime:null}));
 return {schemaVersion:1,venue,date:String(date),race,preRaceSnapshot:{source,capturedAt,scheduledStartAt},racers:normalized,sourceVerified:false,warning:'Capture time alone is not source verification; keep unknown values null, never infer them.'};
}
