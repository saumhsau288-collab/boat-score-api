// Research-only audit of old saved API responses against twelve new method requirements.
// Ranked ticket slots and aggregate scores are NOT substitutes for six-racer feature vectors.
import {auditTwelveMethodReadiness} from './audit-twelve-method-readiness.mjs';
import {adaptExistingScoreInputsToTwelve} from './adapt-existing-score-inputs-to-twelve.mjs';
export function auditArchivedCaptureForTwelveMethods(capture){
 if(!Array.isArray(capture?.records))throw TypeError('capture.records[] required');
 const ready=capture.records.filter(r=>r?.httpStatus===200&&r?.response?.ready===true);
 const fieldNames=['nationalWinRate','localWinRate','averageStartTiming','motorTwoRate','exhibitionTime','last50CoursePodiumRate','entryCourse'];
 const counts=Object.fromEntries(fieldNames.map(k=>[k,0]));
 const snapshots=[];
 let completeSixBoatFeatureVectors=0;
 for(const r of ready){
  const inputs=r.response?.scoreInputsByBoat;
  const racers=Array.isArray(inputs)?inputs:Object.values(inputs??{});
  if(racers.length!==6)continue;
  completeSixBoatFeatureVectors++;
  for(const key of fieldNames)if(racers.every(x=>typeof x?.[key]==='number'&&Number.isFinite(x[key])))counts[key]++;
  snapshots.push(adaptExistingScoreInputsToTwelve({date:r.date,venue:r.venue,race:r.race,racers}).snapshot);
 }
 const readiness=auditTwelveMethodReadiness(snapshots);
 return {totalRecords:capture.records.length,readyOldRankedPredictions:ready.length,
  completeSixBoatFeatureVectors,fieldCoverageAmongReady:counts,
  methodReadiness:readiness.methods,
  omittedWithoutSixBoatInputs:ready.length-completeSixBoatFeatureVectors,
  authenticatedBeforeRace:capture.authenticatedBeforeRace===true,
  warning:'Existing ranked main/upset tickets and aggregate rankedScores are NOT twelve independent predictions. No missing input may be imputed. No hit rates are calculated.'};
}
