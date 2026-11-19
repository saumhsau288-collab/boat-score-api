import {buildRacerInputEvidenceSnapshot} from './build-racer-input-evidence-snapshot.mjs';
// Research adapter: uses only fields confirmed by the official race-entry payload.
// It does not persist or assert that supplied timestamps came from the server.
export function adaptOfficialRaceEntryToEvidence({date,venue,race,capturedAt,cutoffAt,official}={}){
 if(official?.racersVerified!==true||official?.statsVerified!==true)return {ready:false,reason:'official_six_racer_stats_not_verified'};
 const stats=official.statsByBoat, identities=official.racersByBoat;
 if(!Array.isArray(stats)||stats.length!==6||!Array.isArray(identities)||identities.length!==6)return {ready:false,reason:'six_official_rows_required'};
 const validBoatIds=identities.every(x=>Number.isInteger(x?.boat)&&x.boat>=1&&x.boat<=6&&/^\d{4}$/.test(String(x?.racerId??x?.toban??x?.registrationNumber??'')))&&new Set(identities.map(x=>x.boat)).size===6&&new Set(identities.map(x=>String(x.racerId??x.toban??x.registrationNumber))).size===6;
 const validStats=stats.every(s=>Number.isInteger(s?.boat)&&s.boat>=1&&s.boat<=6)&&new Set(stats.map(s=>s.boat)).size===6;
 if(!validBoatIds||!validStats||!stats.every(s=>identities.some(x=>x.boat===s.boat)))return {ready:false,reason:'official_racer_identity_mismatch'};
 if(stats.some(s=>s.racerId!==undefined&&String(s.racerId)!==String(identities.find(x=>x.boat===s.boat)?.racerId??identities.find(x=>x.boat===s.boat)?.toban??identities.find(x=>x.boat===s.boat)?.registrationNumber)))return {ready:false,reason:'official_racer_identity_mismatch'};
 const racers=stats.map(s=>{
  const id=identities.find(x=>x.boat===s.boat);
  return {boat:s.boat,racerId:id?.racerId??id?.toban??id?.registrationNumber??null,
   nationalWinRate:s.nationwide?.winRate??null,localWinRate:s.local?.winRate??null,
   averageST:s.averageST??s.nationwide?.averageST??null,
   motorSecondPlaceRate:s.motor?.secondPlaceRate??null,
   expectedEntryCourse:null,exhibitionTime:null,last50Score:null};
 });
 return buildRacerInputEvidenceSnapshot({date,venue,race,capturedAt,cutoffAt,source:'official_live_entry',racers});
}
