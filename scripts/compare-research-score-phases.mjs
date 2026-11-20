// Read-only comparison of existing research morning and pre-start scoring formulas.
// Never treats boat number as confirmed entry course or claims deployed Worker parity.
import {morningRacerScore} from '../boat-score-2-morning.js';
import {evaluateRacer} from '../boat-score-2-scoring.js';
export function compareResearchScorePhases(racers){
 if(!Array.isArray(racers)||racers.length!==6||
   new Set(racers.map(r=>r?.boat)).size!==6||
   racers.some(r=>!Number.isInteger(r?.boat)||r.boat<1||r.boat>6))
  return {status:'held',reason:'six_distinct_boats_required'};
 const rows=racers.map(r=>{
  const morning=morningRacerScore(r),preStart=evaluateRacer(r);
  return {boat:r.boat,entryCourse:Number.isInteger(r.entryCourse)&&r.entryCourse>=1&&r.entryCourse<=6?r.entryCourse:null,
   morningScore:morning.status==='evaluated'?morning.score:null,
   preStartScore:preStart.status==='evaluated'?preStart.score:null,
   morningStatus:morning.status,preStartStatus:preStart.status};
 });
 return {status:'compared_research_formulas',rows,
  comparableRows:rows.filter(r=>r.morningScore!==null&&r.preStartScore!==null).length,
  warning:'Morning scores renormalize 95 weight points; pre-start scores use 100 including exhibition. Scores are not directly equivalent. Boat number is not verified entry course. Neither formula is the deployed Worker.'};
}
