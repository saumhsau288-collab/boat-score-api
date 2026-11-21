// Research-only: stratify conditional podium frequency by pre-race ability/ST gap.
// A negative ST gap means candidate's average start is faster than the winner's.
export function stratifyConditionalPodium(records, cutoffDate) {
 const rows=new Map(), held={}, seen=new Set();
 const reject=(reason)=>{held[reason]=(held[reason]||0)+1;};
 const validDate=s=>/^20\d{6}$/.test(s)&&!Number.isNaN(Date.parse(s.slice(0,4)+'-'+s.slice(4,6)+'-'+s.slice(6,8)+'T00:00:00Z'))&&new Date(s.slice(0,4)+'-'+s.slice(4,6)+'-'+s.slice(6,8)+'T00:00:00Z').toISOString().slice(0,10)===s.slice(0,4)+'-'+s.slice(4,6)+'-'+s.slice(6,8);
 if(!validDate(String(cutoffDate)))throw Error('Invalid cutoff date');
 for(const r of records??[]) {
  const date=String(r?.date??'');
  if(!validDate(date)||date>=cutoffDate){reject('outside_training_window');continue;}
  if(!Number.isInteger(r.venue)||r.venue<1||r.venue>24||!Number.isInteger(r.race)||r.race<1||r.race>12){reject('invalid_race_key');continue;}
  const key=[date,r.venue,r.race].join(':');
  if(seen.has(key)){reject('duplicate_race');continue;}
  seen.add(key);
  const p=r.podium;
  if(!Array.isArray(p)||p.length!==3||new Set(p).size!==3||p.some(n=>!Number.isInteger(n)||n<1||n>6)){reject('invalid_podium');continue;}
  if(r.preRaceAuthenticated!==true||!Array.isArray(r.preRace)||r.preRace.length!==6){reject('unverified_pre_race');continue;}
  const b=new Map(r.preRace.map(x=>[x.boat,x]));
  if(b.size!==6||[1,2,3,4,5,6].some(n=>!b.has(n))||[...b.values()].some(x=>!Number.isFinite(x.winRate)||x.winRate<0||x.winRate>10||!Number.isFinite(x.avgST)||x.avgST<0||x.avgST>1)){reject('invalid_pre_race_features');continue;}
  for(let candidate=1;candidate<=6;candidate++){
   if(candidate===p[0])continue;
   const abilityGap=b.get(candidate).winRate-b.get(p[0]).winRate;
   const startGap=b.get(candidate).avgST-b.get(p[0]).avgST;
   const ability=abilityGap>0.5?'higher':abilityGap< -0.5?'lower':'similar';
   const start=startGap< -0.02?'faster':startGap>0.02?'slower':'similar';
   const group=[p[0],candidate,ability,start].join(':');
   const x=rows.get(group)??{winner:p[0],candidate,ability,start,starts:0,second:0,third:0};
   x.starts++;x.second+=Number(p[1]===candidate);x.third+=Number(p[2]===candidate);rows.set(group,x);
  }
 }
 return {trainingBefore:cutoffDate,held,rows:[...rows.values()].map(x=>({...x,secondRate:x.second/x.starts,thirdRate:x.third/x.starts})),
  warning:'Retrospective descriptive analysis conditioned on actual winner. Not a deployable pre-race predictor. Requires independent holdout evaluation.'};
}
