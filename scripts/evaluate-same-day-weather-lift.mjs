// Research-only chronological comparison of base vs same-day-weather candidate.
// Each row must be a pre-cutoff prediction, matched to an independently verified official winner.
// Never treat this as deployment authorization.
export function evaluateSameDayWeatherLift(rows,{minimumTrain=100,minimumHoldout=30}={}){
 if(!Array.isArray(rows)||!Number.isInteger(minimumTrain)||minimumTrain<1||
  !Number.isInteger(minimumHoldout)||minimumHoldout<1)throw Error('invalid_input');
 const excluded={};const reject=k=>excluded[k]=(excluded[k]??0)+1;
 const accepted=[],seen=new Set();
 for(const r of rows){
  const key=[r?.date,String(r?.venue).padStart(2,'0'),r?.race].join('|');
  if(!/^\d{8}$/.test(String(r?.date))||!/^(0[1-9]|1\d|2[0-4])$/.test(String(r?.venue).padStart(2,'0'))||
   !Number.isInteger(r?.race)||r.race<1||r.race>12||r.verified!==true||
   !Number.isInteger(r.actualWinnerBoat)||r.actualWinnerBoat<1||r.actualWinnerBoat>6||
   !Number.isInteger(r.baseWinnerBoat)||r.baseWinnerBoat<1||r.baseWinnerBoat>6||
   !Number.isInteger(r.weatherWinnerBoat)||r.weatherWinnerBoat<1||r.weatherWinnerBoat>6||
   !Number.isFinite(Date.parse(r.cutoffAt))||!Number.isFinite(Date.parse(r.basePredictedAt))||
   !Number.isFinite(Date.parse(r.weatherPredictedAt))||
   Date.parse(r.basePredictedAt)>=Date.parse(r.cutoffAt)||
   Date.parse(r.weatherPredictedAt)>=Date.parse(r.cutoffAt)||
   r.weatherEvidenceVerified!==true||r.priorRacesOnlyVerified!==true){
   reject('invalid_or_unverified_cutoff_join');continue;
  }
  if(seen.has(key)){reject('duplicate_race');continue;}
  seen.add(key);accepted.push(r);
 }
 accepted.sort((a,b)=>a.date.localeCompare(b.date)||a.venue.localeCompare(b.venue)||a.race-b.race);
 // Whole-day holdout prevents correlated races from the same date crossing the split.
 const days=[...new Set(accepted.map(r=>r.date))];
 let split=-1;
 for(let i=1;i<days.length;i++){
  const train=accepted.filter(r=>r.date<days[i]).length;
  if(train>=minimumTrain&&accepted.length-train>=minimumHoldout){split=i;break;}
 }
 const summary=part=>({races:part.length,baseWins:part.filter(r=>r.baseWinnerBoat===r.actualWinnerBoat).length,
  weatherWins:part.filter(r=>r.weatherWinnerBoat===r.actualWinnerBoat).length,
  baseWinRate:part.length?part.filter(r=>r.baseWinnerBoat===r.actualWinnerBoat).length/part.length:null,
  weatherWinRate:part.length?part.filter(r=>r.weatherWinnerBoat===r.actualWinnerBoat).length/part.length:null});
 const train=split<0?[]:accepted.filter(r=>r.date<days[split]);
 const holdout=split<0?[]:accepted.filter(r=>r.date>=days[split]);
 const trainSummary=summary(train),holdoutSummary=summary(holdout);
 return {status:split<0?'insufficient_verified_history':'research_weather_lift_evaluated',
  accepted:accepted.length,excluded,train:trainSummary,holdout:holdoutSummary,
  holdoutWinRateLift:holdout.length?holdoutSummary.weatherWinRate-holdoutSummary.baseWinRate:null,
  extraSixPicks:[],eligibleForDeployment:false,
  warning:'This comparison requires independently authenticated pre-cutoff forecasts and official results; verified booleans alone are not proof. Additional six-pick combinations require separate evaluation.'};
}
