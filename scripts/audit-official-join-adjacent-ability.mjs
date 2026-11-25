// Adapter for the official B/K joined-record shape. Research-only.
// Explicit provenance gate: B/K historical archives without timestamp proof are excluded.
import {auditAdjacentByAbility} from './audit-adjacent-ability.mjs';
export function auditOfficialJoinAdjacentAbility(data,{threshold=5.5}={}) {
 const records=Array.isArray(data)?data:data?.records;
 if(!Array.isArray(records))throw new TypeError('expected records array');
 const adapted=records.map(r=>{
  const racers=r?.racers;
  const valid=Array.isArray(racers)&&racers.length===6&&racers.every(x=>Number.isInteger(x?.boat)&&x.boat>=1&&x.boat<=6&&typeof x?.nationalWinRate==='number')&&new Set(racers.map(x=>x.boat)).size===6;
  return {...r,preRaceVerified:r?.asOfVerified===true,
   preRaceNationalWinRates:valid?[...racers].sort((a,b)=>a.boat-b.boat).map(x=>x.nationalWinRate):null};
 });
 const report=auditAdjacentByAbility(adapted,{threshold});
 return {...report,inputCount:records.length,source:'official B/K joined records',
  note:'Historical B/K snapshots with unverified pre-race capture times are excluded; no extrapolated forecast accuracy.'};
}
