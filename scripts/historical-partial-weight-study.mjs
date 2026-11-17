// Offline study for verified historical official metrics when recent50/exhibition are unavailable.
// No imputation, no post-race metrics, and no changes to deployed predictor.
import {validateOfficialMetrics} from '../boat-score-2-official-metrics.js';
const BASE=Object.freeze({nationalWinRate:45,localWinRate:25,motorTwoWinRate:15});
const KEYS=Object.keys(BASE),LIMITS={nationalWinRate:10,localWinRate:10,motorTwoWinRate:100};
export function validateHistoricalRow(row){
 if(!row||!/^20\d{6}$/.test(String(row.date))||!Number.isInteger(row.venue)||row.venue<1||row.venue>24||!Number.isInteger(row.race)||row.race<1||row.race>12||row.asOfVerified!==true||row.resultVerified!==true||!Array.isArray(row.finishOrder)||row.finishOrder.length!==6||new Set(row.finishOrder).size!==6||row.finishOrder.some(x=>!Number.isInteger(x)||x<1||x>6))return null;
 const v=validateOfficialMetrics(row.racers);
 if(!v.verified)return null;
 if(typeof row.asOf!=='string'||!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?(?:Z|[+-]\d\d:\d\d)$/.test(row.asOf))return null;
 const ts=Date.parse(row.asOf);
 if(!Number.isFinite(ts)||row.asOf.slice(0,10)!==String(row.date).replace(/^(\d{4})(\d{2})(\d{2})$/,'$1-$2-$3'))return null;
 // Explicitly require a proven pre-start capture, not a reconstructed current page.
 if(row.capturedBeforeStart!==true)return null;
 return {...row,racers:v.racers};
}
function score(r,w){return KEYS.reduce((s,k)=>s+r[k]/LIMITS[k]*w[k],0)/KEYS.reduce((s,k)=>s+w[k],0)}
function evaluate(rows,w){let hits=0,podium=0;for(const row of rows){const rank=[...row.racers].sort((a,b)=>score(b,w)-score(a,w)||a.boat-b.boat).map(x=>x.boat);hits+=Number(rank[0]===row.finishOrder[0]);podium+=Number(rank.slice(0,3).every(x=>row.finishOrder.slice(0,3).includes(x)))}return {races:rows.length,winnerHits:hits,podiumSetHits:podium,winnerRate:rows.length?hits/rows.length:null}}
export function studyHistoricalWeights(rows,{minTrain=30,minTest=15}={}){
 if(!Array.isArray(rows)||!Number.isInteger(minTrain)||minTrain<1||!Number.isInteger(minTest)||minTest<1)return {status:'invalid_input'};
 const valid=rows.map(validateHistoricalRow).filter(Boolean).sort((a,b)=>a.date.localeCompare(b.date)||a.venue-b.venue||a.race-b.race);
 const keys=valid.map(r=>r.date+':'+r.venue+':'+r.race);
 if(new Set(keys).size!==keys.length)return {status:'duplicate_races'};
 const dates=[...new Set(valid.map(r=>r.date))];
 let cut=-1;
 for(let i=1;i<dates.length;i++){const n=valid.filter(r=>r.date<dates[i]).length;if(n>=minTrain&&valid.length-n>=minTest)cut=i}
 if(cut<0)return {status:'insufficient_verified_historical_inputs',supplied:rows.length,eligible:valid.length,excluded:rows.length-valid.length,distinctDates:dates.length};
 const train=valid.filter(r=>r.date<dates[cut]),test=valid.filter(r=>r.date>=dates[cut]);
 const candidates=[BASE];
 for(const from of KEYS)for(const to of KEYS)if(from!==to)for(const d of [5,10])if(BASE[from]>=d)candidates.push({...BASE,[from]:BASE[from]-d,[to]:BASE[to]+d});
 const ranked=candidates.map(w=>({weights:w,train:evaluate(train,w)})).sort((a,b)=>b.train.winnerHits-a.train.winnerHits||b.train.podiumSetHits-a.train.podiumSetHits||KEYS.reduce((s,k)=>s+Math.abs(a.weights[k]-BASE[k]),0)-KEYS.reduce((s,k)=>s+Math.abs(b.weights[k]-BASE[k]),0));
 const selected=ranked[0];
 const baseTest=evaluate(test,BASE),candidateTest=evaluate(test,selected.weights);
 return {status:'evaluated',trainingDates:[dates[0],dates[cut-1]],testingDates:[dates[cut],dates.at(-1)],trainCount:train.length,testCount:test.length,baselineWeights:BASE,candidateWeights:selected.weights,baselineTrain:evaluate(train,BASE),candidateTrain:selected.train,baselineTest:baseTest,candidateTest,holdoutImproved:candidateTest.winnerHits>baseTest.winnerHits,scope:'three_official_metrics_only',warning:'NOT equivalent to deployed Boat Score 2 main/upset six-ticket prediction. Do not automatically deploy weights.'};
}
