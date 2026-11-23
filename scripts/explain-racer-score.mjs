// Research-only score component attribution; does not alter existing scores.
// Report shared national/local fallback explicitly rather than pretending two
// independent observations support the same weighted score.
import {SCORE_WEIGHTS,evaluateRacer} from '../boat-score-2-scoring.js';
const LIMITS={nationalWinRate:10,localWinRate:10,motorTwoWinRate:100,recent50WinRate:100,exhibitionScore:100};
export function explainRacerScore(racer){
 const evaluated=evaluateRacer(racer);
 if(evaluated.status!=='evaluated')return {...evaluated,components:null};
 const fallback=racer.localWinRate===0;
 const values={...racer,localWinRate:fallback?racer.nationalWinRate:racer.localWinRate};
 const components=Object.fromEntries(Object.entries(SCORE_WEIGHTS).map(([name,weight])=>
  [name,{value:values[name],weight,points:values[name]/LIMITS[name]*weight,
    source:name==='localWinRate'&&fallback?'national_fallback':'provided'}]));
 const rawTotal=Object.values(components).reduce((sum,x)=>sum+x.points,0);
 return {status:'evaluated',score:evaluated.score,rawTotal,components,
  correlatedNationalLocal:fallback,
  nationalDerivedPoints:components.nationalWinRate.points+(fallback?components.localWinRate.points:0),
  stIncluded:false,courseIncluded:false,
  warning:'Attribution only, not calibrated probability; score formula and weights unchanged.'};
}
