// Research-only, strict 12-method backtest. No prediction is recomputed from results.
import {METHOD_IDS,METHOD_VERSION} from '../generate-twelve-independent-methods.mjs';
import {validatePreRaceEvidence} from './validate-independent-prerace-evidence.mjs';
const validFinish=x=>Array.isArray(x)&&x.length===6&&new Set(x).size===6&&x.every(n=>Number.isInteger(n)&&n>=1&&n<=6);
export function evaluateSavedIndependentMethods(records=[]) {
 if(!Array.isArray(records))throw Error('Expected records array');
 const stats=Object.fromEntries(METHOD_IDS.map(id=>[id,{eligible:0,hits:0,abstained:0}]));
 const held=[],seen=new Set();
 for(const [i,row] of records.entries()){
  const key=[row?.evidence?.date,row?.evidence?.venue,row?.evidence?.race].join(':');
  const reasons=[...validatePreRaceEvidence(row?.evidence).errors];
  if(seen.has(key))reasons.push('duplicate_race');
  seen.add(key);
  if(row?.official?.verified!==true||!validFinish(row?.official?.finishOrder)||
     row?.official?.date!==row?.evidence?.date||
     row?.official?.venue!==row?.evidence?.venue||
     row?.official?.race!==row?.evidence?.race)reasons.push('unverified_official_finish');
  if(row?.prediction?.version!==METHOD_VERSION ||
     row?.evidence?.modelVersion!==METHOD_VERSION ||
     !row?.prediction?.methods)reasons.push('missing_saved_method_version_or_predictions');
  if(reasons.length){held.push({index:i,key,reasons});continue;}
  const actual=row.official.finishOrder.slice(0,3).join('-');
  for(const id of METHOD_IDS){
   const method=row.prediction.methods[id];
   if(method?.status==='abstain'){stats[id].abstained++;continue;}
   const pick=method?.trifecta;
   if(method?.status!=='predicted'||method?.ruleVersion!==METHOD_VERSION||
      !Array.isArray(pick)||pick.length!==3||new Set(pick).size!==3||
      !pick.every(n=>Number.isInteger(n)&&n>=1&&n<=6)){
    stats[id].abstained++;continue;
   }
   stats[id].eligible++;
   if(pick.join('-')===actual)stats[id].hits++;
  }
 }
 return {total:records.length,heldCount:held.length,held,methods:Object.fromEntries(
  METHOD_IDS.map(id=>[id,{...stats[id],hitRate:stats[id].eligible?stats[id].hits/stats[id].eligible:null}])),
  note:'Accuracy is descriptive only. Source flags require independent authentication. No simulated returns.'};
}
