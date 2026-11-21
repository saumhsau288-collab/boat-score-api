#!/usr/bin/env node
// Research-only evidence inventory. A matching race key is NOT proof of pre-race authenticity.
import fs from 'node:fs';
export function matchOfficialResultsToCaptures(results, captures) {
 if(!Array.isArray(results?.results)||!Array.isArray(captures?.records))throw Error('results_and_capture_records_required');
 const key=r=>[r?.date,r?.venue,r?.race].join(':');
 const validKey=r=>/^20\d{6}$/.test(String(r?.date))&&Number.isInteger(r?.venue)&&r.venue>=1&&r.venue<=24&&Number.isInteger(r?.race)&&r.race>=1&&r.race<=12;
 const limits={nationalWinRate:10,localWinRate:10,motorTwoWinRate:100,recent50WinRate:100,exhibitionScore:100};
 const fullFeatures=boats=>boats.every(b=>Object.entries(limits).every(([name,max])=>typeof b[name]==='number'&&Number.isFinite(b[name])&&b[name]>=0&&b[name]<=max));
 const byKey=new Map();
 for(const record of captures.records){
  const k=key(record);
  if(!validKey(record))continue;
  if(!byKey.has(k))byKey.set(k,[]);
  byKey.get(k).push(record);
 }
 const rows=results.results.map(r=>{
  const candidates=validKey(r)?(byKey.get(key(r))??[]):[];
  const complete=candidates.filter(c=>{
   const boats=c?.response?.scoreInputsByBoat;
   return Array.isArray(boats)&&boats.length===6&&new Set(boats.map(b=>b?.boat)).size===6&&
    boats.every(b=>Number.isInteger(b?.boat)&&b.boat>=1&&b.boat<=6);
  });
  const featureComplete=complete.filter(c=>fullFeatures(c.response.scoreInputsByBoat));
  const ready=candidates.filter(c=>c?.httpStatus===200&&c?.response?.ready===true);
  return {date:r.date,venue:r.venue,race:r.race,matchingCaptures:candidates.length,readyCaptures:ready.length,
   sixBoatCaptures:complete.length,completeFeatureCaptures:featureComplete.length,independentlyVerifiedPreRace:false,
   eligibleForCalibration:false};
 });
 return {totalOfficialResults:rows.length,withMatchingCapture:rows.filter(r=>r.matchingCaptures>0).length,
  withReadyCapture:rows.filter(r=>r.readyCaptures>0).length,
  withSixBoatCapture:rows.filter(r=>r.sixBoatCaptures>0).length,
  withCompleteFeatureCapture:rows.filter(r=>r.completeFeatureCaptures>0).length,
  eligibleForCalibration:0,rows,
  warning:'Race-key matching and six-boat completeness alone do not authenticate pre-race provenance or official cutoff.'};
}
if(process.argv[1]&&import.meta.url===new URL('file://'+process.argv[1]).href){
 const [resultsPath,capturesPath]=process.argv.slice(2);
 if(!resultsPath||!capturesPath)throw Error('Usage: node scripts/match-official-results-to-pre-race-captures.mjs results.json captures.json');
 console.log(JSON.stringify(matchOfficialResultsToCaptures(JSON.parse(fs.readFileSync(resultsPath,'utf8')),JSON.parse(fs.readFileSync(capturesPath,'utf8'))),null,2));
}
