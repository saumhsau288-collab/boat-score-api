// Research-only bridge: reuse the existing racer evidence builder format.
// A builder's ready/scoringReady flag does NOT authenticate its source.
import {validatePreRaceEvidence} from './validate-independent-prerace-evidence.mjs';
export function bridgeRacerEvidenceToMethodGate(snapshot, verification={}) {
 const racers=Array.isArray(snapshot?.racers)?snapshot.racers.map(r=>({
   boat:r?.boat,racerId:r?.racerId,entryCourse:r?.values?.expectedEntryCourse,
   nationalRate:r?.values?.nationalWinRate,localRate:r?.values?.localWinRate,
   averageST:r?.values?.averageST,motor2Rate:r?.values?.motorSecondPlaceRate,
   exhibitionTime:r?.values?.exhibitionTime,last50CoursePodiumRate:r?.values?.last50Score
 })) : undefined;
 const row={date:snapshot?.date,venue:snapshot?.venue,race:snapshot?.race,
   capturedAt:snapshot?.capturedAt,officialCutoffAt:snapshot?.cutoffAt,
   modelVersion:verification.modelVersion,featureSource:snapshot?.source,
   captureSourceVerified:verification.captureSourceVerified===true,
   cutoffSourceVerified:verification.cutoffSourceVerified===true,racers};
 const gate=validatePreRaceEvidence(row);
 return {eligible:gate.eligible,errors:gate.errors,record:gate.eligible?row:null,
   note:'Verification flags must be established independently from authenticated sources; caller-supplied flags alone are not proof.'};
}
