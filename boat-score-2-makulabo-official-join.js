// Research-only: join verified Makulabo table to official registrations.
import {matchRecent50Racers} from './boat-score-2-recent50-identity.js';
export function joinMakulaboWithOfficial(official,extracted) {
 if(extracted?.verified!==true||!Array.isArray(extracted.parsedRows)||extracted.parsedRows.length!==6)
  return {verified:false,reason:'source_table_not_verified',racers:[]};
 const matched=matchRecent50Racers(official,extracted.parsedRows);
 if(!matched.verified)return {verified:false,reason:'official_identity_mismatch',racers:[]};
 const racers=[];
 for(const match of matched.matches){
  const source=extracted.parsedRows[match.recentIndex];
  const racer=official.find(r=>r.boat===match.boat);
  // The Makulabo table is labelled by boat: require it to agree with official boat.
  if(source.boat!==match.boat)return {verified:false,reason:'boat_mismatch',racers:[]};
  const rate=n=>source.runs>0?+(100*n/source.runs).toFixed(2):null;
  racers.push({boat:match.boat,racerId:String(racer.racerId),name:racer.name,
   runs:source.runs,firstPlaceRate:rate(source.counts[0]),
   top2Rate:rate(source.counts[0]+source.counts[1]),
   top3Rate:rate(source.counts[0]+source.counts[1]+source.counts[2]),
   matchMethod:match.method,courseSpecificVerified:false});
 }
 return {verified:true,racers,scoreChangeApplied:false};
}
