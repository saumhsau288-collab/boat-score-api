// Historical actual finishing-order patterns conditional on winner and ability rank.
// Descriptive only: archived win rates may be post-race snapshots.
export function auditConditionalFinishOrder(records){
 if(!Array.isArray(records))throw new TypeError('records must be an array');
 const byWinner=Object.fromEntries(Array.from({length:6},(_,i)=>[i+1,{races:0,second:{},third:{},secondThirdPairs:{},topRateSecond:0,topRateThird:0,rank3Second:0,rank3Third:0}]));
 const seen=new Set();let eligible=0,excluded=0;
 for(const r of records){
  const o=r?.finishOrder,rs=r?.racers;
  if(r?.resultVerified!==true||!/^[0-9]{8}$/.test(String(r.date))||!Number.isInteger(r.venue)||!Number.isInteger(r.race)||!Array.isArray(o)||o.length!==6||new Set(o).size!==6||!o.every(n=>Number.isInteger(n)&&n>=1&&n<=6)||!Array.isArray(rs)||rs.length!==6||new Set(rs.map(x=>x?.boat)).size!==6||!rs.every(x=>Number.isInteger(x?.boat)&&x.boat>=1&&x.boat<=6&&Number.isFinite(x?.nationalWinRate)&&x.nationalWinRate>=0)){excluded++;continue;}
  const key=[r.date,r.venue,r.race].join(':');if(seen.has(key))throw new Error('duplicate race '+key);seen.add(key);
  const rank=[...rs].sort((a,b)=>b.nationalWinRate-a.nationalWinRate||a.boat-b.boat).map(x=>x.boat);
  const g=byWinner[o[0]];g.races++;eligible++;
  g.second[o[1]]=(g.second[o[1]]||0)+1;g.third[o[2]]=(g.third[o[2]]||0)+1;
  const pair=o[1]+'-'+o[2];g.secondThirdPairs[pair]=(g.secondThirdPairs[pair]||0)+1;
  if(rank.slice(0,2).includes(o[1]))g.topRateSecond++;
  if(rank.slice(0,2).includes(o[2]))g.topRateThird++;
  if(rank[2]===o[1])g.rank3Second++;
  if(rank[2]===o[2])g.rank3Third++;
 }
 return {eligible,excluded,byWinner,warning:'Descriptive finish-order conditional frequencies, NOT a pre-race predictive model. Do not leak outcome winner into prediction.'};
}
