// Exploratory strata for fixed frame winner. Strata are defined using archived inputs only,
// not finish results. Do NOT select or deploy strata from the same holdout.
export function auditOrderBenefitByAbilityGap(reports,{orderWeight=2}={}){
 if(!Array.isArray(reports)||reports.length<3)throw Error('three dated reports required');
 const days=[...reports].sort((a,b)=>String(a.date).localeCompare(String(b.date)));
 if(new Set(days.map(d=>d.date)).size!==days.length)throw Error('duplicate dates');
 const holdout=days.slice(Math.floor(days.length*2/3));
 const rank=(rs,w)=>[...rs].sort((a,b)=>(w*b.nationalWinRate-(b.boat-1))-(w*a.nationalWinRate-(a.boat-1))||a.boat-b.boat);
 const strata=Object.fromEntries(['gap_lt_1','gap_1_to_lt_2','gap_ge_2'].map(k=>[k,{races:0,baselineExact:0,candidateExact:0,baselineOnly:0,candidateOnly:0,both:0,neither:0}]));
 let excluded=0;
 for(const day of holdout)for(const venue of day.reports||[])for(const r of venue.records||[]){
  const o=r?.finishOrder,rs=r?.racers;
  if(r?.resultVerified!==true||!Array.isArray(o)||o.length!==6||new Set(o).size!==6||!o.every(n=>Number.isInteger(n)&&n>=1&&n<=6)||!Array.isArray(rs)||rs.length!==6||new Set(rs.map(x=>x?.boat)).size!==6||!rs.every(x=>Number.isInteger(x?.boat)&&x.boat>=1&&x.boat<=6&&Number.isFinite(x?.nationalWinRate)&&x.nationalWinRate>=0)){excluded++;continue;}
  const winner=rank(rs,0)[0].boat;
  const remaining=rs.filter(x=>x.boat!==winner);
  const byFrame=rank(remaining,0),byRate=rank(remaining,orderWeight);
  const gap=Math.abs(byFrame[0].nationalWinRate-byFrame[1].nationalWinRate);
  const key=gap<1?'gap_lt_1':gap<2?'gap_1_to_lt_2':'gap_ge_2';
  const s=strata[key];s.races++;
  const b=[winner,...byFrame.slice(0,2).map(x=>x.boat)].every((n,i)=>n===o[i]);
  const c=[winner,...byRate.slice(0,2).map(x=>x.boat)].every((n,i)=>n===o[i]);
  if(b)s.baselineExact++;if(c)s.candidateExact++;
  if(b&&c)s.both++;else if(b)s.baselineOnly++;else if(c)s.candidateOnly++;else s.neither++;
 }
 return {holdoutDates:holdout.map(x=>x.date),strata,excluded,promote:false,warning:'Post-hoc stratification on holdout. National win rates not independently verified pre-race. Differences are hypotheses only, not deployable rules.'};
}
