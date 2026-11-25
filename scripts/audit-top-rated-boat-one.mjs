// Descriptive archived analysis: boat 1 has the highest national win rate.
// Boat number is NOT independently verified starting course. Archived rates are NOT authenticated pre-race.
export function auditTopRatedBoatOne(records){
 if(!Array.isArray(records))throw TypeError('records must be array');
 const groups={boatOneStrictTop:{races:0,first:0,second:0,third:0,podium:0,exact123:0,secondByBoat:{},thirdByBoat:{}},boatOneTiedTop:{races:0,first:0,second:0,third:0,podium:0,exact123:0,secondByBoat:{},thirdByBoat:{}},boatOneNotTop:{races:0,first:0,second:0,third:0,podium:0,exact123:0,secondByBoat:{},thirdByBoat:{}}};
 let excluded=0;const seen=new Set();
 for(const r of records){
  const rs=r?.racers,o=r?.finishOrder;
  if(r?.resultVerified!==true||!/^20\d{6}$/.test(String(r?.date))||!Number.isInteger(r?.venue)||r.venue<1||r.venue>24||!Number.isInteger(r?.race)||r.race<1||r.race>12||!Array.isArray(o)||o.length!==6||new Set(o).size!==6||!o.every(n=>Number.isInteger(n)&&n>=1&&n<=6)||!Array.isArray(rs)||rs.length!==6||new Set(rs.map(x=>x?.boat)).size!==6||!rs.every(x=>Number.isInteger(x?.boat)&&x.boat>=1&&x.boat<=6&&Number.isFinite(x?.nationalWinRate)&&x.nationalWinRate>=0&&x.nationalWinRate<=10)){excluded++;continue;}
  const key=[r.date,r.venue,r.race].join(':');if(seen.has(key))throw Error('duplicate race '+key);seen.add(key);
  const one=rs.find(x=>x.boat===1).nationalWinRate;
  const max=Math.max(...rs.map(x=>x.nationalWinRate));
  const g=groups[one<max?'boatOneNotTop':rs.filter(x=>x.nationalWinRate===max).length>1?'boatOneTiedTop':'boatOneStrictTop'];
  g.races++;if(o[0]===1)g.first++;if(o[1]===1)g.second++;if(o[2]===1)g.third++;if(o.slice(0,3).includes(1))g.podium++;
  if(o[0]===1){g.secondByBoat[o[1]]=(g.secondByBoat[o[1]]||0)+1;g.thirdByBoat[o[2]]=(g.thirdByBoat[o[2]]||0)+1;}
  if(o[0]===1&&o[1]===2&&o[2]===3)g.exact123++;
 }
 for(const g of Object.values(groups)){g.firstRate=g.races?g.first/g.races:null;g.podiumRate=g.races?g.podium/g.races:null;}
 return {eligible:Object.values(groups).reduce((a,g)=>a+g.races,0),excluded,groups,warning:'Descriptive only. Boat 1 is not confirmed course 1. National win rates lack verified pre-race provenance; no scoring promotion.'};
}
