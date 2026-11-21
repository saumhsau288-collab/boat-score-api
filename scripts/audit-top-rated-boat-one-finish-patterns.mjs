// Descriptive second/third finish distribution when boat 1 uniquely leads archived national rate.
// No actual result is used to select a predicted ticket.
export function auditTopRatedBoatOneFinishPatterns(reports){
 if(!Array.isArray(reports)||reports.length<3)throw Error('three days required');
 const days=[...reports].sort((a,b)=>String(a.date).localeCompare(String(b.date))).slice(-3);
 const result={races:0,boatOneWins:0,boatOnePodium:0,secondWhenOneWins:{},thirdWhenOneWins:{},pairWhenOneWins:{},oneNotWinner:{},byDate:[]};
 for(const d of days){
  const day={date:d.date,races:0,boatOneWins:0,secondWhenOneWins:{},pairWhenOneWins:{}};result.byDate.push(day);
  for(const v of d.reports||[])for(const r of v.records||[]){
   const rs=r?.racers,o=r?.finishOrder;
   if(r?.resultVerified!==true||!Array.isArray(o)||o.length!==6||new Set(o).size!==6||!o.every(x=>Number.isInteger(x)&&x>=1&&x<=6)||!Array.isArray(rs)||rs.length!==6||new Set(rs.map(x=>x?.boat)).size!==6||!rs.every(x=>Number.isInteger(x?.boat)&&x.boat>=1&&x.boat<=6&&Number.isFinite(x?.nationalWinRate)&&x.nationalWinRate>=0))continue;
   const sorted=[...rs].sort((a,b)=>b.nationalWinRate-a.nationalWinRate||a.boat-b.boat);
   if(sorted[0].boat!==1||sorted[0].nationalWinRate===sorted[1].nationalWinRate)continue;
   result.races++;day.races++;
   if(o.includes(1)&&o.indexOf(1)<3)result.boatOnePodium++;
   if(o[0]===1){
    result.boatOneWins++;day.boatOneWins++;
    for(const [target,key] of [[result.secondWhenOneWins,o[1]],[result.thirdWhenOneWins,o[2]],[result.pairWhenOneWins,o[1]+'-'+o[2]],[day.secondWhenOneWins,o[1]],[day.pairWhenOneWins,o[1]+'-'+o[2]]])target[key]=(target[key]||0)+1;
   }else{const key=o[0]+'-'+o[1]+'-'+o[2];result.oneNotWinner[key]=(result.oneNotWinner[key]||0)+1;}
  }
 }
 return {...result,warning:'Descriptive historical patterns only; archived national rate is not Boat Score evaluation and boat 1 may not enter actual course 1.'};
}
