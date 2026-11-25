// Research-only paired comparison of two fixed-winner order heuristics.
// Uses outcome solely for evaluating predictions, never for choosing tickets.
export function auditFixedWinnerPairedDays(reports,{orderWeight=2}={}){
 const days=[...reports].sort((a,b)=>String(a.date).localeCompare(String(b.date)));
 if(days.length<3||new Set(days.map(x=>x.date)).size!==days.length)throw Error('invalid dates');
 const holdout=days.slice(Math.floor(days.length*2/3));
 const rank=(rs,w)=>[...rs].sort((a,b)=>(w*b.nationalWinRate-(b.boat-1))-(w*a.nationalWinRate-(a.boat-1))||a.boat-b.boat);
 const byDay=[];let baseOnly=0,candidateOnly=0,both=0,neither=0,excluded=0;
 for(const day of holdout){
  const d={date:day.date,races:0,baselineExact:0,candidateExact:0,baselineOnly:0,candidateOnly:0,both:0,neither:0};
  for(const v of day.reports||[])for(const r of v.records||[]){
   const o=r?.finishOrder,rs=r?.racers;
   if(r?.resultVerified!==true||!Array.isArray(o)||o.length!==6||new Set(o).size!==6||!o.every(n=>Number.isInteger(n)&&n>=1&&n<=6)||!Array.isArray(rs)||rs.length!==6||new Set(rs.map(x=>x?.boat)).size!==6||!rs.every(x=>Number.isInteger(x?.boat)&&x.boat>=1&&x.boat<=6&&Number.isFinite(x?.nationalWinRate)&&x.nationalWinRate>=0)){excluded++;continue;}
   const winner=rank(rs,0)[0].boat;
   const pick=w=>[winner,...rank(rs.filter(x=>x.boat!==winner),w).slice(0,2).map(x=>x.boat)];
   const b=pick(0).every((x,i)=>x===o[i]),c=pick(orderWeight).every((x,i)=>x===o[i]);
   d.races++;if(b)d.baselineExact++;if(c)d.candidateExact++;
   if(b&&c){both++;d.both++;}else if(b){baseOnly++;d.baselineOnly++;}else if(c){candidateOnly++;d.candidateOnly++;}else{neither++;d.neither++;}
  }
  byDay.push(d);
 }
 return {holdoutDates:byDay.map(x=>x.date),byDay,paired:{baselineOnly:baseOnly,candidateOnly,both,neither,netCandidateGain:candidateOnly-baseOnly},excluded,warning:'Exploratory archive, unverified pre-race win rates; paired hits do not establish prospective accuracy.'};
}
