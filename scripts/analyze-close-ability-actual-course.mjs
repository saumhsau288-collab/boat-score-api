import fs from 'node:fs';
import path from 'node:path';
import {parseActualEntryCourses} from './parse-actual-entry-courses.mjs';
import {joinHistoricalRacelistAndResults} from './join-historical-racelist-result-identities.mjs';
const dir=process.argv[2]||'prediction-captures';
const files=fs.readdirSync(dir).filter(f=>/^research-historical-racelist-\d{8}-\d{2}-\d{1,2}\.json$/.test(f));
const score=r=>45*r.nationalWinRate/10+25*(r.localWinRate===0?r.nationalWinRate:r.localWinRate)/10+15*r.motorTwoWinRate/100;
const stats={};for(const t of [3,5,10])stats[t]={pairs:0,innerAhead:0,innerWinner:0,outerWinner:0,innerSecond:0,outerSecond:0,innerHigherScore:0,outerHigherScore:0,tiedScore:0};
const perRace=[];let parsedCourses=0,joinedRaces=0;
for(const f of files){
 const key=f.slice('research-historical-racelist-'.length,-5),base='research-result-'+key;
 const htmlPath=path.join(dir,base+'.html'),resultPath=path.join(dir,base+'-structure.json');
 if(!fs.existsSync(htmlPath)||!fs.existsSync(resultPath))continue;
 const courses=parseActualEntryCourses(fs.readFileSync(htmlPath,'utf8'));
 if(!courses.verified){perRace.push({key,status:'course_missing',reason:courses.reason});continue;}
 parsedCourses++;
 const joined=joinHistoricalRacelistAndResults(JSON.parse(fs.readFileSync(path.join(dir,f),'utf8')),JSON.parse(fs.readFileSync(resultPath,'utf8')));
 if(joined.status!=='retrospective_racer_identity_join'){perRace.push({key,status:'finish_join_missing',reason:joined.reason});continue;}
 joinedRaces++;
 const rows=joined.rows.map(r=>({...r,entryCourse:courses.coursesByBoat.find(c=>c.boat===r.boat).entryCourse,score:score(r)}));
 if(rows.some(r=>!Number.isFinite(r.score)))continue;
 for(let i=0;i<6;i++)for(let j=i+1;j<6;j++){
  const [inner,outer]=[rows[i],rows[j]].sort((a,b)=>a.entryCourse-b.entryCourse);
  const gap=Math.abs(inner.score-outer.score);
  for(const threshold of [3,5,10]){
   if(gap>threshold)continue;
   const s=stats[threshold];s.pairs++;
   if(inner.finish<outer.finish)s.innerAhead++;
   if(inner.finish===1)s.innerWinner++;if(outer.finish===1)s.outerWinner++;
   if(inner.finish===2)s.innerSecond++;if(outer.finish===2)s.outerSecond++;
   if(inner.score>outer.score)s.innerHigherScore++;else if(inner.score<outer.score)s.outerHigherScore++;else s.tiedScore++;
  }
 }
 perRace.push({key,status:'paired',courses:courses.coursesByBoat,actualFirstCourse:rows.find(r=>r.finish===1)?.entryCourse,actualSecondCourse:rows.find(r=>r.finish===2)?.entryCourse});
}
const report={status:'retrospective_actual_course_close_ability_diagnostic',parsedCourses,joinedRaces,stats,perRace,eligibleForWeightTuning:false,eligibleForDeployment:false,warning:'Actual course and results are post-race descriptors. Official historical racelist metrics are not independently authenticated as pre-race snapshots. Pairwise observations are dependent and not a predictive holdout.'};
fs.writeFileSync(path.join(dir,'actual-course-close-ability-diagnostic.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({...report,perRace:undefined}));
