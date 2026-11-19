// Research-only course-normalized historical racer analysis.
// Raw first-place rates alone are misleading because entry courses have different baselines.
import fs from 'node:fs';
import {buildHistoricalRacerCourseProfiles} from './build-historical-racer-course-profiles.mjs';
export function compareRacerCourseToHistoricalBaseline(records,{asOfDate,minRacerStarts=10,minCourseStarts=30}={}){
 if(!Number.isInteger(minRacerStarts)||minRacerStarts<1||!Number.isInteger(minCourseStarts)||minCourseStarts<1)throw Error('Positive minimum sample sizes required');
 // Use the same strict earlier-date, verified-source, duplicate-filtering rules for both cohorts.
 const racer=buildHistoricalRacerCourseProfiles(records,{asOfDate,minStarts:minRacerStarts});
 const overall=buildHistoricalRacerCourseProfiles(records.map(r=>({...r,racerId:'9999'})),{asOfDate,minStarts:minCourseStarts});
 // The pooled calculation must not silently count multiple racers from the same race as duplicate.
 const baseline=new Map(overall.profiles.map(p=>[p.course,p]));
 const rows=racer.profiles.map(p=>{
  const b=baseline.get(p.course);
  const sufficient=p.enoughSamples&&b?.enoughSamples===true;
  return {racerId:p.racerId,course:p.course,racerStarts:p.starts,courseStarts:b?.starts??0,
   racerFirstRate:p.firstRate,courseFirstRate:b?.firstRate??null,
   racerTop3Rate:p.top3Rate,courseTop3Rate:b?.top3Rate??null,
   firstRateDifference:sufficient?p.firstRate-b.firstRate:null,
   top3RateDifference:sufficient?p.top3Rate-b.top3Rate:null,
   sufficientSample:sufficient};
 });
 return {method:'historical_racer_vs_course_baseline',asOfDate,rows,
  rejected:racer.rejected,eligibleForScoreChange:false,
  warning:'Descriptive differences only. No opponent-strength adjustment, no proof of betting edge. Never mix races on/after asOfDate into historical predictions.'};
}
if(process.argv[1]&&new URL(import.meta.url).pathname===process.argv[1]){
 const [input,asOfDate,output]=process.argv.slice(2);
 if(!input||!output)throw Error('Usage: node scripts/compare-racer-course-baselines.mjs <verified-records.json> <YYYYMMDD> <report.json>');
 const report=compareRacerCourseToHistoricalBaseline(JSON.parse(fs.readFileSync(input,'utf8')),{asOfDate});
 fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({profiles:report.rows.length,eligibleForScoreChange:false}));
}
