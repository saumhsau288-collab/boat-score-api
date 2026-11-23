// Research-only paired comparison of equal-score tie policies.
// Input: JSON array of independently captured race records.
// Each row: {date,venue,race,capturedBeforeCutoff:true,officialResultVerified:true,
// actual:[boat,boat,boat],boats:[{boat,course,courseVerified:true,score}, ... six]}
// Never infer course from boat number. Scores must be pre-race snapshots.
import fs from 'node:fs';
const rows=JSON.parse(fs.readFileSync(process.argv[2]||'', 'utf8'));
if(!Array.isArray(rows))throw Error('Expected array');
const results={total:rows.length,eligible:0,excluded:{},changed:0,old:{winner:0,topTwoSet:0,trifecta:0},outer:{winner:0,topTwoSet:0,trifecta:0},examples:[]};
const reject=reason=>results.excluded[reason]=(results.excluded[reason]||0)+1;
const tickets=ranked=>{
 const scores=new Map(ranked.map(x=>[x.boat,x.score]));
 const leader=ranked[0].boat,all=[];
 for(let a=1;a<=6;a++)for(let b=1;b<=6;b++)for(let c=1;c<=6;c++){
  if(a===b||a===c||b===c)continue;
  all.push({pick:[a,b,c],value:scores.get(a)*.56+scores.get(b)*.29+scores.get(c)*.15});
 }
 all.sort((a,b)=>b.value-a.value||a.pick.join('').localeCompare(b.pick.join('')));
 return all.filter(x=>x.pick[0]===leader).slice(0,6).map(x=>x.pick);
};
for(const row of rows){
 if(row?.capturedBeforeCutoff!==true||row?.officialResultVerified!==true){reject('unverified_timing_or_result');continue;}
 if(!Array.isArray(row.boats)||row.boats.length!==6||!Array.isArray(row.actual)||row.actual.length!==3){reject('invalid_shape');continue;}
 const boats=row.boats;
 if(new Set(boats.map(x=>x.boat)).size!==6||new Set(boats.map(x=>x.course)).size!==6||
 boats.some(x=>!Number.isInteger(x.boat)||x.boat<1||x.boat>6||!Number.isInteger(x.course)||x.course<1||x.course>6||x.courseVerified!==true||!Number.isFinite(x.score))||
 new Set(row.actual).size!==3||row.actual.some(x=>!Number.isInteger(x)||x<1||x>6)){reject('invalid_course_score_or_podium');continue;}
 const old=[...boats].sort((a,b)=>b.score-a.score||a.course-b.course);
 const outer=[...boats].sort((a,b)=>b.score-a.score||b.course-a.course);
 const a=tickets(old),b=tickets(outer),key=row.actual.join('-');
 const changed=JSON.stringify(a)!==JSON.stringify(b);
 results.eligible++;if(changed)results.changed++;
 for(const [name,rank,picks] of [['old',old,a],['outer',outer,b]]){
  if(rank[0].boat===row.actual[0])results[name].winner++;
  if(new Set(rank.slice(0,2).map(x=>x.boat)).size===2&&rank.slice(0,2).every(x=>row.actual.slice(0,2).includes(x.boat)))results[name].topTwoSet++;
  if(picks.some(x=>x.join('-')===key))results[name].trifecta++;
 }
 if(changed&&results.examples.length<20)results.examples.push({date:row.date,venue:row.venue,race:row.race,oldLeader:old[0].boat,outerLeader:outer[0].boat,actual:row.actual,oldHit:a.some(x=>x.join('-')===key),outerHit:b.some(x=>x.join('-')===key)});
}
console.log(JSON.stringify({...results,note:'Research-only. Six-ticket formula is not six independent methods. No ROI without verified odds and stakes.'},null,2));
