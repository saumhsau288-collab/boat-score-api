// Compare simple descriptive rankings against the saved app score ranking.
// Post-hoc race-list features are not authenticated pre-race inputs.
import fs from 'node:fs/promises';
import path from 'node:path';
const dir=process.argv[2]||'research-official-racelists';
const saved=JSON.parse(await fs.readFile(path.join(dir,'saved-scores-vs-official-finishes.json'),'utf8'));
const comparison=JSON.parse(await fs.readFile(path.join(dir,'racer-comparison-tables.json'),'utf8'));
const key=r=>[r.date,Number(r.venue),Number(r.race)].join(':');
const index=new Map(comparison.races.map(r=>[key(r),r]));
const methods=['savedAppScore','posthocWinRate','posthocAverageST','boatNumber'];
const counts=Object.fromEntries(methods.map(m=>[m,{eligible:0,firstPlaceTop:0,topThreeOverlap:0,topRankMeanFinish:null,finishPositionSum:0}]));
const rows=[];
for(const race of saved.rows.filter(r=>r.verifiedFinish)){
 const features=index.get(key(race));if(!features)throw Error('Missing features '+key(race));
 const orders={
  savedAppScore:race.savedScoreOrder,
  posthocWinRate:features.byWinRate,
  posthocAverageST:features.byST,
  boatNumber:[1,2,3,4,5,6]
 };
 const result={date:race.date,venue:race.venue,race:race.race,actualWinner:race.officialFinishOrder[0],methods:{}};
 for(const method of methods){
  const ranking=orders[method];
  if(!Array.isArray(ranking)||ranking.length!==6||new Set(ranking).size!==6){result.methods[method]={eligible:false,reason:'incomplete_six_boat_ranking'};continue;}
  const c=counts[method],position=race.officialFinishOrder.indexOf(ranking[0])+1;
  if(position<1)throw Error('Top-ranked boat absent from official finish');
  const overlap=ranking.slice(0,3).filter(boat=>race.officialFinishOrder.slice(0,3).includes(boat)).length;
  c.eligible++;c.firstPlaceTop+=position===1?1:0;c.topThreeOverlap+=overlap;c.finishPositionSum+=position;
  result.methods[method]={eligible:true,topRankFinish:position,topThreeOverlap:overlap};
 }
 rows.push(result);
}
for(const c of Object.values(counts)){c.topRankMeanFinish=c.eligible?Number((c.finishPositionSum/c.eligible).toFixed(3)):null;delete c.finishPositionSum;}
const out={verifiedRaces:rows.length,counts,rows,weightsChanged:false,calibrationEligible:false,preRaceAuthenticated:false,warning:'Exploratory descriptive comparisons on the same small selected race set. Post-hoc features, boat-number proxy and saved app scores are not validated prospective predictors; no significance or causal claims.'};
await fs.writeFile(path.join(dir,'research-baseline-ranking-comparison.json'),JSON.stringify(out,null,2)+'\n');
console.log('Research baseline ranking comparison:',JSON.stringify({verifiedRaces:out.verifiedRaces,counts:out.counts,calibrationEligible:false}));
