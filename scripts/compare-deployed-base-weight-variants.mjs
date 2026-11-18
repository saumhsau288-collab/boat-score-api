// Offline research only: compare actual deployed base ticket algorithm before/after
// a candidate weight change. Never claim adjusted-beforeinfo fidelity.
import {replayDeployedBaseTickets,DEPLOYED_BASE_WEIGHTS} from './replay-deployed-base-tickets.mjs';
const validWeights=w=>w&&Object.keys(DEPLOYED_BASE_WEIGHTS).every(k=>Number.isFinite(w[k])&&w[k]>=0)&&
 Math.abs(w.national+w.local+w.motor-10)<1e-9&&
 Math.abs(w.fallbackNational+w.fallbackMotor-10)<1e-9;
const validPodium=a=>Array.isArray(a)&&a.length===3&&new Set(a).size===3&&a.every(n=>Number.isInteger(n)&&n>=1&&n<=6);
const hit=(picks,actual)=>picks.some(p=>p.every((n,i)=>n===actual[i]));
export function compareDeployedBaseWeightVariants(rows,candidateWeights){
 if(!Array.isArray(rows)||!validWeights(candidateWeights))return {status:'invalid_input'};
 const summary={status:'evaluated',total:rows.length,eligible:0,excluded:[],baseline:{mainHits:0,upsetHits:0,eitherHits:0},candidate:{mainHits:0,upsetHits:0,eitherHits:0},races:[],baselineWeights:DEPLOYED_BASE_WEIGHTS,candidateWeights,
  productionChanged:false,warning:'Offline replay of deployed BASE scoring only. Requires independently verified pre-race stats and official finish order. No exhibition/start adjustment; no claims of live performance.'};
 for(const r of rows){
  const key={date:r?.date??null,venue:r?.venue??null,race:r?.race??null};
  const validEvidence=r?.independentlyVerifiedResult===true&&r?.historicalInputProvenanceVerified===true&&
   typeof r?.officialResultSourceUrl==='string'&&r.officialResultSourceUrl.startsWith('https://www.boatrace.jp/')&&
   typeof r?.historicalInputSourceUrl==='string'&&r.historicalInputSourceUrl.startsWith('https://www.boatrace.jp/')&&
   Number.isFinite(Date.parse(r?.historicalInputCapturedAt))&&Number.isFinite(Date.parse(r?.officialCutoffAt))&&
   Date.parse(r.historicalInputCapturedAt)<Date.parse(r.officialCutoffAt);
  const before=replayDeployedBaseTickets(r?.stats),after=replayDeployedBaseTickets(r?.stats,candidateWeights);
  if(!validEvidence||!validPodium(r?.actual)||!before.ready||!after.ready){
   summary.excluded.push({...key,reason:!validEvidence?'unverified_pre_race_or_result_evidence':!validPodium(r?.actual)?'invalid_official_podium':'invalid_six_boat_stats'});continue;
  }
  summary.eligible++;
  const record={...key,actual:r.actual,baseline:{main:before.main,upset:before.upset},candidate:{main:after.main,upset:after.upset}};
  for(const [name,prediction] of [['baseline',before],['candidate',after]]){
   const mainHit=hit(prediction.main,r.actual),upsetHit=hit(prediction.upset,r.actual);
   summary[name].mainHits+=Number(mainHit);summary[name].upsetHits+=Number(upsetHit);summary[name].eitherHits+=Number(mainHit||upsetHit);
   record[name].mainHit=mainHit;record[name].upsetHit=upsetHit;
  }
  summary.races.push(record);
 }
 return summary;
}
