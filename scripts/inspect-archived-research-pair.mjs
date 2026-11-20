// Research-only diagnostic for archived official + Makulabo snapshots.
// It cannot turn finish-count samples into authenticated recent-50 or historical predictions.
import fs from 'node:fs';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
export function inspectArchivedResearchPair(official,makulabo){
 const racers=official?.racers;
 const sample=makulabo?.finishSample?.racers;
 const missing=[];
 const sixOfficial=Array.isArray(racers)&&racers.length===6&&racers.every((r,i)=>r.boat===i+1&&r.sourceVerified===true&&/^\\d{4}$/.test(String(r.racerId??'')))&&new Set(racers.map(r=>String(r.racerId))).size===6;
 if(!sixOfficial)missing.push('six_verified_official_racer_identities');
 if(!Array.isArray(sample)||sample.length!==6)missing.push('six_makulabo_sample_rows');
 const rows=Array.from({length:6},(_,i)=>{
  const o=Array.isArray(racers)?racers.find(v=>v.boat===i+1):null;
  const m=Array.isArray(sample)?sample.find(v=>v.boat===i+1):null;
  const countsValid=!!m&&Number.isInteger(m.runs)&&m.runs>0&&m.runs<=50&&Array.isArray(m.finishCounts)&&m.finishCounts.length===6&&m.finishCounts.every(n=>Number.isInteger(n)&&n>=0)&&m.finishCounts.reduce((a,b)=>a+b,0)===m.runs;
  return {boat:i+1,officialRacerId:o?.racerId??null,officialName:o?.name??null,sourceName:m?.sourceName??null,
   sourceRacerId:m?.sourceRacerId??null,sampleRuns:m?.runs??null,countsValid,
   exactly50:countsValid&&m.runs===50,sourceIdentityVerified:!!m&&m.sourceVerified===true&&String(m.sourceRacerId??'')===String(o?.racerId??''),
   officialEntryCourseVerified:o?.entryCourseVerified===true,
   recent50Verified:o?.recent50Verified===true,
   startTimingVerified:Number.isFinite(o?.startTiming),exhibitionVerified:Number.isFinite(o?.exhibitionTime)};
 });
 if(rows.some(r=>!r.countsValid))missing.push('valid_makulabo_finish_counts');
 if(rows.some(r=>!r.exactly50))missing.push('six_exactly50_sample_rows');
 if(rows.some(r=>!r.sourceIdentityVerified))missing.push('six_independently_verified_makulabo_registration_ids');
 if(makulabo?.identityReview?.verified!==true||makulabo?.status==='held')missing.push('makulabo_identity_review');
 if(rows.some(r=>!r.officialEntryCourseVerified))missing.push('six_verified_entry_courses');
 if(rows.some(r=>!r.recent50Verified))missing.push('six_verified_pre_race_recent50');
 if(rows.some(r=>!r.startTimingVerified))missing.push('six_verified_start_timing');
 if(rows.some(r=>!r.exhibitionVerified))missing.push('six_verified_exhibition_times');
 if(official?.preRaceIndependentlyVerified!==true)missing.push('independently_verified_pre_race_capture');
 // No stored scoring event or official finishing order is supplied in these snapshots.
 missing.push('authenticated_pre_cutoff_score_snapshot','six_verified_official_finish_positions');
 return {race:{date:official?.date??null,venue:official?.venue??null,race:official?.race??null},
  officialSixVerified:sixOfficial,sampleRuns:rows.map(r=>r.sampleRuns),rows,missing,
  eligibleForHistoricalAccuracy:false,eligibleForWeightTuning:false,
  note:'Archived finish counts are not authenticated recent-50, and missing score/result evidence must not be reconstructed.'};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 if(process.argv.length<4)throw Error('Usage: node scripts/inspect-archived-research-pair.mjs official.json makulabo.json');
 const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
 console.log(JSON.stringify(inspectArchivedResearchPair(read(process.argv[2]),read(process.argv[3])),null,2));
}
