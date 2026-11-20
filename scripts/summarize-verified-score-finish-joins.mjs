// Research-only descriptive comparison of already-verified pre-cutoff scores and official finishes.
// Do not infer a historical prediction or tune weights from rejected races.
import {verifyHistoricalRaceJoin} from './verify-historical-race-join.mjs';
export function summarizeVerifiedScoreFinishJoins(records){
 if(!Array.isArray(records))throw new TypeError('records_must_be_array');
 const races=[];const excludedReasons={};
 for(const record of records){
  const gate=verifyHistoricalRaceJoin(record);
  if(!gate.eligible){excludedReasons[gate.reason]=(excludedReasons[gate.reason]??0)+1;continue;}
  const ranked=[...record.scoreInputsByBoat].sort((a,b)=>b.score-a.score||a.boat-b.boat);
  const finishes=[...record.finishByBoat].sort((a,b)=>a.finish-b.finish);
  const rankByBoat=new Map(ranked.map((r,i)=>[r.boat,i+1]));
  races.push({date:record.expected.date,venue:record.expected.venue,race:record.expected.race,
   topScoreBoat:ranked[0].boat,actualFirstBoat:finishes[0].boat,
   topScoreFinishedFirst:ranked[0].boat===finishes[0].boat,
   predictedScoreOrder:ranked.map(r=>r.boat),officialFinishOrder:finishes.map(r=>r.boat),
   actualPodiumScoreRanks:finishes.slice(0,3).map(r=>rankByBoat.get(r.boat))});
 }
 return {total:records.length,eligible:races.length,excluded:records.length-races.length,
  excludedReasons,races,descriptiveTopScoreFirstCount:races.filter(r=>r.topScoreFinishedFirst).length,
  eligibleForWeightTuning:false,
  warning:'Descriptive only. Verification flags must be independently supported by archived source evidence; no retrospective score reconstruction.'};
}
