// Top-K ordered trifecta coverage with counts learned only from earlier dates.
// This is NOT a betting recommendation or a current-app backtest.
export function evaluateOrderedTripleCoverage(reports){
 if(!Array.isArray(reports)||reports.length<3)throw new Error('at least three dates required');
 const days=[...reports].sort((a,b)=>String(a.date).localeCompare(String(b.date)));
 if(new Set(days.map(x=>x.date)).size!==days.length)throw new Error('duplicate dates');
 const cutoff=Math.floor(days.length*2/3);
 const get=ds=>ds.flatMap(d=>(d.reports||[]).flatMap(v=>v.records||[])).filter(r=>r?.resultVerified===true&&Array.isArray(r.finishOrder)&&r.finishOrder.length===6&&new Set(r.finishOrder).size===6&&r.finishOrder.every(n=>Number.isInteger(n)&&n>=1&&n<=6));
 const train=get(days.slice(0,cutoff)),test=get(days.slice(cutoff));if(!train.length||!test.length)throw new Error('missing eligible races');
 const counts=new Map();for(const r of train){const k=r.finishOrder.slice(0,3).join('-');counts.set(k,(counts.get(k)||0)+1);}
 const triples=[];for(let a=1;a<=6;a++)for(let b=1;b<=6;b++)for(let c=1;c<=6;c++)if(a!==b&&a!==c&&b!==c)triples.push([a,b,c].join('-'));
 triples.sort((a,b)=>(counts.get(b)||0)-(counts.get(a)||0)||a.localeCompare(b));
 const coverage={};for(const k of [1,3,6,12,20]){const selected=new Set(triples.slice(0,k));const hits=test.filter(r=>selected.has(r.finishOrder.slice(0,3).join('-'))).length;coverage[k]={hits,races:test.length,rate:hits/test.length};}
 return {trainDates:days.slice(0,cutoff).map(x=>x.date),testDates:days.slice(cutoff).map(x=>x.date),topPatterns:triples.slice(0,12).map(order=>({order,trainingCount:counts.get(order)||0})),coverage,warning:'Frequency-only top-K research. More picks mechanically raise coverage and cost; no odds, profitability, or prospective validation.'};
}
