// Research-only deterministic sealed draft. Does not authenticate provenance,
// save to KV, call live APIs, or claim historical predictive performance.
import {createHash} from 'node:crypto';
import {METHOD_VERSION,generateTwelveIndependentMethods} from '../generate-twelve-independent-methods.mjs';
import {bridgeRacerEvidenceToMethodGate} from './bridge-racer-evidence-to-method-gate.mjs';
export function sealIndependentPredictionDraft(snapshot) {
 if(snapshot?.ready!==true || !Array.isArray(snapshot.racers) || snapshot.racers.length!==6)
   return {saved:false,reason:'incomplete_racer_snapshot'};
 const required=['nationalWinRate','localWinRate','averageST','motorSecondPlaceRate','exhibitionTime','last50Score'];
 if(snapshot.scoringReady!==true || snapshot.racers.some(r=>r?.missing?.length || !r?.values ||
   required.some(k=>typeof r.values[k]!=='number'||!Number.isFinite(r.values[k]))))
   return {saved:false,reason:'incomplete_six_racer_features'};
 const courses=snapshot.racers.map(r=>r?.values?.expectedEntryCourse);
 if(courses.some(x=>!Number.isInteger(x)||x<1||x>6)||new Set(courses).size!==6)
   return {saved:false,reason:'unverified_entry_courses'};
 const racers=snapshot.racers.map(r=>({
  boat:r.boat,course:r.values?.expectedEntryCourse,
  nationalRate:r.values?.nationalWinRate,localRate:r.values?.localWinRate,
  averageST:r.values?.averageST,motor2Rate:r.values?.motorSecondPlaceRate,
  exhibitionTime:r.values?.exhibitionTime,last50CoursePodiumRate:r.values?.last50Score
 }));
 const prediction=generateTwelveIndependentMethods({racers});
 const bridged=bridgeRacerEvidenceToMethodGate(snapshot,{modelVersion:METHOD_VERSION});
 const draft={schemaVersion:1,source:'research_only_unverified',
  evidence:structuredClone(snapshot),prediction,
  eligibleForVerifiedAccuracy:false,verificationErrors:bridged.errors};
 const canonical=JSON.stringify(draft);
 return {saved:false,sha256:createHash('sha256').update(canonical).digest('hex'),
  draft,note:'SHA256 detects later content changes; it does not prove collection time or official source. No persistence.'};
}
