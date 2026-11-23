// Research-only: compare score ranks across all three finishing positions in archived tickets.
export function auditTicketPositionRanks(archives){
 const groups=Object.fromEntries(['main','upset'].map(g=>[g,{tickets:0,positionRanks:[{},{},{}],lowRankInSecondOrThird:0,topRankFirstWithLowRankPartner:0}]));
 let eligible=0,excluded=0;
 const ticket=x=>Array.isArray(x)?x:x?.ticket;
 const valid=t=>Array.isArray(t)&&t.length===3&&t.every(n=>Number.isInteger(n)&&n>=1&&n<=6)&&new Set(t).size===3;
 for(const a of archives)for(const r of Array.isArray(a?.records)?a.records:[]){
  const p=r?.response;if(p?.ready!==true)continue;
  const s=p.rankedScores;
  if(!Array.isArray(s)||s.length!==6||new Set(s.map(x=>x?.boat)).size!==6||!s.every(x=>Number.isInteger(x?.boat)&&x.boat>=1&&x.boat<=6&&Number.isFinite(x?.score))||!['main','upset'].every(g=>Array.isArray(p[g])&&p[g].length===6&&p[g].every(x=>valid(ticket(x))))){excluded++;continue;}
  const rank=new Map(s.slice().sort((x,y)=>y.score-x.score||x.boat-y.boat).map((x,i)=>[x.boat,i+1]));
  for(const g of ['main','upset'])for(const x of p[g]){
   const ranks=ticket(x).map(b=>rank.get(b)),target=groups[g];target.tickets++;
   ranks.forEach((n,i)=>{target.positionRanks[i][n]=(target.positionRanks[i][n]??0)+1;});
   const lowPartner=ranks[1]>=4||ranks[2]>=4;
   if(lowPartner)target.lowRankInSecondOrThird++;
   if(ranks[0]===1&&lowPartner)target.topRankFirstWithLowRankPartner++;
  }
  eligible++;
 }
 return {eligible,excluded,groups,warning:'Rank refers to stored aggregate score, not odds or finishing probability. Descriptive only; no results used.'};
}
