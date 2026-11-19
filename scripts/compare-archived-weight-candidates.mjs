// Compare alternative weightings descriptively on archived data only.
// This is NOT a training/holdout result and never selects production weights.
import fs from 'node:fs';
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
export const CANDIDATES=[
 {name:'baseline',ability:70,start:20,course:10},
 {name:'ability75_start20',ability:75,start:20,course:5},
 {name:'ability75_course10',ability:75,start:15,course:10},
 {name:'start25',ability:65,start:25,course:10},
 {name:'course15',ability:65,start:20,course:15}
];
export function describeWeightCandidates(joined){
 if(!Array.isArray(joined?.rows))throw Error('Expected archived joined rows');
 const eligible=joined.rows.filter(r=>r.status==='research_only_joined_postrace_archive'&&Array.isArray(r.racers)&&r.racers.length===6&&r.racers.every(x=>Number.isFinite(x.nationalWinRate)&&Number.isFinite(x.localWinRate)&&Number.isFinite(x.averageStartTiming)&&Number.isInteger(x.entryCourse)&&Number.isInteger(x.finish)));
 const rows=CANDIDATES.map(w=>{
  let topOne=0,exactTopThree=0,podiumOverlap=0;
  for(const race of eligible){
   const sorted=[...race.racers].sort((a,b)=>{
    const score=x=>((x.nationalWinRate+x.localWinRate)/2)/10*w.ability+clamp((.30-x.averageStartTiming)/.30,0,1)*w.start+(6-x.entryCourse)/5*w.course;
    return score(b)-score(a)||a.boat-b.boat;
   });
   const actual=[...race.racers].sort((a,b)=>a.finish-b.finish);
   if(sorted[0].boat===actual[0].boat)topOne++;
   if(sorted.slice(0,3).every((x,i)=>x.boat===actual[i].boat))exactTopThree++;
   podiumOverlap+=sorted.slice(0,3).filter(x=>actual.slice(0,3).some(y=>x.boat===y.boat)).length;
  }
  return {...w,races:eligible.length,topOne,exactTopThree,podiumOverlap};
 });
 return {method:'descriptive_postrace_weights_not_backtest',status:'research_only_no_weight_selection',races:eligible.length,candidates:rows,
  selectedWeight:null,eligibleForWeightTuning:0,warning:'No pre-cutoff feature provenance, independent chronological holdout, or valid calibration. Do not choose weights from these results.'};
}
if(process.argv[1]&&new URL(import.meta.url).pathname===process.argv[1]){
 const [input,output]=process.argv.slice(2);if(!input||!output)throw Error('Usage: joined.json output.json');
 const report=describeWeightCandidates(JSON.parse(fs.readFileSync(input,'utf8')));
 fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({races:report.races,candidates:report.candidates,selectedWeight:null}));
}
