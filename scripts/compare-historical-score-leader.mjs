// Offline comparison only. Accepts historical score snapshots, not post-race re-scores.
// Missing evidence must remain excluded from any claimed accuracy.
import fs from 'node:fs';
import {splitScoreLeaderTickets,compareScoreLeaderTickets} from './score-leader-favorite-upset.mjs';
const dateOK=s=>typeof s==='string'&&/^20\d{6}$/.test(s)&&!Number.isNaN(Date.parse(s.slice(0,4)+'-'+s.slice(4,6)+'-'+s.slice(6,8)));
export function compareHistoricalScoreLeaderRaces(input){
 if(!Array.isArray(input?.races))throw Error('Expected races array');
 const seen=new Set();
 const rows=input.races.map(r=>{
  const id=[r?.date,r?.venue,r?.race].join(':');
  const validIdentity=dateOK(r?.date)&&Number.isInteger(r?.venue)&&r.venue>=1&&r.venue<=24&&Number.isInteger(r?.race)&&r.race>=1&&r.race<=12;
  if(validIdentity&&seen.has(id))return {date:r.date,venue:r.venue,race:r.race,status:'held',holdReasons:['duplicate_race'],eligibleForAccuracy:false};
  if(validIdentity)seen.add(id);
  const hold=[];
  if(!validIdentity)hold.push('invalid_race_identity');
  if(r?.preRaceSnapshotVerified!==true)hold.push('pre_race_snapshot_not_verified');
  if(r?.officialResultVerified!==true)hold.push('official_result_not_verified');
  if(r?.scoreMethodVerified!==true)hold.push('score_method_not_verified');
  const prediction=splitScoreLeaderTickets(r?.scores);
  if(!prediction.ready)hold.push('missing_or_invalid_scores');
  const podium=r?.actualPodium;
  const compare=compareScoreLeaderTickets(prediction,podium);
  if(compare.status==='not_comparable')hold.push('invalid_actual_podium');
  return {date:r?.date??null,venue:r?.venue??null,race:r?.race??null,
   status:hold.length?'held':'evidence_ready',holdReasons:hold,
   leaderBoat:prediction.ready?prediction.leaderBoat:null,
   main:prediction.ready?prediction.main:null,
   upset:prediction.ready?prediction.upset:null,
   actualPodium:Array.isArray(podium)?podium:null,
   mainExact:compare.status==='research_only'?compare.mainExact:null,
   upsetExact:compare.status==='research_only'?compare.upsetExact:null,
   leaderWon:compare.status==='research_only'?compare.leaderWon:null,
   leaderPodium:compare.status==='research_only'?compare.leaderPodium:null,
   eligibleForAccuracy:hold.length===0,
   eligibleForScoreChange:false};
 });
 const eligible=rows.filter(r=>r.eligibleForAccuracy);
 return {method:'offline_historical_score_leader_favorite_upset',rows,
  totals:{reviewed:rows.length,evidenceReady:eligible.length,held:rows.length-eligible.length,
   evidenceReadyMainExact:eligible.filter(r=>r.mainExact).length,
   evidenceReadyUpsetExact:eligible.filter(r=>r.upsetExact).length},
  productionChanged:false,scoreWeightsChanged:false,eligibleForScoreChange:false,
  warning:'Only independently verified pre-race score snapshots and official results can be counted. Held rows are diagnostics, not accuracy evidence.'};
}
if(process.argv[1]&&new URL(import.meta.url).pathname===process.argv[1]){
 const [input,output]=process.argv.slice(2);
 if(!input||!output)throw Error('Usage: node scripts/compare-historical-score-leader.mjs <input.json> <output.json>');
 const report=compareHistoricalScoreLeaderRaces(JSON.parse(fs.readFileSync(input,'utf8')));
 fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify(report.totals));
}
