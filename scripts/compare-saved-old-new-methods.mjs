// Research-only paired comparison of SAVED pre-race predictions.
// No post-race recomputation, no odds, no invented legacy tickets.
import {METHOD_IDS,METHOD_VERSION} from '../generate-twelve-independent-methods.mjs';
import {validatePreRaceEvidence} from './validate-independent-prerace-evidence.mjs';
const validPick=p=>Array.isArray(p)&&p.length===3&&new Set(p).size===3&&p.every(n=>Number.isInteger(n)&&n>=1&&n<=6);
const validFinish=f=>Array.isArray(f)&&f.length===6&&new Set(f).size===6&&f.every(n=>Number.isInteger(n)&&n>=1&&n<=6);
export function compareSavedOldAndIndependentMethods(rows=[]){
 if(!Array.isArray(rows))throw Error('Expected paired race rows');
 const methods=Object.fromEntries(METHOD_IDS.map(id=>[id,{paired:0,oldHits:0,newHits:0,bothHit:0,oldOnly:0,newOnly:0,neither:0}]));
 const held=[],seen=new Set();
 for(const [index,row] of rows.entries()){
  const e=row?.evidence,key=[e?.date,e?.venue,e?.race].join(':');
  const reasons=[...validatePreRaceEvidence(e).errors];
  if(seen.has(key))reasons.push('duplicate_race');
  seen.add(key);
  const o=row?.official;
  if(o?.verified!==true||!validFinish(o?.finishOrder)||o?.date!==e?.date||
    o?.venue!==e?.venue||o?.race!==e?.race)reasons.push('official_finish_unverified');
  if(row?.newPrediction?.version!==METHOD_VERSION||
    e?.modelVersion!==METHOD_VERSION||!row?.newPrediction?.methods)
    reasons.push('new_prediction_not_saved_or_wrong_version');
  if(row?.oldPrediction?.savedBeforeCutoff!==true||
    row?.oldPrediction?.capturedAt!==e?.capturedAt||
    !Array.isArray(row?.oldPrediction?.tickets)||
    row.oldPrediction.tickets.length===0||
    !row.oldPrediction.tickets.every(validPick))
    reasons.push('old_prediction_not_verifiably_paired');
  if(reasons.length){held.push({index,key,reasons});continue;}
  const actual=o.finishOrder.slice(0,3).join('-');
  const oldHit=row.oldPrediction.tickets.some(p=>p.join('-')===actual);
  for(const id of METHOD_IDS){
   const m=row.newPrediction.methods[id];
   if(m?.status!=='predicted'||m.ruleVersion!==METHOD_VERSION||!validPick(m.trifecta))continue;
   const s=methods[id],newHit=m.trifecta.join('-')===actual;
   s.paired++;if(oldHit)s.oldHits++;if(newHit)s.newHits++;
   if(oldHit&&newHit)s.bothHit++;
   else if(oldHit)s.oldOnly++;
   else if(newHit)s.newOnly++;
   else s.neither++;
  }
 }
 return {total:rows.length,heldCount:held.length,held,methods:Object.fromEntries(
  METHOD_IDS.map(id=>{const s=methods[id];return [id,{...s,
   oldHitRate:s.paired?s.oldHits/s.paired:null,
   newHitRate:s.paired?s.newHits/s.paired:null,
   difference:s.paired?(s.newHits-s.oldHits)/s.paired:null}]})),
  note:'Old multi-ticket hit vs each new single-ticket hit is not an equal-budget comparison. Paired observations do not establish statistical significance or profit.'};
}
