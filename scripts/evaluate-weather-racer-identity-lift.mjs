// Research-only: match the winning *racer*, not just boat or entry course.
// Requires a six-entry pre-cutoff racer roster and a separately sourced official winner.
import {evaluateSameDayWeatherLift} from './evaluate-same-day-weather-lift.mjs';
export function evaluateWeatherRacerIdentityLift(records,options={}){
 if(!Array.isArray(records))throw Error('records_must_be_array');
 const valid=[],excluded={};const reject=k=>excluded[k]=(excluded[k]??0)+1;
 for(const r of records){
  const roster=r?.preCutoffRacersByBoat;
  const rosterValid=Array.isArray(roster)&&roster.length===6&&
   roster.every((x,i)=>x?.boat===i+1&&/^\d{4}$/.test(String(x.racerId)))&&
   new Set(roster.map(x=>String(x.racerId))).size===6;
  if(!rosterValid||r?.rosterCapturedBeforeCutoff!==true||
   !/^\d{4}$/.test(String(r?.officialWinnerRacerId))||
   !Number.isInteger(r?.actualWinnerBoat)||r.actualWinnerBoat<1||r.actualWinnerBoat>6||
   String(roster[r.actualWinnerBoat-1].racerId)!==String(r.officialWinnerRacerId)){
   reject('racer_identity_or_roster_unverified');continue;
  }
  const base=roster[r.baseWinnerBoat-1],weather=roster[r.weatherWinnerBoat-1];
  if(!base||!weather||String(base.racerId)!==String(r.baseWinnerRacerId)||
   String(weather.racerId)!==String(r.weatherWinnerRacerId)){
   reject('predicted_racer_identity_mismatch');continue;
  }
  valid.push(r);
 }
 const comparison=evaluateSameDayWeatherLift(valid,options);
 return {...comparison,identityJoined:comparison.accepted,identityExcluded:excluded,
  status:comparison.status==='research_weather_lift_evaluated'?'research_racer_identity_weather_lift':comparison.status,
  eligibleForDeployment:false,
  warning:'Racer ID agreement is a necessary structural check, not independent authentication of official results, pre-cutoff roster, weather, or predictions.'};
}
