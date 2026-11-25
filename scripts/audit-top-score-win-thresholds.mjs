import {rankNationalLocalAverage} from './audit-boat-one-national-local-average.mjs';
// Threshold sweep is exploratory: score bins of top-ranked racer and win frequencies.
// A win-rate score has no guaranteed winning cutoff; report sample sizes and ties.
export function auditTopScoreWinThresholds(records){
 if(!Array.isArray(records))throw Error('records required');
 const thresholds=[5,5.5,6,6.5,7,7.5,8,8.5,9];
 const make=()=>({races:0,wins:0,boatOneRaces:0,boatOneWins:0});
 const gaps=[0,0.5,1,1.5,2,3].map(t=>({minimumGap:t,...make()}));
 const bands=[{label:'below 5',low:-Infinity,high:5,...make()},...thresholds.map((t,i)=>({label:i===thresholds.length-1?'9+':t+'-'+thresholds[i+1],low:t,high:thresholds[i+1]??Infinity,...make()}))];
 let valid=0,excluded=0,tied=0;
 const add=(x,winner,boatOne)=>{x.races++;if(winner)x.wins++;if(boatOne){x.boatOneRaces++;if(winner)x.boatOneWins++;}};
 for(const r of records){
  let ranked;try{ranked=rankNationalLocalAverage(r?.racers);}catch{excluded++;continue;}
  const o=r?.finishOrder;if(r?.resultVerified!==true||!Array.isArray(o)||o.length!==6||new Set(o).size!==6||!o.every(n=>Number.isInteger(n)&&n>=1&&n<=6)){excluded++;continue;}
  if(ranked[0].score===ranked[1].score){tied++;continue;}
  valid++;const top=ranked[0],winner=top.boat===o[0],boatOne=top.boat===1,gap=top.score-ranked[1].score;
  for(const b of bands)if(top.score>=b.low&&top.score<b.high)add(b,winner,boatOne);
  for(const b of gaps)if(gap>=b.minimumGap)add(b,winner,boatOne);
 }
 const cumulative=thresholds.map(t=>{const a=make();for(const b of bands)if(b.low>=t){a.races+=b.races;a.wins+=b.wins;a.boatOneRaces+=b.boatOneRaces;a.boatOneWins+=b.boatOneWins;}return {minimumScore:t,...a};});
 return {valid,excluded,tied,bands,cumulative,gaps,warning:'Descriptive archived scores only, not authenticated pre-race. Thresholds are exploratory, not validated or guaranteed cutoffs. Higher win rates may reflect inside advantage and field strength.'};
}
