// Offline experiment only. No production import.
// Values: official national/local win rates 0..10; start timing in seconds.
// Course is actual entry course, not boat number.
const clamp=(x,min,max)=>Math.max(min,Math.min(max,x));
export function experimentalRacerScore(r){
  if(!r || !Number.isFinite(r.nationalWinRate) || !Number.isFinite(r.localWinRate) ||
     !Number.isFinite(r.averageStartTiming) || !Number.isInteger(r.entryCourse) ||
     r.nationalWinRate<0 || r.nationalWinRate>10 || r.localWinRate<0 || r.localWinRate>10 ||
     r.averageStartTiming<0 || r.averageStartTiming>0.5 || r.entryCourse<1 || r.entryCourse>6)
    return {status:'insufficient_or_invalid_data',score:null};
  // Arithmetic mean, not sum, of the two official win-rate measures.
  const winRateMean=(r.nationalWinRate+r.localWinRate)/2;
  const ability=winRateMean/10*70;
  // Faster historical average start is better. This is not race-day exhibition ST.
  const start=clamp((0.30-r.averageStartTiming)/0.30,0,1)*20;
  const course=[10,8,6,4,2,0][r.entryCourse-1];
  return {status:'evaluated',score:Math.round((ability+start+course)*100)/100,
    components:{winRateMean,ability,start,course}};
}
export function experimentalRaceRanking(racers){
 if(!Array.isArray(racers)||racers.length!==6||
    new Set(racers.map(r=>r.boat)).size!==6||
    racers.some(r=>!Number.isInteger(r.boat)||r.boat<1||r.boat>6))
    return {status:'invalid_race'};
 const scored=racers.map(r=>({boat:r.boat,...experimentalRacerScore(r)}));
 if(scored.some(r=>r.status!=='evaluated'))return {status:'insufficient_data',scored};
 return {status:'evaluated',ranked:scored.sort((a,b)=>b.score-a.score||a.boat-b.boat)};
}
