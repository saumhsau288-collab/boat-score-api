// Research-only: quantify whether slots 1 and 2 differ in their second/third boats
// when the first-place candidate is identical. No change to forecast generation.
export function auditFirstTwoSlotDifferences(archives){
 const groups={main:{races:0,sameFirst:0,sameFirstSameSecond:0,sameFirstSameThird:0,sameFirstSwappedPartners:0,sameFirstDifferentPartners:0},upset:{races:0,sameFirst:0,sameFirstSameSecond:0,sameFirstSameThird:0,sameFirstSwappedPartners:0,sameFirstDifferentPartners:0}};
 let excluded=0;
 const ticket=x=>Array.isArray(x)?x:x?.ticket;
 const valid=t=>Array.isArray(t)&&t.length===3&&t.every(n=>Number.isInteger(n)&&n>=1&&n<=6)&&new Set(t).size===3;
 for(const a of archives)for(const r of Array.isArray(a?.records)?a.records:[]){
  const p=r?.response;if(p?.ready!==true)continue;
  if(!['main','upset'].every(g=>Array.isArray(p[g])&&p[g].length===6&&p[g].every(x=>valid(ticket(x))))){excluded++;continue;}
  for(const g of ['main','upset']){
   const x=ticket(p[g][0]),y=ticket(p[g][1]),o=groups[g];o.races++;
   if(x[0]!==y[0])continue;
   o.sameFirst++;
   if(x[1]===y[1])o.sameFirstSameSecond++;
   if(x[2]===y[2])o.sameFirstSameThird++;
   if(x[1]===y[2]&&x[2]===y[1])o.sameFirstSwappedPartners++;
   if(new Set([x[1],x[2],y[1],y[2]]).size>=3)o.sameFirstDifferentPartners++;
  }
 }
 return {excluded,groups,warning:'Descriptive candidate overlap only. Distinct ticket positions do not prove independent prediction methods or better accuracy.'};
}
