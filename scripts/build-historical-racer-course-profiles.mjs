// Offline, research-only racer-course profiles built strictly from earlier races.
// Input records must have verified race date, racer, ACTUAL entry course, finish and provenance.
// No deployment, no inferred current odds, and no claims of profitability.
import fs from 'node:fs';
const validDate=s=>{
 if(typeof s!=='string'||!/^20\d{6}$/.test(s))return false;
 const y=+s.slice(0,4),m=+s.slice(4,6),d=+s.slice(6);
 const x=new Date(Date.UTC(y,m-1,d));
 return x.getUTCFullYear()===y&&x.getUTCMonth()+1===m&&x.getUTCDate()===d;
};
const validRow=r=>validDate(r?.date)&&Number.isInteger(r?.venue)&&r.venue>=1&&r.venue<=24&&
 Number.isInteger(r?.race)&&r.race>=1&&r.race<=12&&
 typeof r?.racerId==='string'&&/^[0-9]{4,6}$/.test(r.racerId)&&
 Number.isInteger(r?.course)&&r.course>=1&&r.course<=6&&
 Number.isInteger(r?.finish)&&r.finish>=1&&r.finish<=6&&
 r?.historicalRecordVerified===true&&typeof r?.sourceUrl==='string'&&
 (()=>{try{const u=new URL(r.sourceUrl);return u.protocol==='https:'&&(u.hostname==='boatrace.jp'||u.hostname.endsWith('.boatrace.jp'));}catch{return false;}})();
const key=r=>[r.date,r.venue,r.race,r.racerId].join(':');
export function buildHistoricalRacerCourseProfiles(records,{asOfDate,minStarts=10}={}){
 if(!Array.isArray(records)||!validDate(asOfDate))throw Error('Verified records and valid asOfDate required');
 if(!Number.isInteger(minStarts)||minStarts<1||minStarts>1000)throw Error('Invalid minStarts');
 const duplicates=new Map();
 for(const r of records)if(validRow(r)&&r.date<asOfDate)duplicates.set(key(r),(duplicates.get(key(r))||0)+1);
 const groups=new Map(),rejected={invalid:0,notEarlier:0,duplicate:0};
 for(const r of records){
  if(!validRow(r)){rejected.invalid++;continue;}
  if(r.date>=asOfDate){rejected.notEarlier++;continue;}
  if(duplicates.get(key(r))!==1){rejected.duplicate++;continue;}
  const k=r.racerId+':'+r.course;
  if(!groups.has(k))groups.set(k,{racerId:r.racerId,course:r.course,starts:0,firsts:0,seconds:0,thirds:0,top3:0});
  const g=groups.get(k);g.starts++;
  if(r.finish===1)g.firsts++;
  if(r.finish===2)g.seconds++;
  if(r.finish===3)g.thirds++;
  if(r.finish<=3)g.top3++;
 }
 const profiles=[...groups.values()].sort((a,b)=>a.racerId.localeCompare(b.racerId)||a.course-b.course).map(g=>({
  ...g,firstRate:g.firsts/g.starts,top3Rate:g.top3/g.starts,
  enoughSamples:g.starts>=minStarts,
  note:g.starts>=minStarts?'historical descriptive rate only':'insufficient sample; do not treat as course advantage'
 }));
 return {method:'historical_course_profiles_as_of_date',asOfDate,minStarts,profiles,rejected,
  eligibleForScoreChange:false,eligibleForReturnClaim:false,
  warning:'Only independently verified races strictly before asOfDate; descriptive rates are not course-adjusted causal effects. Compare against course baseline and use held-out races before modifying scoring.'};
}
if(process.argv[1]&&new URL(import.meta.url).pathname===process.argv[1]){
 const [input,asOfDate,output]=process.argv.slice(2);
 if(!input||!output)throw Error('Usage: node scripts/build-historical-racer-course-profiles.mjs <verified-records.json> <YYYYMMDD> <output.json>');
 const result=buildHistoricalRacerCourseProfiles(JSON.parse(fs.readFileSync(input,'utf8')),{asOfDate});
 fs.writeFileSync(output,JSON.stringify(result,null,2)+'\n');
 console.log(JSON.stringify({profiles:result.profiles.length,rejected:result.rejected,eligibleForScoreChange:false}));
}
