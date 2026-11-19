// Boat Score 2: morning preliminary scores, no exhibition data required.
// Inputs are verified normalized metrics; this module does not fetch them.
// The morning score is distinct from the pre-start score.
const WEIGHTS=Object.freeze({nationalWinRate:45,localWinRate:25,motorTwoWinRate:15,recent50WinRate:10});
const MAX=Object.freeze({nationalWinRate:10,localWinRate:10,motorTwoWinRate:100,recent50WinRate:100});
export function morningRacerScore(racer){
  racer = racer && racer.localWinRate === 0 && Number.isFinite(racer.nationalWinRate) ? {...racer,localWinRate:racer.nationalWinRate} : racer;
  const keys=Object.keys(WEIGHTS);
  const missing=keys.filter(k=>!Number.isFinite(racer?.[k]));
  if(missing.length)return {status:'insufficient_data',score:null,missing};
  const invalid=keys.filter(k=>racer[k]<0||racer[k]>MAX[k]);
  if(invalid.length)return {status:'invalid_data',score:null,invalid};
  const total=keys.reduce((s,k)=>s+racer[k]/MAX[k]*WEIGHTS[k],0);
  return {status:'evaluated',score:Math.round(total/95*10000)/100,phase:'morning',calibrated:false};
}
export function morningRaceScore(racers){
  if(!Array.isArray(racers)||racers.length!==6||
    new Set(racers.map(r=>r.boat)).size!==6||
    racers.some(r=>!Number.isInteger(r.boat)||r.boat<1||r.boat>6))
    return {status:'invalid_race',racers:[]};
  const results=racers.map(r=>({boat:r.boat,...morningRacerScore(r)}));
  if(results.some(r=>r.status!=='evaluated'))
    return {status:'insufficient_data',racers:results};
  const ranked=[...results].sort((a,b)=>b.score-a.score||a.boat-b.boat);
  const gap=Math.round((ranked[0].score-ranked[1].score)*100)/100;
  const inside=results.find(r=>r.boat===1);
  const category=ranked[0].boat===1&&gap>=12?'favorite':
    ranked[0].boat!==1&&ranked[0].score-inside.score>=12?'upset_candidate':'uncertain';
  return {status:'evaluated',phase:'morning',category,ranked,scoreGap:gap,calibrated:false};
}
export function morningShortlists(races,limit=20){
  if(!Array.isArray(races)||!Number.isInteger(limit)||limit<1||limit>100)
    return {status:'invalid_input'};
  const evaluated=races.map(r=>({venue:r.venue,date:r.date,race:r.race,...morningRaceScore(r.racers)}));
  const valid=evaluated.filter(r=>r.status==='evaluated');
  const order=(a,b)=>b.scoreGap-a.scoreGap||String(a.venue).localeCompare(String(b.venue))||Number(a.race)-Number(b.race);
  return {status:'evaluated',total:races.length,eligible:valid.length,excluded:races.length-valid.length,
    favorites:valid.filter(r=>r.category==='favorite').sort(order).slice(0,limit),
    upsets:valid.filter(r=>r.category==='upset_candidate').sort(order).slice(0,limit),
    uncertain:valid.filter(r=>r.category==='uncertain').sort((a,b)=>-order(a,b)).slice(0,limit)};
}
