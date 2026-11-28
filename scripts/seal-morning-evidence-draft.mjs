// Research-only morning evidence envelope. No live fetch, deployment or official provenance claim.
import {createHash} from 'node:crypto';
import {assessPredictionPhase} from './assess-prediction-phase.mjs';
export function sealMorningEvidenceDraft(snapshot){
 const phase=assessPredictionPhase(snapshot,{phase:'morning'});
 if(!phase.eligible)return {saved:false,reason:phase.reason,missing:phase.missing??[]};
 const envelope={
  schemaVersion:1,phase:'morning',source:'research_only_unverified',
  date:snapshot.date,venue:snapshot.venue,race:snapshot.race,
  capturedAt:snapshot.capturedAt,cutoffAt:snapshot.cutoffAt,
  captureSource:snapshot.source,modelVersion:'morning-baseline-v1',
  racers:structuredClone(snapshot.racers),
  predictedMethods:{},methodCount:0,
  eligibleForVerifiedAccuracy:false,
  note:'Morning inputs only. Timestamp and source are caller assertions, not authenticated capture.'
 };
 const sha256=createHash('sha256').update(JSON.stringify(envelope)).digest('hex');
 return {saved:false,sha256,envelope};
}
