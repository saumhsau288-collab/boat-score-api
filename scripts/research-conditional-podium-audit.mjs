// Research-only conditional finish-order diagnostics. No live scoring changes.
// Each record: {date:"YYYYMMDD", venue:1..24, podium:[1,2,3],
//              preRace:[{boat:1..6, winRate:number, avgST:number}, ...]}
// All inputs must be verified pre-race snapshots; results are labels only.
export function conditionalPodiumAudit(records, cutoffDate) {
 const counts=new Map(), held={};
 const reject=k=>{held[k]=(held[k]||0)+1;};
 for(const r of records??[]) {
  if(!/^20\d{6}$/.test(String(r?.date??'')) || String(r.date)>=String(cutoffDate)) {reject('outside_training_window');continue;}
  if(!Number.isInteger(r?.venue)||r.venue<1||r.venue>24) {reject('invalid_venue');continue;}
  const podium=r.podium;
  if(!Array.isArray(podium)||podium.length!==3||new Set(podium).size!==3||podium.some(x=>!Number.isInteger(x)||x<1||x>6)){reject('invalid_podium');continue;}
  if(r.preRaceAuthenticated!==true||!Array.isArray(r.preRace)||r.preRace.length!==6){reject('unverified_pre_race');continue;}
  const boats=new Map(r.preRace.map(x=>[x.boat,x]));
  if(boats.size!==6||[1,2,3,4,5,6].some(n=>!boats.has(n))||
     [...boats.values()].some(x=>!Number.isFinite(x.winRate)||x.winRate<0||x.winRate>10||
     !Number.isFinite(x.avgST)||x.avgST<0||x.avgST>1)){reject('invalid_pre_race_features');continue;}
  // Conditioning on winner and boat pair is descriptive, not a probability model.
  for(let second=1;second<=6;second++){
   if(second===podium[0])continue;
   const key=podium[0]+'-'+second;
   const row=counts.get(key)??{winner:podium[0],candidate:second,starts:0,second:0,third:0};
   row.starts++;
   if(podium[1]===second)row.second++;
   if(podium[2]===second)row.third++;
   counts.set(key,row);
  }
 }
 return {trainingBefore:cutoffDate,held,rows:[...counts.values()].map(r=>({...r,
  secondRate:r.second/r.starts,thirdRate:r.third/r.starts})).sort((a,b)=>a.winner-b.winner||a.candidate-b.candidate),
  warning:'Descriptive conditional rates only. Never use results or post-race stats as pre-race features. Evaluate on later held-out races before modifying scoring.'};
}
