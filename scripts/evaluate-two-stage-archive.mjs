// Research-only two-stage heuristic: select likely podium members by ability,
// then order those members using a separate inner-frame / ability blend.
// Archived rates are not verified pre-race; this is NOT app validation.
export function evaluateTwoStageArchive(reports){
 if(!Array.isArray(reports)||reports.length<3)throw new Error('three archive days required');
 const days=[...reports].sort((a,b)=>String(a.date).localeCompare(String(b.date)));
 if(new Set(days.map(x=>x.date)).size!==days.length)throw new Error('duplicate dates');
 const cutoff=Math.floor(days.length*2/3);
 const records=d=>d.flatMap(x=>(x.reports||[]).flatMap(v=>v.records||[])).filter(r=>r?.resultVerified===true&&Array.isArray(r.finishOrder)&&r.finishOrder.length===6&&new Set(r.finishOrder).size===6&&r.finishOrder.every(n=>Number.isInteger(n)&&n>=1&&n<=6)&&Array.isArray(r.racers)&&r.racers.length===6&&new Set(r.racers.map(x=>x?.boat)).size===6&&r.racers.every(x=>Number.isInteger(x?.boat)&&x.boat>=1&&x.boat<=6&&Number.isFinite(x?.nationalWinRate)&&x.nationalWinRate>=0));
 const train=records(days.slice(0,cutoff)),holdout=records(days.slice(cutoff));
 if(!train.length||!holdout.length)throw new Error('missing eligible races');
 const order=(rs,w)=>[...rs].sort((a,b)=>(w*b.nationalWinRate-(b.boat-1))-(w*a.nationalWinRate-(a.boat-1))||a.boat-b.boat);
 const score=(rows,podiumWeight,orderWeight)=>{let exact=0,first=0,second=0,third=0,member=0;for(const r of rows){const picked=order(r.racers,podiumWeight).slice(0,3);const prediction=order(picked,orderWeight).map(x=>x.boat);const actual=r.finishOrder;if(prediction[0]===actual[0])first++;if(prediction[1]===actual[1])second++;if(prediction[2]===actual[2])third++;if(prediction.every((n,i)=>n===actual[i]))exact++;member+=prediction.filter(n=>actual.slice(0,3).includes(n)).length;}return {races:rows.length,first,second,third,exact,membership:member,firstRate:first/rows.length,secondRate:second/rows.length,thirdRate:third/rows.length,exactRate:exact/rows.length,membershipRate:member/(rows.length*3)};};
 const candidates=[];for(const pw of [0,0.5,1,2,3,4])for(const ow of [0,0.25,0.5,1,2,3,4])candidates.push({podiumWeight:pw,orderWeight:ow,...score(train,pw,ow)});
 // Select using training exact-order rate, with first-place rate as tie breaker.
 candidates.sort((a,b)=>b.exactRate-a.exactRate||b.firstRate-a.firstRate||b.membershipRate-a.membershipRate||a.podiumWeight-b.podiumWeight||a.orderWeight-b.orderWeight);
 const best=candidates[0];
 return {trainDates:days.slice(0,cutoff).map(x=>x.date),holdoutDates:days.slice(cutoff).map(x=>x.date),selectionMetric:'training exact trifecta rate',selected:{podiumWeight:best.podiumWeight,orderWeight:best.orderWeight},training:best,holdout:score(holdout,best.podiumWeight,best.orderWeight),frameOnlyHoldout:score(holdout,0,0),candidatesTried:candidates.length,warning:'Retrospective archive exploratory heuristic; not verified pre-race, not current app, not deployable accuracy.'};
}
