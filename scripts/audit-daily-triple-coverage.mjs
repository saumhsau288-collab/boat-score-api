// Report top-K ordered-trifecta coverage separately for each held-out date.
// This is a diagnostic only; historical patterns are not betting recommendations.
export function auditDailyTripleCoverage(reports){
 if(!Array.isArray(reports)||reports.length<3)throw new Error('at least three dated reports required');
 const days=[...reports].sort((a,b)=>String(a.date).localeCompare(String(b.date)));
 if(new Set(days.map(x=>x.date)).size!==days.length)throw new Error('duplicate dates');
 const split=Math.floor(days.length*2/3);
 const records=d=>(d.reports||[]).flatMap(v=>v.records||[]).filter(r=>r?.resultVerified===true&&Array.isArray(r.finishOrder)&&r.finishOrder.length===6&&new Set(r.finishOrder).size===6&&r.finishOrder.every(n=>Number.isInteger(n)&&n>=1&&n<=6));
 const counts=new Map();for(const d of days.slice(0,split))for(const r of records(d)){const key=r.finishOrder.slice(0,3).join('-');counts.set(key,(counts.get(key)||0)+1);}
 const triples=[];for(let a=1;a<=6;a++)for(let b=1;b<=6;b++)for(let c=1;c<=6;c++)if(a!==b&&a!==c&&b!==c)triples.push(a+'-'+b+'-'+c);
 triples.sort((a,b)=>(counts.get(b)||0)-(counts.get(a)||0)||a.localeCompare(b));
 const ks=[1,3,6,12,20],sets=Object.fromEntries(ks.map(k=>[k,new Set(triples.slice(0,k))]));
 const byDay=days.slice(split).map(d=>{const rs=records(d);return {date:d.date,races:rs.length,coverage:Object.fromEntries(ks.map(k=>{const hits=rs.filter(r=>sets[k].has(r.finishOrder.slice(0,3).join('-'))).length;return [k,{hits,rate:rs.length?hits/rs.length:null}]}))};});
 return {trainDates:days.slice(0,split).map(d=>d.date),byDay,warning:'Chronological daily diagnostic; candidate selection fixed using earlier dates. No odds or return-on-investment analysis.'};
}
