// Research only. Compare the six favorite and six upset tickets by score rank.
// These are descriptive archived-ticket statistics, not validated outcomes.
export function auditTicketGroupScoreRanks(archives){
 const groups={main:{tickets:0,firstRankCounts:{},distinctFirstBoatsPerRace:{}},upset:{tickets:0,firstRankCounts:{},distinctFirstBoatsPerRace:{}}};
 let races=0,excluded=0;
 const valid=t=>Array.isArray(t)&&t.length===3&&t.every(n=>Number.isInteger(n)&&n>=1&&n<=6)&&new Set(t).size===3;
 for(const a of archives)for(const r of Array.isArray(a?.records)?a.records:[]){
  const p=r?.response;if(p?.ready!==true)continue;
  const scores=p.rankedScores;
  const normalize=x=>Array.isArray(x)?x:x?.ticket;
  if(!Array.isArray(scores)||scores.length!==6||new Set(scores.map(x=>x?.boat)).size!==6||
     !scores.every(x=>Number.isInteger(x?.boat)&&x.boat>=1&&x.boat<=6&&Number.isFinite(x?.score))||
     !['main','upset'].every(g=>Array.isArray(p[g])&&p[g].length===6&&p[g].every(x=>valid(normalize(x))))){excluded++;continue;}
  const rank=new Map(scores.slice().sort((x,y)=>y.score-x.score||x.boat-y.boat).map((x,i)=>[x.boat,i+1]));
  for(const group of ['main','upset']){
   const tickets=p[group].map(normalize),target=groups[group];
   const distinct=new Set(tickets.map(t=>t[0])).size;
   target.distinctFirstBoatsPerRace[distinct]=(target.distinctFirstBoatsPerRace[distinct]??0)+1;
   for(const t of tickets){const k=String(rank.get(t[0]));target.firstRankCounts[k]=(target.firstRankCounts[k]??0)+1;target.tickets++;}
  }
  races++;
 }
 return {races,excluded,groups,warning:'First-place score rank is a descriptive property of stored tickets. Group labels do not establish a validated upset or hit probability.'};
}
