// Research-only scenario sensitivity. Does not apply adjustments to deployed scores.
// Never label a retrospective scenario a pre-race forecast.
export function compareHypotheticalAdjustments({baseScores,averageSTByBoat,courseByBoat,verifiedPreRace=false}){
 if(!Array.isArray(baseScores)||baseScores.length!==6||
    new Set(baseScores.map(x=>x.boat)).size!==6||
    baseScores.some(x=>!Number.isInteger(x.boat)||x.boat<1||x.boat>6||!Number.isFinite(x.score)))
  return {status:'invalid_input',scoreChangeApplied:false};
 const hasCourses=Array.isArray(courseByBoat)&&courseByBoat.length===6&&
   new Set(courseByBoat).size===6&&courseByBoat.every(x=>Number.isInteger(x)&&x>=1&&x<=6);
 if(!hasCourses)return {status:'missing_course_evidence',scoreChangeApplied:false};
 if(!Array.isArray(averageSTByBoat)||averageSTByBoat.length!==6)
  return {status:'missing_start_evidence',scoreChangeApplied:false};
 const validST=averageSTByBoat.map(x=>Number.isFinite(x)&&x>0&&x<=1);
 const scenarios=[{name:'baseline',stWeight:0,insideWeight:0},
  {name:'st_weak',stWeight:1,insideWeight:0},
  {name:'inside_weak',stWeight:0,insideWeight:1},
  {name:'st_inside_weak',stWeight:1,insideWeight:1},
  {name:'st_inside_strong',stWeight:2,insideWeight:2}];
 const result=scenarios.map(s=>{
   const scored=baseScores.map(r=>{
     const i=r.boat-1,st=averageSTByBoat[i],course=courseByBoat[i];
     // Missing ST contributes zero, never treated as fastest.
     const stBonus=validST[i]?s.stWeight*(1-st/.30):0;
     const insideBonus=s.insideWeight*(7-course)/6;
     return {boat:r.boat,score:Math.round((r.score+stBonus+insideBonus)*10000)/10000,
       stMissing:!validST[i]};
   }).sort((a,b)=>b.score-a.score||a.boat-b.boat);
   return {name:s.name,order:scored.map(x=>x.boat),scored};
 });
 return {status:verifiedPreRace&&validST.every(Boolean)?'verified_inputs_scenario_only':'retrospective_or_incomplete_scenario_only',
   scoreChangeApplied:false,missingSTBoats:validST.map((v,i)=>v?null:i+1).filter(Boolean),
   scenarios:result,note:'Sensitivity only; no outcome-optimized weights or accuracy claims'};
}
