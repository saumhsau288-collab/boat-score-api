// Boat Score 2: conservative pre-race classification.
// No invented race probabilities or betting recommendations.
// Scores are comparative indices, not calibrated win probabilities.
import {evaluateRace} from './boat-score-2-scoring.js';
export function classifyRace(racers) {
  const result=evaluateRace(racers);
  if(result.status!=='evaluated') return {...result,category:'unrated',reason:'missing_or_invalid_inputs'};
  const ranked=[...result.racers].sort((a,b)=>b.score-a.score||a.boat-b.boat);
  const leader=ranked[0],runnerUp=ranked[1];
  const inside=result.racers.find(r=>r.boat===1);
  const gap=Number((leader.score-runnerUp.score).toFixed(2));
  const insideGap=Number((inside.score-runnerUp.score).toFixed(2));
  // Heuristic labels only; historical calibration is required before production use.
  const category=leader.boat===1&&gap>=12?'favorite':
    leader.boat!==1&&leader.score-inside.score>=12?'upset_candidate':'uncertain';
  return {status:'evaluated',category,leaderBoat:leader.boat,
    scoreGap:gap,insideScore:inside.score,insideGap,
    ranked:ranked.map(r=>({boat:r.boat,score:r.score})),
    calibrated:false,reason:'heuristic_not_validated'};
}
export function summarizeDay(races,limit=20) {
  if(!Array.isArray(races)) return {status:'invalid_input'};
  const scored=races.map(r=>({
    venue:r.venue,date:r.date,race:r.race,
    ...classifyRace(r.racers)
  }));
  const eligible=scored.filter(r=>r.status==='evaluated');
  const sort=(arr,descending=true)=>arr.sort((a,b)=>
    (descending?b.scoreGap-a.scoreGap:a.scoreGap-b.scoreGap)||
    String(a.venue).localeCompare(String(b.venue))||
    Number(a.race)-Number(b.race)).slice(0,limit);
  return {status:'evaluated',total:races.length,eligible:eligible.length,
    excluded:races.length-eligible.length,
    favorites:sort(eligible.filter(r=>r.category==='favorite')),
    upsets:sort(eligible.filter(r=>r.category==='upset_candidate')),
    uncertain:sort(eligible.filter(r=>r.category==='uncertain'),false)};
}
