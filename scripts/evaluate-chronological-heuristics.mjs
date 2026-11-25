// Research-only chronological holdout: archived rates are NOT verified pre-race.
// Never claim this is a prospective backtest or current-app comparison.
export function evaluateChronologicalHeuristics(reports){
 if(!Array.isArray(reports)||reports.length<2)throw new Error('at least two dated reports required');
 const dates=[...reports].sort((a,b)=>String(a.date).localeCompare(String(b.date)));
 if(new Set(dates.map(d=>d.date)).size!==dates.length)throw new Error('duplicate dates');
 const cutoff=Math.max(1,Math.floor(dates.length*2/3));
 const read=(days)=>days.flatMap(day=>(day.reports||[]).flatMap(v=>v.records||[])).filter(r=>{
  const o=r?.finishOrder,rs=r?.racers;
  return r?.resultVerified===true&&Array.isArray(o)&&o.length===6&&new Set(o).size===6&&o.every(n=>Number.isInteger(n)&&n>=1&&n<=6)&&Array.isArray(rs)&&rs.length===6&&new Set(rs.map(x=>x?.boat)).size===6&&rs.every(x=>Number.isInteger(x?.boat)&&x.boat>=1&&x.boat<=6&&Number.isFinite(x?.nationalWinRate)&&x.nationalWinRate>=0);
 });
 const train=read(dates.slice(0,cutoff)),test=read(dates.slice(cutoff));
 if(!train.length||!test.length)throw new Error('no usable records in train/test');
 const predict=(r,weight)=>[...r.racers].sort((a,b)=>(weight*b.nationalWinRate-(b.boat-1))-(weight*a.nationalWinRate-(a.boat-1))||a.boat-b.boat).map(x=>x.boat);
 const evaluate=(rows,weight)=>{let first=0,second=0,third=0,exact=0,podium=0;for(const r of rows){const p=predict(r,weight),o=r.finishOrder;if(p[0]===o[0])first++;if(p[1]===o[1])second++;if(p[2]===o[2])third++;if(p.slice(0,3).every((n,i)=>n===o[i]))exact++;podium+=p.slice(0,3).filter(n=>o.slice(0,3).includes(n)).length;}return {races:rows.length,first,second,third,exact,podium,podiumSlots:rows.length*3,firstRate:first/rows.length,secondRate:second/rows.length,thirdRate:third/rows.length,exactRate:exact/rows.length,podiumRate:podium/(rows.length*3)};};
 const weights=[0,0.25,0.5,1,2,3,4,6,8];
 const training=weights.map(weight=>({weight,...evaluate(train,weight)}));
 training.sort((a,b)=>b.podiumRate-a.podiumRate||b.firstRate-a.firstRate||a.weight-b.weight);
 const selected=training[0].weight;
 return {trainDates:dates.slice(0,cutoff).map(d=>d.date),testDates:dates.slice(cutoff).map(d=>d.date),selectionMetric:'training top-three membership rate (not exact-order)',selectedWeight:selected,train:training[0],holdout:evaluate(test,selected),frameOnlyHoldout:evaluate(test,0),trainingCandidates:training,warning:'Exploratory only: historical win rates lack verified pre-race timestamp. Frame-only heuristic is NOT the existing Boat Score 2 model. Do not use as evidence of deployable accuracy.'};
}
