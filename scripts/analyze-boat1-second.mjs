// Research-only: explain boat 1 second-place cases using saved retrospective report.
// Usage: node scripts/analyze-boat1-second.mjs historical-boat1-high-score-report.json
import fs from 'node:fs';
const file=process.argv[2]||'historical-boat1-high-score-report.json';
const input=JSON.parse(fs.readFileSync(file,'utf8'));
if(input.mode!=='retrospective_boat1_top_score_only')throw Error('Unexpected input mode');
const rows=input.details||[];
function six(order,mode){
 const out=[];
 const leaders=mode==='boat1_fixed'?[1]:mode==='boat1_second'?order.filter(x=>x!==1).slice(0,3):order.slice(0,3);
 for(const a of leaders)for(const b of (mode==='boat1_second'?[1]:order.slice(0,4)))for(const c of order){
  if(new Set([a,b,c]).size!==3)continue;
  const pick=[a,b,c].join('-');
  if(!out.includes(pick))out.push(pick);
  if(out.length===6)return out;
 }
 return out;
}
// Equal opportunity for top three challengers: two third-place choices each.
// Contrast with the legacy six() generator, which can concentrate on one winner.
function balancedSecondSix(order){
 const challengers=order.filter(x=>x!==1).slice(0,3);
 const thirds=order.filter(x=>x!==1);
 const picks=[];
 for(const challenger of challengers){
  const options=thirds.filter(x=>x!==challenger).slice(0,2);
  for(const third of options)picks.push([challenger,1,third].join('-'));
 }
 return picks;
}
function group(items){
 const result={races:items.length,boat1Wins:0,boat1Second:0,boat1ThirdOrWorse:0,referenceSixHits:0,boat1FixedSixHits:0,boat1SecondSixHits:0,balancedSecondSixHits:0};
 for(const x of items){
  if(x.actual[0]===1)result.boat1Wins++;
  else if(x.actual[1]===1)result.boat1Second++;
  else result.boat1ThirdOrWorse++;
  if(x.referenceSixHit)result.referenceSixHits++;
  if(x.boat1FixedSixHit)result.boat1FixedSixHits++;
  if(x.boat1SecondSixHit)result.boat1SecondSixHits++;
  if(x.balancedSecondSixHit)result.balancedSecondSixHits++;
 }
 return result;
}
const enriched=rows.map(x=>{
 const actual=x.actual.join('-');
 const fixed=six(x.predictedOrder,'boat1_fixed');
 const second=six(x.predictedOrder,'boat1_second');
 const balanced=balancedSecondSix(x.predictedOrder);
 const winner=x.actual[0];
 const winnerRank=x.predictedOrder.indexOf(winner)+1;
 return {...x,winner,winnerRank,
  boat1FixedSix:fixed,boat1SecondSix:second,balancedSecondSix:balanced,
  boat1FixedSixHit:fixed.includes(actual),boat1SecondSixHit:second.includes(actual),balancedSecondSixHit:balanced.includes(actual)};
});
const second=enriched.filter(x=>x.actual[1]===1);
const gapBands=[{name:'gap_under_3',min:-Infinity,max:3},{name:'gap_3_to_under_6',min:3,max:6},{name:'gap_6_to_under_12',min:6,max:12},{name:'gap_12_to_under_20',min:12,max:20},{name:'gap_at_least_20',min:20,max:Infinity}];
const scoreGapBands=Object.fromEntries(gapBands.map(b=>[b.name,group(enriched.filter(x=>x.gap>=b.min&&x.gap<b.max))]));
const winnerRanks=Object.fromEntries([1,2,3,4,5,6].map(n=>[String(n),group(enriched.filter(x=>x.winnerRank===n))]));
const report={mode:'retrospective_boat1_second_diagnostic',eligible:enriched.length,
 scoreGapBands,winnerRanks,
 totals:group(enriched),boat1Second:group(second),
 winnerRankAmongBoat1Second:Object.fromEntries([2,3,4,5,6].map(n=>[n,second.filter(x=>x.winnerRank===n).length])),
 scoreGapWhenBoat1Second:second.map(x=>({key:x.key,gap:x.gap,winner:x.winner,winnerRank:x.winnerRank,actual:x.actual,
  referenceSixHit:x.referenceSixHit,boat1FixedSixHit:x.boat1FixedSixHit,boat1SecondSixHit:x.boat1SecondSixHit,balancedSecondSixHit:x.balancedSecondSixHit})),
 cases:enriched.map(x=>({key:x.key,gap:x.gap,actual:x.actual,winnerRank:x.winnerRank,
  boat1FixedSixHit:x.boat1FixedSixHit,boat1SecondSixHit:x.boat1SecondSixHit,balancedSecondSixHit:x.balancedSecondSixHit})),
 note:'All six-pick strategies are illustrative deterministic comparisons, not the app original six methods. Current historical scores were reconstructed after the event. No start, motor or exhibition data are available in this report; do not infer their effect.'};
fs.writeFileSync('historical-boat1-second-analysis.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({file:'historical-boat1-second-analysis.json',totals:report.totals,
 boat1Second:report.boat1Second,scoreGapBands:report.scoreGapBands,winnerRanks:report.winnerRanks,winnerRankAmongBoat1Second:report.winnerRankAmongBoat1Second,
 scoreGapWhenBoat1Second:report.scoreGapWhenBoat1Second},null,2));
