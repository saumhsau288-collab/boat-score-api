import {classifyPredictionPhase} from './classify-prediction-phase.mjs';
import {validatePreCutoffSnapshot} from './validate-precutoff-snapshot.mjs';
// Research-only: join saved predictions to separately verified race results.
export function comparePreCutoffPredictions(snapshots,results){
 const lookup=new Map((results??[]).map(r=>[r.date+':'+r.venue+':'+r.race,r]));
 const rows=[],rejections=[],seen=new Set();
 for(const snapshot of snapshots??[]){
  const key=snapshot?.date+':'+snapshot?.venue+':'+snapshot?.race;
  const phase=classifyPredictionPhase(snapshot);
  const uniqueKey=key+':'+(phase.phase??snapshot?.phase??'unknown');
  const eligibility=validatePreCutoffSnapshot(snapshot);
  if(seen.has(uniqueKey)){rejections.push({key,reasons:['duplicate_race_snapshot']});continue;}
  seen.add(uniqueKey);
  if(!eligibility.eligible){rejections.push({key,reasons:eligibility.errors});continue;}
  if(!phase.phase){rejections.push({key,reasons:[phase.reason]});continue;}
  const result=lookup.get(key);
  if(result?.status!=='independently_verified'||!Array.isArray(result.racers)||result.racers.length!==6){rejections.push({key,reasons:['unverified_result']});continue;}
  const official=new Map(result.racers.map(r=>[r.boat,r]));
  if(official.size!==6||snapshot.racers.some(r=>official.get(r.boat)?.racerId!==r.racerId)||result.racers.filter(r=>r.finish===1).length!==1){rejections.push({key,reasons:['result_identity_mismatch']});continue;}
  const picks=snapshot.prediction?.mainSix;
  if(!Array.isArray(picks)||picks.length!==6||picks.some(p=>!Array.isArray(p)||p.length!==3||new Set(p).size!==3||p.some(n=>!Number.isInteger(n)||n<1||n>6))){rejections.push({key,reasons:['missing_or_invalid_prediction']});continue;}
  const podium=[1,2,3].map(place=>result.racers.find(r=>r.finish===place)?.boat);
  if(podium.some(x=>x===undefined)){rejections.push({key,reasons:['incomplete_finish_order']});continue;}
  const exactHit=picks.some(p=>p.every((boat,i)=>boat===podium[i]));
  rows.push({key,phase:phase.phase,exactHit,winnerBoat:podium[0],winnerInMainFirstChoices:picks.some(p=>p[0]===podium[0])});
 }
 const byPhase=Object.fromEntries(['morning_8am','precutoff_10min'].map(phase=>{const selected=rows.filter(r=>r.phase===phase);return [phase,{eligibleRaces:selected.length,mainSixExactHits:selected.filter(r=>r.exactHit).length}];}));
 const paired=new Map();
 for(const row of rows){if(!paired.has(row.key))paired.set(row.key,{});paired.get(row.key)[row.phase]=row;}
 const pairs=[...paired.entries()].filter(([,v])=>v.morning_8am&&v.precutoff_10min);
 const phaseComparison={pairedRaces:pairs.length,improved:pairs.filter(([,v])=>!v.morning_8am.exactHit&&v.precutoff_10min.exactHit).length,worsened:pairs.filter(([,v])=>v.morning_8am.exactHit&&!v.precutoff_10min.exactHit).length,bothHit:pairs.filter(([,v])=>v.morning_8am.exactHit&&v.precutoff_10min.exactHit).length,bothMiss:pairs.filter(([,v])=>!v.morning_8am.exactHit&&!v.precutoff_10min.exactHit).length};
 return {eligibleRaces:rows.length,mainSixExactHits:rows.filter(r=>r.exactHit).length,byPhase,phaseComparison,rows,rejections};
}
