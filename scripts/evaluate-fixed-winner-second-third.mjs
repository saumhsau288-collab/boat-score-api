// Compare fixed frame winner with rate-weighted winner, varying ONLY the ordering of remaining boats.
// Historical national win rates are not proven pre-race. Exploratory, never deploy automatically.
export function evaluateFixedWinnerSecondThird(reports){
 if(!Array.isArray(reports)||reports.length<3)throw Error('three dated reports required');
 const days=[...reports].sort((a,b)=>String(a.date).localeCompare(String(b.date)));
 if(new Set(days.map(d=>d.date)).size!==days.length)throw Error('duplicate dates');
 const cutoff=Math.floor(days.length*2/3);
 const rows=ds=>ds.flatMap(d=>(d.reports||[]).flatMap(v=>v.records||[])).filter(r=>{
  const o=r?.finishOrder,rs=r?.racers;
  return r?.resultVerified===true&&Array.isArray(o)&&o.length===6&&new Set(o).size===6&&o.every(n=>Number.isInteger(n)&&n>=1&&n<=6)&&Array.isArray(rs)&&rs.length===6&&new Set(rs.map(x=>x?.boat)).size===6&&rs.every(x=>Number.isInteger(x?.boat)&&x.boat>=1&&x.boat<=6&&Number.isFinite(x?.nationalWinRate)&&x.nationalWinRate>=0);
 });
 const train=rows(days.slice(0,cutoff)),holdout=rows(days.slice(cutoff));
 if(!train.length||!holdout.length)throw Error('no valid train/holdout');
 const rank=(rs,w)=>[...rs].sort((a,b)=>(w*b.nationalWinRate-(b.boat-1))-(w*a.nationalWinRate-(a.boat-1))||a.boat-b.boat);
 const predict=(r,ww,ow)=>{
  const winner=rank(r.racers,ww)[0].boat;
  return [winner,...rank(r.racers.filter(x=>x.boat!==winner),ow).slice(0,2).map(x=>x.boat)];
 };
 const evaluate=(data,ww,ow)=>{let exact=0,first=0,second=0,third=0,podium=0,secondThirdGivenCorrectWinner=0,correctWinner=0;for(const r of data){const p=predict(r,ww,ow),o=r.finishOrder;if(p[0]===o[0]){first++;correctWinner++;if(p[1]===o[1]&&p[2]===o[2])secondThirdGivenCorrectWinner++;}if(p[1]===o[1])second++;if(p[2]===o[2])third++;if(p.every((n,i)=>n===o[i]))exact++;podium+=p.filter(n=>o.slice(0,3).includes(n)).length;}return {races:data.length,first,second,third,exact,podium,correctWinner,secondThirdGivenCorrectWinner,exactRate:exact/data.length,podiumRate:podium/(data.length*3)};};
 const weights=[0,.25,.5,1,2,3,4];
 const winnerVariants=[{name:'frameWinner',weight:0},{name:'abilityWinner',weight:2}];
 const variants=winnerVariants.map(w=>{
  const training=weights.map(ow=>({orderWeight:ow,...evaluate(train,w.weight,ow)})).sort((a,b)=>b.exact-a.exact||b.podium-a.podium||a.orderWeight-b.orderWeight);
  return {name:w.name,winnerWeight:w.weight,selectedOrderWeight:training[0].orderWeight,training:training[0],holdout:evaluate(holdout,w.weight,training[0].orderWeight),holdoutFrameOrder:evaluate(holdout,w.weight,0)};
 });
 return {trainDates:days.slice(0,cutoff).map(x=>x.date),holdoutDates:days.slice(cutoff).map(x=>x.date),variants,warning:'Exploratory historical archive; rates not verified pre-race. Weight 2 winner is a fixed comparison, not a tuned or deployed model. No automatic score changes.'};
}
