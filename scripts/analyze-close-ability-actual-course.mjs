import fs from 'node:fs';
import path from 'node:path';
import {parseActualEntryCourses} from './parse-actual-entry-courses.mjs';
import {analyzeCourseZonePairs} from './analyze-slow-dash-zone-proxy.mjs';
import {joinHistoricalRacelistAndResults} from './join-historical-racelist-result-identities.mjs';
const dir=process.argv[2]||'prediction-captures';
const files=fs.readdirSync(dir).filter(f=>/^research-historical-racelist-\d{8}-\d{2}-\d{1,2}\.json$/.test(f));
const score=r=>45*r.nationalWinRate/10+25*(r.localWinRate===0?r.nationalWinRate:r.localWinRate)/10+15*r.motorTwoWinRate/100;
const stats={};for(const t of [3,5,10])stats[t]={pairs:0,innerAhead:0,innerWinner:0,outerWinner:0,innerSecond:0,outerSecond:0,innerHigherScore:0,outerHigherScore:0,tiedScore:0,innerLowerScorePairs:0,innerLowerScoreAhead:0,innerHigherScorePairs:0,innerHigherScoreAhead:0};
const zoneProxyTotals={};for(const t of [3,5,10])zoneProxyTotals[t]={};
const zoneRaceMajorities={};for(const t of [3,5,10])zoneRaceMajorities[t]=Object.fromEntries(['both_inner_1to3','both_outer_4to6','inner_vs_outer'].map(k=>[k,{races:0,innerAheadMajority:0,outerAheadMajority:0,tied:0}]));
const perRace=[];let parsedCourses=0,joinedRaces=0;const raceLevel=Object.fromEntries([3,5,10].map(t=>[t,{racesWithLowerScoredInner:0,racesInnerAheadMajority:0,racesOuterAheadMajority:0,racesTied:0}]));
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
 const zones=analyzeCourseZonePairs(rows);for(const [threshold,categories] of Object.entries(zones))for(const [category,values] of Object.entries(categories)){const target=zoneProxyTotals[threshold][category]??{};for(const [k,v] of Object.entries(values))target[k]=(target[k]??0)+v;zoneProxyTotals[threshold][category]=target;}
 for(const [threshold,categories] of Object.entries(zones))for(const [category,values] of Object.entries(categories)){if(values.pairs===0)continue;const s=zoneRaceMajorities[threshold][category];s.races++;if(values.innerAhead>values.pairs-values.innerAhead)s.innerAheadMajority++;else if(values.innerAhead<values.pairs-values.innerAhead)s.outerAheadMajority++;else s.tied++;}
 const raceCounts=Object.fromEntries([3,5,10].map(t=>[t,{ahead:0,behind:0}]));
 for(let i=0;i<6;i++)for(let j=i+1;j<6;j++){
  const [inner,outer]=[rows[i],rows[j]].sort((a,b)=>a.entryCourse-b.entryCourse);
  const gap=Math.abs(inner.score-outer.score);
  for(const threshold of [3,5,10]){
   if(gap>threshold)continue;
   const s=stats[threshold];s.pairs++;
   if(inner.finish<outer.finish)s.innerAhead++;
   if(inner.finish===1)s.innerWinner++;if(outer.finish===1)s.outerWinner++;
   if(inner.finish===2)s.innerSecond++;if(outer.finish===2)s.outerSecond++;
   if(inner.score<outer.score){if(inner.finish<outer.finish)raceCounts[threshold].ahead++;else raceCounts[threshold].behind++;}
   if(inner.score>outer.score){s.innerHigherScore++;s.innerHigherScorePairs++;if(inner.finish<outer.finish)s.innerHigherScoreAhead++;}else if(inner.score<outer.score){s.outerHigherScore++;s.innerLowerScorePairs++;if(inner.finish<outer.finish)s.innerLowerScoreAhead++;}else s.tiedScore++;
  }
 }
 for(const threshold of [3,5,10]){const counts=raceCounts[threshold];if(counts.ahead+counts.behind===0)continue;const summary=raceLevel[threshold];summary.racesWithLowerScoredInner++;if(counts.ahead>counts.behind)summary.racesInnerAheadMajority++;else if(counts.ahead<counts.behind)summary.racesOuterAheadMajority++;else summary.racesTied++;}
 perRace.push({key,status:'paired',raceCounts,courses:courses.coursesByBoat,actualFirstCourse:rows.find(r=>r.finish===1)?.entryCourse,actualSecondCourse:rows.find(r=>r.finish===2)?.entryCourse});
}
const report={status:'retrospective_actual_course_close_ability_diagnostic',parsedCourses,joinedRaces,stats,raceLevel,zoneProxyTotals,zoneRaceMajorities,perRace,eligibleForWeightTuning:false,eligibleForDeployment:false,warning:'Actual course and results are post-race descriptors. Official historical racelist metrics are not independently authenticated as pre-race snapshots. Zone 1-3 vs 4-6 is a course-position proxy, NOT verified slow/dash style. Pairwise observations are dependent and not a predictive holdout.'};
fs.writeFileSync(path.join(dir,'actual-course-close-ability-diagnostic.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({...report,perRace:undefined}));
