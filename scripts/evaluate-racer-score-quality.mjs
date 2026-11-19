// Research-only evaluation of individual racer score quality.
// Finish positions are outcome labels for validation, never scoring inputs.
export function evaluateRacerScoreQuality(races){
 const report={eligibleRaces:0,eligibleRacers:0,rejectedRaces:0,topRatedWins:0,topRatedPodiums:0,topThreeRatedPodiumPlaces:0,pairwiseCorrect:0,pairwiseTotal:0,meanAbsoluteRankError:null};
 let errorSum=0;const seen=new Set();
 for(const race of races??[]){
  const key=[race?.date,race?.venue,race?.race].join(':');
  const rows=race?.racers;
  const valid=String(race?.date??'').match(/^20\d{6}$/)&&Number.isInteger(race?.venue)&&race.venue>=1&&race.venue<=24&&Number.isInteger(race?.race)&&race.race>=1&&race.race<=12&&race?.preRaceSnapshotVerified===true&&race?.resultIndependentlyVerified===true&&race?.chronologicalHoldout===true&&Array.isArray(rows)&&rows.length===6&&new Set(rows.map(r=>r?.boat)).size===6&&new Set(rows.map(r=>r?.racerId)).size===6&&new Set(rows.map(r=>r?.finish)).size===6&&rows.every(r=>Number.isInteger(r?.boat)&&r.boat>=1&&r.boat<=6&&/^\d{4}$/.test(String(r.racerId??''))&&Number.isFinite(r.score)&&r.score>=0&&r.score<=100&&Number.isInteger(r.finish)&&r.finish>=1&&r.finish<=6)&&!seen.has(key);
  if(!valid){report.rejectedRaces++;continue;}
  seen.add(key);
  const ranked=rows.slice().sort((a,b)=>b.score-a.score||a.boat-b.boat);
  report.eligibleRaces++;report.eligibleRacers+=6;
  report.topRatedWins+=Number(ranked[0].finish===1);
  report.topRatedPodiums+=Number(ranked[0].finish<=3);
  report.topThreeRatedPodiumPlaces+=ranked.slice(0,3).filter(r=>r.finish<=3).length;
  for(let i=0;i<6;i++){
   errorSum+=Math.abs(i+1-ranked[i].finish);
   for(let j=i+1;j<6;j++){report.pairwiseTotal++;report.pairwiseCorrect+=Number(ranked[i].finish<ranked[j].finish);}
  }
 }
 report.meanAbsoluteRankError=report.eligibleRacers?errorSum/report.eligibleRacers:null;
 report.pairwiseAccuracy=report.pairwiseTotal?report.pairwiseCorrect/report.pairwiseTotal:null;
 report.topThreePodiumOverlapRate=report.eligibleRaces?report.topThreeRatedPodiumPlaces/(3*report.eligibleRaces):null;
 report.researchOnly=true;report.note='Race finishes are used solely as outcome labels. No score weights are updated automatically.';
 return report;
}
