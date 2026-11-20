// Boat Score 2: connect verified official metrics to the morning evaluator.
// Recent-50 results must be separately verified and matched by racer ID.
import {validateOfficialMetrics} from './boat-score-2-official-metrics.js';
import {morningRaceScore} from './boat-score-2-morning.js';
export function evaluateMorningFromSources({official, recent50}={}){
 const checked=validateOfficialMetrics(official);
 if(!checked.verified)return {status:'insufficient_data',source:'official',reason:checked.reason};
 if(!Array.isArray(recent50)||recent50.length!==6)
   return {status:'insufficient_data',source:'recent50',reason:'six_racers_required'};
 const byId=new Map();
 for(const item of recent50){
   const id=String(item?.racerId??'');
   if(!/^\d{4}$/.test(id)||byId.has(id)||item?.verified!==true||item?.sourceVerified!==true||
      typeof item.winRate!=='number'||!Number.isFinite(item.winRate)||
      item.winRate<0||item.winRate>100)
     return {status:'insufficient_data',source:'recent50',reason:'unverified_or_invalid'};
   byId.set(id,item.winRate);
 }
 if(checked.racers.some(r=>!byId.has(r.racerId)))
   return {status:'insufficient_data',source:'recent50',reason:'racer_id_mismatch'};
 const racers=checked.racers.map(r=>({
   boat:r.boat,nationalWinRate:r.nationalWinRate,
   localWinRate:r.localWinRate,motorTwoWinRate:r.motorTwoWinRate,
   recent50WinRate:byId.get(r.racerId)
 }));
 return {...morningRaceScore(racers),sources:['official_racelist','verified_recent50']};
}
