// Research-only chronological holdout comparison for individual racer ratings.
import {compareRacerWeightScenarios} from './compare-racer-weight-scenarios.mjs';
import {evaluateRacerScoreQuality} from './evaluate-racer-score-quality.mjs';
import {auditRacerHoldoutProvenance} from './audit-racer-holdout-provenance.mjs';
export function compareRacerScenariosOnHoldout(races,candidates=[]){
 const seen=new Set(),accepted=[],rejected=[];
 for(const race of races??[]){
  const key=[race?.date,race?.venue,race?.race].join(':');
  const racers=race?.racers;
  const eligible=auditRacerHoldoutProvenance(race).eligible&&/^20\d{6}$/.test(String(race?.date??''))&&Number.isInteger(race?.venue)&&race.venue>=1&&race.venue<=24&&Number.isInteger(race?.race)&&race.race>=1&&race.race<=12&&
   race?.preRaceSnapshotVerified===true&&race?.resultIndependentlyVerified===true&&race?.chronologicalHoldout===true&&Array.isArray(racers)&&racers.length===6&&
   new Set(racers.map(r=>r?.boat)).size===6&&new Set(racers.map(r=>r?.racerId)).size===6&&new Set(racers.map(r=>r?.finish)).size===6&&
   racers.every(r=>Number.isInteger(r?.boat)&&r.boat>=1&&r.boat<=6&&/^\d{4}$/.test(String(r.racerId??''))&&Number.isInteger(r.finish)&&r.finish>=1&&r.finish<=6)&&!seen.has(key);
  if(!eligible){rejected.push(key);continue;}
  const comparison=compareRacerWeightScenarios(racers,candidates);
  if(!comparison.ready){rejected.push(key);continue;}
  seen.add(key);
  const makeRace=ranked=>({...race,racers:ranked.map(r=>({...r,racerId:racers.find(x=>x.boat===r.boat).racerId,finish:racers.find(x=>x.boat===r.boat).finish}))});
  accepted.push({baseline:makeRace(comparison.baseline.rankedScores),scenarios:comparison.scenarios.map(s=>({id:s.id,race:makeRace(s.rankedScores)}))});
 }
 const baseline=evaluateRacerScoreQuality(accepted.map(x=>x.baseline));
 const scenarios=(candidates??[]).map(c=>({id:c.id,weights:{...c.weights},quality:evaluateRacerScoreQuality(accepted.map(x=>x.scenarios.find(s=>s.id===c.id).race))}));
 return {researchOnly:true,eligibleForDeployment:false,eligibleRaces:accepted.length,rejectedRaces:rejected.length,baseline,scenarios,
  warning:'Synthetic tests do not establish predictive improvement. Verified, timestamped pre-race inputs and independent outcomes are required; do not automatically change production weights.'};
}
