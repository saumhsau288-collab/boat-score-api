// Research-only: examine scenario coverage of each of the six stored ticket slots.
// Slots are not assumed to represent named independently validated strategies.
export function auditTicketSlotScenarios(archives){
 const groups=Object.fromEntries(['main','upset'].map(g=>[g,Array.from({length:6},(_,i)=>({slot:i+1,total:0,topFirst:0,secondThirdFirst:0,lowerFirst:0,topFirstLowerPartner:0}))]));
 let eligible=0,excluded=0;
 const ticket=x=>Array.isArray(x)?x:x?.ticket;
 const valid=t=>Array.isArray(t)&&t.length===3&&t.every(n=>Number.isInteger(n)&&n>=1&&n<=6)&&new Set(t).size===3;
 for(const a of archives)for(const r of Array.isArray(a?.records)?a.records:[]){
  const p=r?.response;if(p?.ready!==true)continue;
  const s=p.rankedScores;
  if(!Array.isArray(s)||s.length!==6||new Set(s.map(x=>x?.boat)).size!==6||!s.every(x=>Number.isInteger(x?.boat)&&x.boat>=1&&x.boat<=6&&Number.isFinite(x?.score))||!['main','upset'].every(g=>Array.isArray(p[g])&&p[g].length===6&&p[g].every(x=>valid(ticket(x))))){excluded++;continue;}
  const rank=new Map(s.slice().sort((x,y)=>y.score-x.score||x.boat-y.boat).map((x,i)=>[x.boat,i+1]));
  for(const g of ['main','upset'])p[g].forEach((x,i)=>{
   const [first,second,third]=ticket(x).map(b=>rank.get(b)),o=groups[g][i];o.total++;
   if(first===1){o.topFirst++;if(second>=4||third>=4)o.topFirstLowerPartner++;}
   else if(first<=3)o.secondThirdFirst++;
   else o.lowerFirst++;
  });
  eligible++;
 }
 return {eligible,excluded,groups,warning:'Slot-level descriptions do not prove method independence, odds, or hit rates. No result data used.'};
}
