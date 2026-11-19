// Research-only inventory: distinguish files present from eligible historical races.
import {auditRacerHoldoutProvenance} from './audit-racer-holdout-provenance.mjs';
export function inventoryRacerHoldoutRecords(records){
 const report={totalRecords:0,eligibleRecords:0,rejectedRecords:0,missingReasons:{},uniqueEligibleRaces:0,readyForAccuracyResearch:false};
 const seen=new Set();
 for(const r of records??[]){
  report.totalRecords++;
  const audit=auditRacerHoldoutProvenance(r);
  const racers=r?.racers;
  const reasons=[...audit.issues];
  if(r?.preRaceSnapshotVerified!==true)reasons.push('pre_race_snapshot_unverified');
  if(!/^20\d{6}$/.test(String(r?.date??''))||!Number.isInteger(r?.venue)||r.venue<1||r.venue>24||!Number.isInteger(r?.race)||r.race<1||r.race>12)reasons.push('invalid_race_identity');
  if(!Array.isArray(racers)||racers.length!==6||new Set(racers.map(x=>x?.boat)).size!==6||
   new Set(racers.map(x=>x?.racerId)).size!==6||new Set(racers.map(x=>x?.finish)).size!==6||
   !racers.every(x=>Number.isInteger(x?.boat)&&x.boat>=1&&x.boat<=6&&/^\d{4}$/.test(String(x.racerId??''))&&Number.isInteger(x.finish)&&x.finish>=1&&x.finish<=6&&x.preRaceVerified===true&&
   ['racerWinRateAverage','preRaceStartAbility','expectedEntryCourse','motorPerformance','verifiedExhibitionAndWeather'].every(k=>typeof x[k]==='number'&&Number.isFinite(x[k])&&x[k]>=0&&x[k]<=1)))reasons.push('six_verified_scoring_factors_and_results_missing');
  const key=[r?.date,r?.venue,r?.race].join(':');
  if(seen.has(key))reasons.push('duplicate_race');
  if(reasons.length){report.rejectedRecords++;for(const reason of new Set(reasons))report.missingReasons[reason]=(report.missingReasons[reason]||0)+1;}
  else{seen.add(key);report.eligibleRecords++;}
 }
 report.uniqueEligibleRaces=seen.size;
 report.readyForAccuracyResearch=report.eligibleRecords>=100;
 report.warning='Eligibility is a structural audit only. Independent provenance verification is required before claiming historical prediction accuracy.';
 return report;
}
