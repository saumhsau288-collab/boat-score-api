// Conservative uncertainty bounds for incomplete offline score evidence.
// Unknown inputs can contribute anywhere from 0 to their full assigned weight.
import {partialScoreEvidence} from './partial-score-evidence.mjs';
export function scoreUncertaintyBounds(racers){
 const partial=partialScoreEvidence(racers);
 if(partial.status==='invalid_race')return {...partial,scoreBounds:null};
 const invalid=partial.rows.some(r=>r.invalid.length);
 if(invalid)return {...partial,status:'invalid_inputs',scoreBounds:null,
   guaranteedAbove:[],guaranteedBelow:[],rankingVerified:false};
 const scoreBounds=partial.rows.map(r=>({
  boat:r.boat,lower:r.observedSubtotal,
  upper:Math.min(100,Math.round((r.observedSubtotal+100-r.observedMaximum)*100)/100),
  unknownMaximum:100-r.observedMaximum,
  missing:r.missing
 }));
 const guaranteedAbove=[],guaranteedBelow=[];
 for(const a of scoreBounds)for(const b of scoreBounds){
  if(a.boat===b.boat)continue;
  if(a.lower>b.upper){
   guaranteedAbove.push({boat:a.boat,aboveBoat:b.boat});
   guaranteedBelow.push({boat:b.boat,belowBoat:a.boat});
  }
 }
 const full=scoreBounds.every(r=>r.unknownMaximum===0);
 return {...partial,scoreBounds,guaranteedAbove,guaranteedBelow,
  rankingVerified:full,fullScoreRank:full?partial.partialRank:null,
  uncertaintyWarning:'Bounds use the independent research 100-point scoring model, not the deployed Worker. Unknown inputs may reverse partial ordering; a bound is not a prediction or accuracy estimate.'};
}
