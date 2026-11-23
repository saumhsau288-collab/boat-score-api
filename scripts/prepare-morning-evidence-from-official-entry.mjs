// Research-only merge of official entry fields and independently supplied last-50 data.
// Does not verify provenance of the caller's last-50 values or timestamps.
import {adaptOfficialRaceEntryToEvidence} from './adapt-official-racer-evidence.mjs';
import {sealMorningEvidenceDraft} from './seal-morning-evidence-draft.mjs';
export function prepareMorningEvidenceFromOfficialEntry(args={},last50ByBoat=[]){
 const snapshot=adaptOfficialRaceEntryToEvidence(args);
 if(!snapshot.ready)return {ready:false,reason:snapshot.reason};
 if(!Array.isArray(last50ByBoat)||last50ByBoat.length!==6||
  new Set(last50ByBoat.map(x=>x?.boat)).size!==6||
  last50ByBoat.some(x=>!Number.isInteger(x?.boat)||x.boat<1||x.boat>6||
   typeof x.score!=='number'||!Number.isFinite(x.score)||x.score<0||x.score>100))
  return {ready:false,reason:'six_verified_last50_scores_required'};
 const next=structuredClone(snapshot);
 for(const racer of next.racers){
  const score=last50ByBoat.find(x=>x.boat===racer.boat)?.score;
  racer.values.last50Score=score;
  racer.missing=racer.missing.filter(x=>x!=='last50Score');
 }
 next.scoringReady=next.racers.every(x=>x.missing.length===0);
 const sealed=sealMorningEvidenceDraft(next);
 if(!sealed.envelope)return {ready:false,reason:sealed.reason,missing:sealed.missing??[]};
 return {ready:true,sealed,verifiedOfficialSources:false,
  note:'Last-50 scores and capture timestamps remain caller supplied and unverified.'};
}
