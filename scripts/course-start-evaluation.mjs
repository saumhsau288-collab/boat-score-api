// Offline diagnostics only. Do not deploy or treat as calibrated probability.
// Uses actual entry course, not boat number. Lower ST seconds is faster.
// IMPORTANT: actual race ST is post-start information; diagnostics must NOT be used as pre-race features.
export function compareCourseAndStart(rows){
 if(!Array.isArray(rows))throw Error('rows required');
 const valid=rows.filter(r=>r?.verified===true&&/^20[0-9]{6}$/.test(String(r.date))&&Number.isInteger(r.venue)&&r.venue>=1&&r.venue<=24&&Number.isInteger(r.race)&&r.race>=1&&r.race<=12&&Number.isInteger(r.course)&&r.course>=1&&r.course<=6&&Number.isFinite(r.st)&&r.st>=0&&r.st<=1&&Number.isInteger(r.finish)&&r.finish>=1&&r.finish<=6);
 const groups=new Map();
 for(const r of valid){const key=[r.date,r.venue,r.race].join(':');if(!groups.has(key))groups.set(key,[]);groups.get(key).push(r);}
 const result={eligibleRaces:0,innerWins:0,fastestStartWins:0,fastestStartEligibleRaces:0,tiedFastestStartRaces:0,innerTop3:0,closeStartRaces:0,closeStartInnerWins:0,excludedRaces:groups.size};
 for(const g of groups.values()){
  if(g.length!==6||new Set(g.map(r=>r.course)).size!==6||new Set(g.map(r=>r.finish)).size!==6)continue;
  result.eligibleRaces++;result.excludedRaces--;
  const winner=g.find(r=>r.finish===1);
  result.innerWins+=Number(winner.course<=3);
  // Descriptive only: compare inner-course outcomes when actual STs are close.
  // Actual race ST is known only after the start and must never enter prediction scoring.
  const stValues=g.map(r=>r.st);
  if(Math.max(...stValues)-Math.min(...stValues)<=0.03+1e-9){
   result.closeStartRaces++;
   result.closeStartInnerWins+=Number(winner.course<=3);
  }
  const fastest=g.slice().sort((a,b)=>a.st-b.st||a.course-b.course)[0];
  if(g.filter(r=>r.st===fastest.st).length===1){
   result.fastestStartEligibleRaces++;
   result.fastestStartWins+=Number(fastest.finish===1);
  }else result.tiedFastestStartRaces++;
  result.innerTop3+=g.filter(r=>r.course<=3&&r.finish<=3).length;
 }
 return {...result,closeStartInnerWinRate:result.closeStartRaces?result.closeStartInnerWins/result.closeStartRaces:null,innerWinRate:result.eligibleRaces?result.innerWins/result.eligibleRaces:null,fastestStartWinRate:result.fastestStartEligibleRaces?result.fastestStartWins/result.fastestStartEligibleRaces:null,innerTop3Rate:result.eligibleRaces?result.innerTop3/(result.eligibleRaces*3):null,calibrated:false};
}
