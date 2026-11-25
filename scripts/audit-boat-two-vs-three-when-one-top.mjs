// Pre-race selection of second-place boat 2 vs boat 3, evaluated only in top-rated boat-one races.
// Uses archived national rate proxy; boat 1 is not guaranteed actual course 1.
export function auditBoatTwoVsThreeWhenOneTop(reports){
 if(!Array.isArray(reports)||reports.length<3)throw Error('three archive days required');
 const days=[...reports].sort((a,b)=>String(a.date).localeCompare(String(b.date))).slice(-3);
 const buckets={twoStronger:{races:0,oneWins:0,twoSecond:0,threeSecond:0},threeStronger:{races:0,oneWins:0,twoSecond:0,threeSecond:0},equal:{races:0,oneWins:0,twoSecond:0,threeSecond:0}};
 for(const d of days)for(const v of d.reports||[])for(const r of v.records||[]){
  const rs=r?.racers,o=r?.finishOrder;
  if(r?.resultVerified!==true||!Array.isArray(o)||o.length!==6||new Set(o).size!==6||!o.every(n=>Number.isInteger(n)&&n>=1&&n<=6)||!Array.isArray(rs)||rs.length!==6||new Set(rs.map(x=>x?.boat)).size!==6||!rs.every(x=>Number.isInteger(x?.boat)&&x.boat>=1&&x.boat<=6&&Number.isFinite(x?.nationalWinRate)&&x.nationalWinRate>=0))continue;
  const sorted=[...rs].sort((a,b)=>b.nationalWinRate-a.nationalWinRate||a.boat-b.boat);
  if(sorted[0].boat!==1||sorted[0].nationalWinRate===sorted[1].nationalWinRate)continue;
  const rate=new Map(rs.map(x=>[x.boat,x.nationalWinRate]));
  const key=rate.get(2)>rate.get(3)?'twoStronger':rate.get(2)<rate.get(3)?'threeStronger':'equal';
  const b=buckets[key];b.races++;
  if(o[0]===1){b.oneWins++;if(o[1]===2)b.twoSecond++;if(o[1]===3)b.threeSecond++;}
 }
 return {buckets,warning:'Descriptive only: conditioning on actual boat-one win is post-race. Archived rates are not authenticated pre-race or actual app scores.'};
}
