import {selectBoatOneHighestAppScore} from './select-boat-one-highest-app-score.mjs';
import {validatePreRaceSnapshot} from './audit-snapshot-timing.mjs';
// Join immutable app-score snapshots to separately verified results.
// No archive-rate fallback; do not claim source authentication.
export function evaluateBoatOneAppScoreSnapshots(snapshots,results){
 if(!Array.isArray(snapshots)||!Array.isArray(results))throw Error('arrays required');
 const key=x=>[x?.date,x?.venue,x?.race].join('|');
 const resultIndex=new Map();for(const r of results){const k=key(r);if(resultIndex.has(k))throw Error('duplicate result '+k);resultIndex.set(k,r);}
 const counts={snapshots:snapshots.length,timingInvalid:0,sourceUnverified:0,missingResult:0,resultUnverified:0,invalidFinish:0,selected:0,notHighest:0,tiedHighest:0,missingScore:0,invalidRacers:0,first:0,second:0,third:0,exact123:0};
 const selected=[];
 for(const s of snapshots){
  const timing=validatePreRaceSnapshot(s?.preRaceSnapshot);
  if(!timing.valid){counts.timingInvalid++;continue;}
  if(s?.sourceVerified!==true){counts.sourceUnverified++;continue;}
  const result=resultIndex.get(key(s));if(!result){counts.missingResult++;continue;}
  if(result.resultVerified!==true){counts.resultUnverified++;continue;}
  const o=result.finishOrder;if(!Array.isArray(o)||o.length!==6||new Set(o).size!==6||!o.every(n=>Number.isInteger(n)&&n>=1&&n<=6)){counts.invalidFinish++;continue;}
  const filter=selectBoatOneHighestAppScore([s]);
  for(const k of ['notHighest','tiedHighest','missingScore','invalidRacers'])counts[k]+=filter.counts[k];
  if(!filter.counts.selected)continue;
  counts.selected++;if(o[0]===1)counts.first++;if(o[1]===1)counts.second++;if(o[2]===1)counts.third++;
  if(o.slice(0,3).join('-')==='1-2-3')counts.exact123++;
  selected.push({date:s.date,venue:s.venue,race:s.race,finishTop3:o.slice(0,3)});
 }
 return {counts,selected,warning:'Source verification must be independently established. No rate-based score substitution or automatic deployment.'};
}
