// Collect official results for previously saved morning ranking candidates.
// Usage: node scripts/collect-morning-official-results.mjs YYYYMMDD
// Read-only network calls; no prediction recomputation and no KV modifications.
import fs from 'node:fs';
import {evaluateMorningRankingHistory,isCaptureOnMorningDate,isValidMorningCaptureTimestamp} from './evaluate-morning-ranking-history.mjs';
const date=process.argv[2];
if(!/^20\d{6}$/.test(date||''))throw Error('Usage: node scripts/collect-morning-official-results.mjs YYYYMMDD');
const base='https://boat-score-2-preview.saumh-sau-288.workers.dev';
async function getJson(url){
 const response=await fetch(url,{signal:AbortSignal.timeout(20000)});
 const data=await response.json();
 return {ok:response.ok,data};
}
const snapshotResponse=await getJson(base+'/api/morning/snapshot?date='+date);
if(!snapshotResponse.ok)throw Error('Saved snapshot unavailable: '+snapshotResponse.data.status);
const snapshot=snapshotResponse.data;
if(snapshot.date!==date||snapshot.status!=='completed'||snapshot.calibrationStatus!=='not_yet_calibrated')
 throw Error('Snapshot is not a completed, uncalibrated morning record');
// Preserve the unmodified morning snapshot for independent inspection even if validation fails.
const snapshotFile='morning-snapshot-'+date+'.json';
fs.writeFileSync(snapshotFile,JSON.stringify(snapshot,null,2)+'\n');
console.log('Original morning snapshot saved to '+snapshotFile);
// Validate every saved prediction BEFORE requesting dozens of official results.
// A mismatch must be exposed, not repaired using post-race information.
evaluateMorningRankingHistory(snapshot,[]);
console.log('Saved morning prediction structure validated before official-result collection');
const candidates=new Map(),legacyWithoutOrder=[],held=[],seenCandidateKeys=new Set();
for(const category of ['main','upset','chaos']){
 const picks=snapshot.categories?.[category];
 if(!Array.isArray(picks))throw Error('Missing ranking category '+category);
 for(const p of picks){
  if(p.date!==date||!Number.isInteger(p.venue)||!Number.isInteger(p.race))
   throw Error('Invalid ranked candidate');
  const key=p.venue+':'+p.race;
  if(seenCandidateKeys.has(key))
   throw Error('Duplicate ranked candidate');
  seenCandidateKeys.add(key);
  if(date>='20261123'&&!isCaptureOnMorningDate(p.capturedAt,date)){
   held.push({venue:p.venue,race:p.race,reason:'prediction_capture_timestamp_missing'});
   continue;
  }
  if(p.predictedOrder===undefined){
   legacyWithoutOrder.push({key,category,venue:p.venue,race:p.race,reason:'saved_prediction_order_missing'});
   continue;
  }
  // Do not spend official-result requests on a record that cannot prove pre-cutoff capture.
  if(!isValidMorningCaptureTimestamp(p.deadlineAt)){
   held.push({venue:p.venue,race:p.race,reason:'verified_deadline_missing'});
   continue;
  }
  if(!isValidMorningCaptureTimestamp(p.capturedAt)||Date.parse(p.capturedAt)>=Date.parse(p.deadlineAt)){
   held.push({venue:p.venue,race:p.race,reason:'prediction_not_before_deadline'});
   continue;
  }
  candidates.set(key,p);
 }
}
const results=[];
for(const p of candidates.values()){
 const url=base+'/api/official/result?date='+date+'&venue='+p.venue+'&race='+p.race;
 try{
  const {ok,data}=await getJson(url);
  if(ok&&data.verified===true&&data.date===date&&data.venue===p.venue&&data.race===p.race&&
     Array.isArray(data.finishOrder)&&data.finishOrder.length===6&&
     new Set(data.finishOrder).size===6&&data.finishOrder.every(n=>Number.isInteger(n)&&n>=1&&n<=6)){
   results.push({date,venue:p.venue,race:p.race,resultVerified:true,officialFinish:data.finishOrder,source:data.source});
  }else held.push({venue:p.venue,race:p.race,reason:data.reason||'result_unverified'});
 }catch(e){held.push({venue:p.venue,race:p.race,reason:'official_result_request_failed'});}
}
const summary=evaluateMorningRankingHistory(snapshot,results);
const output={date,snapshotUpdatedAt:snapshot.updatedAt,snapshotStatus:snapshot.status,
 collectedAt:new Date().toISOString(),officialResults:results,held,legacyWithoutOrder,summary,
 note:'Saved morning ranking comparison only. This is NOT a 12-method accuracy test.'};
const path='morning-official-comparison-'+date+'.json';
fs.writeFileSync(path,JSON.stringify(output,null,2)+'\n');
console.log(JSON.stringify({file:path,savedCandidates:candidates.size,verifiedOfficialResults:results.length,
 held:held.length,legacyWithoutOrder:legacyWithoutOrder.length,summary},null,2));
