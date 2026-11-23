// Research-only paired comparison of old ability rating vs ST/course-adjusted rating.
// Uses the same pre-race rows. Never calls these ranks an accuracy measurement.
import {evaluateRace} from '../boat-score-2-scoring.js';
import {evaluateRaceWithStartAndCourse} from './evaluate-race-start-course-research.mjs';
const order=rows=>rows.slice().sort((a,b)=>b.score-a.score||a.boat-b.boat).map(x=>x.boat);
export function compareAbilityAndStartCourse(racers,options){
 const old=evaluateRace(racers);
 const updated=evaluateRaceWithStartAndCourse(racers,options);
 if(old.status!=='evaluated'||updated.status!=='evaluated')return {status:'excluded',oldStatus:old.status,newStatus:updated.status,warning:'No missing scores or starts may be inferred.'};
 const baseline=order(old.racers);
 const adjusted=updated.racers.map(x=>x.boat);
 return {status:'compared',baselineRanking:baseline,adjustedRanking:adjusted,topRankChanged:baseline[0]!==adjusted[0],topThreeMembershipChanged:baseline.slice(0,3).slice().sort().join(',')!==adjusted.slice(0,3).slice().sort().join(','),warning:'Ranking disagreement is not a hit rate. Historical verified outcomes and cutoff provenance are required for accuracy.'};
}
