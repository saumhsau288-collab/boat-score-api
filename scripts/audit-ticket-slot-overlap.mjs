// Research-only: pairwise overlap of the six ticket slots within each group.
// Exact ticket uniqueness and first-place candidate overlap are separate concepts.
export function auditTicketSlotOverlap(archives){
 const groups=Object.fromEntries(['main','upset'].map(g=>[g,{races:0,pairs:Array.from({length:6},(_,i)=>Array.from({length:6},(_,j)=>i<j?{slots:[i+1,j+1],sameFirst:0,sameFirstTwoSet:0,sameTicket:0}:null)).flat().filter(Boolean)}]));
 let eligible=0,excluded=0;
 const ticket=x=>Array.isArray(x)?x:x?.ticket;
 const valid=t=>Array.isArray(t)&&t.length===3&&t.every(n=>Number.isInteger(n)&&n>=1&&n<=6)&&new Set(t).size===3;
 for(const a of archives)for(const r of Array.isArray(a?.records)?a.records:[]){
  const p=r?.response;if(p?.ready!==true)continue;
  if(!['main','upset'].every(g=>Array.isArray(p[g])&&p[g].length===6&&p[g].every(x=>valid(ticket(x))))){excluded++;continue;}
  for(const g of ['main','upset']){
   const t=p[g].map(ticket);groups[g].races++;
   for(const row of groups[g].pairs){
    const [i,j]=row.slots.map(n=>n-1),x=t[i],y=t[j];
    if(x[0]===y[0])row.sameFirst++;
    if(x.slice(0,2).slice().sort().join('-')===y.slice(0,2).slice().sort().join('-'))row.sameFirstTwoSet++;
    if(x.join('-')===y.join('-'))row.sameTicket++;
   }
  }
  eligible++;
 }
 return {eligible,excluded,groups,warning:'Same-first overlap describes ticket diversification only, not model independence or historical accuracy.'};
}
