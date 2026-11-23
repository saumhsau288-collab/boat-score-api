// Research-only three-arm comparison. No production writes.
// Scores and entry courses must be independently preserved before race cutoff.
import fs from 'node:fs';
export function compareThreeTiePolicies(rows){
 if(!Array.isArray(rows))throw Error('Expected array');
 const report={total:rows.length,eligible:0,changedFromBaseline:{winnerOnly:0,fullExclusion:0},excluded:{},arms:{baseline:{winner:0,topTwoSet:0,trifecta:0},winnerOnly:{winner:0,topTwoSet:0,trifecta:0},fullExclusion:{winner:0,topTwoSet:0,trifecta:0,insufficientTickets:0}},examples:[]};
 const reject=k=>report.excluded[k]=(report.excluded[k]||0)+1;
 for(const row of rows){
  if(row?.capturedBeforeCutoff!==true||row?.officialResultVerified!==true){reject('unverified_capture_or_result');continue;}
  const bs=row.boats,actual=row.actual;
  if(!Array.isArray(bs)||bs.length!==6||!Array.isArray(actual)||actual.length!==3){reject('invalid_shape');continue;}
  if(new Set(bs.map(b=>b.boat)).size!==6||new Set(bs.map(b=>b.course)).size!==6||
   bs.some(b=>!Number.isInteger(b.boat)||b.boat<1||b.boat>6||!Number.isInteger(b.course)||b.course<1||b.course>6||b.courseVerified!==true||!Number.isFinite(b.score))||
   new Set(actual).size!==3||actual.some(n=>!Number.isInteger(n)||n<1||n>6)){reject('invalid_boats_courses_scores_or_result');continue;}
  const inner=[...bs].sort((a,b)=>b.score-a.score||a.course-b.course);
  const outer=[...bs].sort((a,b)=>b.score-a.score||b.course-a.course);
  // C removes only the inner member(s) of an EXACT score tie; no rounded ties.
  const maxCourseByScore=new Map();
  for(const b of bs)maxCourseByScore.set(b.score,Math.max(maxCourseByScore.get(b.score)??0,b.course));
  const survivors=bs.filter(b=>b.course===maxCourseByScore.get(b.score));
  const make=(rank,allowed)=>{
   const score=new Map(bs.map(b=>[b.boat,b.score]));
   const leader=rank[0]?.boat;
   const all=[];
   for(const a of allowed)for(const b of allowed)for(const c of allowed){
    if(a===b||a===c||b===c)continue;
    all.push({pick:[a,b,c],value:score.get(a)*.56+score.get(b)*.29+score.get(c)*.15});
   }
   all.sort((x,y)=>y.value-x.value||x.pick.join('').localeCompare(y.pick.join('')));
   return all.filter(x=>x.pick[0]===leader).slice(0,6).map(x=>x.pick);
  };
  const all=bs.map(b=>b.boat);
  const picks={baseline:make(inner,all),winnerOnly:make(outer,all),fullExclusion:make([...survivors].sort((a,b)=>b.score-a.score||b.course-a.course),survivors.map(b=>b.boat))};
  if(picks.fullExclusion.length<6)report.arms.fullExclusion.insufficientTickets++;
  report.eligible++;
  for(const [name,rank] of [['baseline',inner],['winnerOnly',outer],['fullExclusion',[...survivors].sort((a,b)=>b.score-a.score||b.course-a.course)]]){
   const r=report.arms[name];
   if(rank[0]?.boat===actual[0])r.winner++;
   if(rank.length>=2&&rank.slice(0,2).every(x=>actual.slice(0,2).includes(x.boat)))r.topTwoSet++;
   if(picks[name].some(x=>x.join('-')===actual.join('-')))r.trifecta++;
  }
  for(const name of ['winnerOnly','fullExclusion'])if(JSON.stringify(picks[name])!==JSON.stringify(picks.baseline))report.changedFromBaseline[name]++;
  if(report.examples.length<20&&(JSON.stringify(picks.winnerOnly)!==JSON.stringify(picks.baseline)||JSON.stringify(picks.fullExclusion)!==JSON.stringify(picks.baseline)))report.examples.push({date:row.date,venue:row.venue,race:row.race,actual,leaders:{baseline:inner[0].boat,winnerOnly:outer[0].boat,fullExclusion:survivors.sort((a,b)=>b.score-a.score||b.course-a.course)[0]?.boat},tickets:picks});
 }
 return {...report,note:'Research only. No authenticated historical sample implied; six tickets are not six independent strategies. Full exclusion may produce fewer than six tickets.'};
}
if(process.argv[1]&&import.meta.url===new URL('file://'+process.argv[1]).href){
 const rows=JSON.parse(fs.readFileSync(process.argv[2]||'', 'utf8'));
 console.log(JSON.stringify(compareThreeTiePolicies(rows),null,2));
}
