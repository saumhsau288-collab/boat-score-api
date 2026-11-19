// Offline-only calibration experiment. Does not change deployed predictions.
// Input: historical pre-race snapshots + verified finish orders, ordered by date.
// Never use result-day post-race measurements as features.
export const BASE_WEIGHTS=Object.freeze({nationalWinRate:45,localWinRate:25,motorTwoWinRate:15,recent50WinRate:10,exhibitionScore:5});
const LIMITS={nationalWinRate:10,localWinRate:10,motorTwoWinRate:100,recent50WinRate:100,exhibitionScore:100};
const KEYS=Object.keys(BASE_WEIGHTS);
const validWeights=w=>w&&KEYS.every(k=>Number.isFinite(w[k])&&w[k]>=0)&&Math.abs(KEYS.reduce((s,k)=>s+w[k],0)-100)<1e-8;
export function scoreRacer(r,w=BASE_WEIGHTS){
 r = r && r.localWinRate === 0 && Number.isFinite(r.nationalWinRate) ? {...r,localWinRate:r.nationalWinRate} : r;
 if(!validWeights(w))return null;
 if(!r||KEYS.some(k=>!Number.isFinite(r[k])||r[k]<0||r[k]>LIMITS[k]))return null;
 return KEYS.reduce((s,k)=>s+r[k]/LIMITS[k]*w[k],0);
}
export function evaluateSnapshot(row,w=BASE_WEIGHTS){
 if(!row||!/^20\d{6}$/.test(String(row.date))||!Number.isInteger(row.venue)||row.venue<1||row.venue>24||!Number.isInteger(row.race)||row.race<1||row.race>12||row.preRaceSnapshot!==true||row.resultVerified!==true||!Array.isArray(row.racers)||row.racers.length!==6||!Array.isArray(row.finishOrder)||row.finishOrder.length!==6)return null;
 const boats=row.racers.map(r=>r.boat),finish=row.finishOrder;
 if(new Set(boats).size!==6||new Set(finish).size!==6||[...boats,...finish].some(n=>!Number.isInteger(n)||n<1||n>6))return null;
 const ranked=row.racers.map(r=>({boat:r.boat,score:scoreRacer(r,w)}));
 if(ranked.some(r=>r.score===null))return null;
 ranked.sort((a,b)=>b.score-a.score||a.boat-b.boat);
 return {winnerHit:ranked[0].boat===finish[0],podiumSetHit:ranked.slice(0,3).every(r=>finish.slice(0,3).includes(r.boat)),ranked:ranked.map(r=>r.boat)};
}
export function metrics(rows,w){
 const eligible=rows.map(r=>evaluateSnapshot(r,w)).filter(Boolean);
 return {total:rows.length,eligible:eligible.length,excluded:rows.length-eligible.length,winnerHits:eligible.filter(r=>r.winnerHit).length,podiumSetHits:eligible.filter(r=>r.podiumSetHit).length,winnerRate:eligible.length?eligible.filter(r=>r.winnerHit).length/eligible.length:null,podiumSetRate:eligible.length?eligible.filter(r=>r.podiumSetHit).length/eligible.length:null};
}
export function calibrate(rows,{minTrain=30,minTest=15}={}){
 if(!Array.isArray(rows)||!Number.isInteger(minTrain)||!Number.isInteger(minTest)||minTrain<1||minTest<1)return {status:'invalid_input'};
 const eligible=rows.filter(r=>evaluateSnapshot(r,BASE_WEIGHTS)!==null).sort((a,b)=>String(a.date).localeCompare(String(b.date))||a.venue-b.venue||a.race-b.race);
 const unique=new Set(eligible.map(r=>r.date+':'+r.venue+':'+r.race));
 if(unique.size!==eligible.length)return {status:'duplicate_races'};
 const dates=[...new Set(eligible.map(r=>r.date))];
 // Split on whole dates to prevent same-day leakage.
 let split=-1;
 for(let i=1;i<dates.length;i++){const n=eligible.filter(r=>r.date<dates[i]).length;if(n>=minTrain&&eligible.length-n>=minTest)split=i}
 if(split<0)return {status:'insufficient_history',eligible:eligible.length,distinctDates:dates.length,minTrain,minTest};
 const testStart=dates[split],train=eligible.filter(r=>r.date<testStart),test=eligible.filter(r=>r.date>=testStart);
 const candidates=[BASE_WEIGHTS];
 // Modest, interpretable pairwise shifts only; avoid unconstrained fitting.
 for(const from of KEYS)for(const to of KEYS)if(from!==to)for(const delta of [5,10]){
  if(BASE_WEIGHTS[from]<delta)continue;
  const w={...BASE_WEIGHTS,[from]:BASE_WEIGHTS[from]-delta,[to]:BASE_WEIGHTS[to]+delta};
  candidates.push(w);
 }
 const baselineTrain=metrics(train,BASE_WEIGHTS),baselineTest=metrics(test,BASE_WEIGHTS);
 const ranked=candidates.map(w=>({weights:w,train:metrics(train,w)})).sort((a,b)=>b.train.winnerHits-a.train.winnerHits||b.train.podiumSetHits-a.train.podiumSetHits||KEYS.reduce((s,k)=>s+Math.abs(a.weights[k]-BASE_WEIGHTS[k]),0)-KEYS.reduce((s,k)=>s+Math.abs(b.weights[k]-BASE_WEIGHTS[k]),0));
 const chosen=ranked[0],candidateTest=metrics(test,chosen.weights);
 return {status:'evaluated',trainDates:[dates[0],dates[split-1]],testDates:[testStart,dates.at(-1)],trainCount:train.length,testCount:test.length,baselineWeights:BASE_WEIGHTS,candidateWeights:chosen.weights,baselineTrain,baselineTest,candidateTrain:chosen.train,candidateTest,improvedOnHoldout:candidateTest.winnerHits>baselineTest.winnerHits,warning:'Offline score-ranking experiment only. Does not measure existing Boat Score 2 main/upset six-ticket accuracy or prove live improvement.'};
}
