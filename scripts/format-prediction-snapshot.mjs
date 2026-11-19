// Research-only immutable prediction record formatter.
// This module does not schedule or persist anything and must not be used as proof of capture.
import {validatePreCutoffSnapshot} from './validate-precutoff-snapshot.mjs';
import {classifyPredictionPhase} from './classify-prediction-phase.mjs';
export function formatPredictionSnapshot(input){
 const eligibility=validatePreCutoffSnapshot(input);
 const phase=classifyPredictionPhase(input);
 const picks=input?.prediction?.mainSix;
 const validPicks=Array.isArray(picks)&&picks.length===6&&picks.every(p=>Array.isArray(p)&&p.length===3&&new Set(p).size===3&&p.every(n=>Number.isInteger(n)&&n>=1&&n<=6))&&new Set(picks.map(p=>p.join('-'))).size===6;
 const errors=[...eligibility.errors,...(phase.phase?[]:[phase.reason]),...(validPicks?[]:['invalid_main_six'])];
 if(errors.length)return {accepted:false,errors,record:null};
 const record={schemaVersion:1,date:input.date,venue:input.venue,race:input.race,phase:phase.phase,capturedAt:input.capturedAt,cutoffAt:input.cutoffAt,source:input.source,captureProvenance:input.captureProvenance,racers:input.racers.map(r=>({boat:r.boat,racerId:r.racerId})),prediction:{mainSix:picks.map(p=>[...p])}};
 return {accepted:true,errors:[],record};
}
