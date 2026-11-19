// Offline conversion of independently reviewed six-boat official race records.
// Reject incomplete races; do not infer actual entry course from boat number.
import fs from 'node:fs';
const validDate=s=>typeof s==='string'&&/^20\d{6}$/.test(s)&&(()=>{
 const y=+s.slice(0,4),m=+s.slice(4,6),d=+s.slice(6),x=new Date(Date.UTC(y,m-1,d));
 return x.getUTCFullYear()===y&&x.getUTCMonth()+1===m&&x.getUTCDate()===d;
})();
const validSource=s=>{try{const u=new URL(s);return u.protocol==='https:'&&(u.hostname==='boatrace.jp'||u.hostname.endsWith('.boatrace.jp'))&&u.pathname==='/owpc/pc/race/raceresult';}catch{return false;}};
export function exportReviewedRacerCourseRecords(races,{asOfDate}={}){
 if(!Array.isArray(races)||!validDate(asOfDate))throw Error('races[] and valid asOfDate required');
 const records=[],rejected=[];
 const seen=new Set();
 for(const r of races){
  const key=[r?.date,r?.venue,r?.race].join(':');
  const issues=[];
  if(!validDate(r?.date)||!Number.isInteger(r?.venue)||r.venue<1||r.venue>24||!Number.isInteger(r?.race)||r.race<1||r.race>12)issues.push('invalid_race_identity');
  if(validDate(r?.date)&&r.date>=asOfDate)issues.push('not_earlier_than_as_of');
  if(seen.has(key))issues.push('duplicate_race');seen.add(key);
  if(!validSource(r?.sourceUrl))issues.push('invalid_official_source');
  else{
   const u=new URL(r.sourceUrl);
   if(u.searchParams.get('hd')!==r.date||Number(u.searchParams.get('jcd'))!==r.venue||Number(u.searchParams.get('rno'))!==r.race)issues.push('source_race_mismatch');
  }
  if(r?.independentlyReviewed!==true)issues.push('independent_review_required');
  if(!Array.isArray(r?.entrants)||r.entrants.length!==6)issues.push('six_entrants_required');
  else{
   const checks=[['racerId',x=>typeof x==='string'&&/^\d{4,6}$/.test(x)],
    ['boat',x=>Number.isInteger(x)&&x>=1&&x<=6],
    ['course',x=>Number.isInteger(x)&&x>=1&&x<=6],
    ['finish',x=>Number.isInteger(x)&&x>=1&&x<=6]];
   for(const [field,ok] of checks)
    if(!r.entrants.every(x=>ok(x?.[field]))||new Set(r.entrants.map(x=>x?.[field])).size!==6)
     issues.push('invalid_or_duplicate_'+field);
  }
  if(issues.length){rejected.push({key,issues});continue;}
  for(const entrant of r.entrants)records.push({date:r.date,venue:r.venue,race:r.race,
   racerId:entrant.racerId,boat:entrant.boat,course:entrant.course,finish:entrant.finish,
   sourceUrl:r.sourceUrl,historicalRecordVerified:true});
 }
 return {method:'export_reviewed_racer_course_records',asOfDate,records,
  acceptedRaces:records.length/6,rejected,eligibleForScoreChange:false,
  warning:'independentlyReviewed is an asserted review flag, not cryptographic proof. Only mark after human inspection of official six-entrant table and actual entry courses.'};
}
if(process.argv[1]&&new URL(import.meta.url).pathname===process.argv[1]){
 const [input,asOfDate,output]=process.argv.slice(2);
 if(!input||!output)throw Error('Usage: node scripts/export-reviewed-racer-course-records.mjs <reviewed-races.json> <YYYYMMDD> <records.json>');
 const result=exportReviewedRacerCourseRecords(JSON.parse(fs.readFileSync(input,'utf8')),{asOfDate});
 fs.writeFileSync(output,JSON.stringify(result,null,2)+'\n');
 console.log(JSON.stringify({acceptedRaces:result.acceptedRaces,rejected:result.rejected.length}));
}
