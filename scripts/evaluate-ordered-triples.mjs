// Historical finish-order frequency lookup, trained on earlier dates only.
// Scores all 120 ordered triples, without using actual winner at prediction time.
export function evaluateOrderedTriples(reports){
 if(!Array.isArray(reports)||reports.length<3)throw new Error('at least three dated reports required');
 const days=[...reports].sort((a,b)=>String(a.date).localeCompare(String(b.date)));
 if(new Set(days.map(x=>x.date)).size!==days.length)throw new Error('duplicate dates');
 const cutoff=Math.floor(days.length*2/3);
 const get=ds=>ds.flatMap(d=>(d.reports||[]).flatMap(v=>v.records||[])).filter(r=>r?.resultVerified===true&&Array.isArray(r.finishOrder)&&r.finishOrder.length===6&&new Set(r.finishOrder).size===6&&r.finishOrder.every(n=>Number.isInteger(n)&&n>=1&&n<=6)&&Array.isArray(r.racers)&&r.racers.length===6&&new Set(r.racers.map(x=>x?.boat)).size===6&&r.racers.every(x=>Number.isInteger(x?.boat)&&x.boat>=1&&x.boat<=6&&Number.isFinite(x?.nationalWinRate)&&x.nationalWinRate>=0));
 const train=get(days.slice(0,cutoff)),test=get(days.slice(cutoff));
 if(!train.length||!test.length)throw new Error('empty train or test');
 const counts=new Map();for(const r of train){const k=r.finishOrder.slice(0,3).join('-');counts.set(k,(counts.get(k)||0)+1);}
 const triples=[];for(let a=1;a<=6;a++)for(let b=1;b<=6;b++)for(let c=1;c<=6;c++)if(a!==b&&a!==c&&b!==c)triples.push([a,b,c]);
 const predict=(r,abilityWeight)=>{const rates=Object.fromEntries(r.racers.map(x=>[x.boat,x.nationalWinRate]));return [...triples].sort((a,b)=>{const score=t=>Math.log((counts.get(t.join('-'))||0)+1)+abilityWeight*(rates[t[0]]*.5+rates[t[1]]*.3+rates[t[2]]*.2);return score(b)-score(a)||a.join('-').localeCompare(b.join('-'));})[0];};
 const evaluate=w=>{let exact=0,first=0,second=0,third=0;for(const r of test){const p=predict(r,w),o=r.finishOrder;if(p[0]===o[0])first++;if(p[1]===o[1])second++;if(p[2]===o[2])third++;if(p.every((n,i)=>n===o[i]))exact++;}return {races:test.length,exact,first,second,third,exactRate:exact/test.length,firstRate:first/test.length};};
 return {trainDates:days.slice(0,cutoff).map(x=>x.date),testDates:days.slice(cutoff).map(x=>x.date),frequencyOnly:evaluate(0),frequencyPlusArchivedAbility:evaluate(.15),warning:'Exploratory comparison; fixed weights not tuned. Archived win rates not verified pre-race; NOT a prospective backtest or current-app evaluation.'};
}
