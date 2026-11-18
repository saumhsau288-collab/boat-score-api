// Offline partial-score evidence. Never equate this with a full 100-point or deployed score.
import {SCORE_WEIGHTS} from '../boat-score-2-scoring.js';
const limits={nationalWinRate:10,localWinRate:10,motorTwoWinRate:100,recent50WinRate:100,exhibitionScore:100};
export function partialScoreEvidence(racers){
 if(!Array.isArray(racers)||racers.length!==6||new Set(racers.map(r=>r?.boat)).size!==6||
 racers.some(r=>!Number.isInteger(r?.boat)||r.boat<1||r.boat>6))return {status:'invalid_race'};
 const fields=Object.keys(SCORE_WEIGHTS);
 const rows=racers.map(r=>{
  const present=[],missing=[],invalid=[];
  let subtotal=0,possible=0;
  for(const k of fields){
   const v=r[k];
   if(v===undefined||v===null){missing.push(k);continue;}
   if(typeof v!=='number'||!Number.isFinite(v)||v<0||v>limits[k]){invalid.push(k);continue;}
   present.push(k);possible+=SCORE_WEIGHTS[k];subtotal+=v/limits[k]*SCORE_WEIGHTS[k];
  }
  return {boat:r.boat,observedSubtotal:Math.round(subtotal*100)/100,
    observedMaximum:possible,missing,invalid,complete:missing.length===0&&invalid.length===0};
 });
 const comparable=rows.every(r=>r.invalid.length===0)&&rows.every(r=>r.observedMaximum===rows[0].observedMaximum)&&
 rows.every(r=>fields.filter(k=>!r.missing.includes(k)).join('|')===fields.filter(k=>!rows[0].missing.includes(k)).join('|'));
 const rank=comparable?[...rows].sort((a,b)=>b.observedSubtotal-a.observedSubtotal||a.boat-b.boat).map(r=>r.boat):null;
 return {status:rows.every(r=>r.complete)?'full_inputs_available':comparable?'partial_comparison_only':'incomparable_input_coverage',
  rows,partialRank:rank,full100PointRankingPermitted:rows.every(r=>r.complete)&&comparable,
  deployedPredictionVerified:false,preRaceAuthenticated:false,accuracyCalculationPermitted:false,
  productionChanged:false,
  warning:'A partial subtotal is NOT a 100-point score. Missing data are never zero. Archived/post-race data cannot be treated as authenticated pre-race evidence. Ranking omits course and winning-method effects.'};
}
