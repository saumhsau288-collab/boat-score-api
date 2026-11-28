// Research-only read-only collection of an existing morning ranking snapshot.
// Does NOT create six-racer 12-method evidence or assert historical accuracy.
import fs from 'node:fs';
import {pathToFileURL} from 'node:url';
export const DEFAULT_PREVIEW='https://boat-score-2-preview.saumh-sau-288.workers.dev';
export function summarizeMorningRankingSnapshot(snapshot,date){
 const reasons=[];
 if(snapshot?.date!==date)reasons.push('date_mismatch');
 if(snapshot?.status!=='completed')reasons.push('snapshot_not_completed');
 const categories={};
 for(const name of ['main','upset','chaos']){
  const rows=snapshot?.categories?.[name];
  if(!Array.isArray(rows)){reasons.push('missing_'+name+'_category');categories[name]=null;continue;}
  categories[name]={count:rows.length,provisionalCount:rows.filter(x=>x?.status==='provisional_not_calibrated').length,
   withSixRacerEvidence:rows.filter(x=>Array.isArray(x?.racers)&&x.racers.length===6).length,
   withTwelveMethodPredictions:rows.filter(x=>x?.prediction?.methods&&Object.keys(x.prediction.methods).length===12).length,
   withPredictedOrder:rows.filter(x=>Array.isArray(x?.predictedOrder)).length,
   withCaptureTime:rows.filter(x=>typeof x?.capturedAt==='string').length,
   withDeadline:rows.filter(x=>typeof x?.deadlineAt==='string').length};
 }
 return {date,status:snapshot?.status??null,categories,reasons,
  eligibleForTwelveMethodAccuracy:0,
  note:'Existing morning rankings are not saved 12-method pre-race six-racer predictions.'};
}
export async function fetchMorningRankingSnapshot(date,{base=DEFAULT_PREVIEW,fetchImpl=fetch}={}){
 if(!/^20\d{6}$/.test(date))throw Error('Expected YYYYMMDD');
 const url=new URL('/api/morning/snapshot',base);
 url.searchParams.set('date',date);
 const response=await fetchImpl(url.toString(),{signal:AbortSignal.timeout(20000)});
 if(!response.ok)throw Error('Morning snapshot HTTP '+response.status);
 const snapshot=await response.json();
 return {snapshot,summary:summarizeMorningRankingSnapshot(snapshot,date)};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const date=process.argv[2],out=process.argv[3];
 if(!out)throw Error('Usage: node scripts/fetch-readonly-morning-ranking-snapshot.mjs YYYYMMDD output.json');
 const result=await fetchMorningRankingSnapshot(date);
 // Exclusive creation: never silently overwrite prior captured evidence.
 fs.writeFileSync(out,JSON.stringify({...result,collectedAt:new Date().toISOString()},null,2)+'\n',{flag:'wx'});
 console.log(JSON.stringify({file:out,...result.summary},null,2));
}
