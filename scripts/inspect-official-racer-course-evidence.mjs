// Offline inspection of saved official result HTML for racer IDs and actual entry courses.
// Deliberately does not assert verification: HTML markup varies and needs human review.
import fs from 'node:fs';
const officialResultURL=(page)=>{
 try{
  const u=new URL(page.url);
  return u.protocol==='https:'&&u.hostname==='www.boatrace.jp'&&u.pathname==='/owpc/pc/race/raceresult'&&
   u.searchParams.get('hd')===String(page.date)&&Number(u.searchParams.get('jcd'))===Number(page.venue)&&
   Number(u.searchParams.get('rno'))===Number(page.race);
 }catch{return false;}
};
export function inspectOfficialRacerCourseEvidence(report){
 if(!Array.isArray(report?.pages))throw Error('Expected saved official pages[]');
 const rows=report.pages.map(page=>{
  const base={date:page.date,venue:page.venue,race:page.race,url:page.url,
   racerCourseVerified:false,eligibleForHistoricalProfile:false};
  if(page.status!=='raw_html_saved'||typeof page.html!=='string')return {...base,status:'not_saved',racerIds:[],entryCourseCandidates:[]};
  if(!officialResultURL(page))return {...base,status:'invalid_official_result_identity',racerIds:[],entryCourseCandidates:[]};
  const html=page.html;
  // Only inspect the presence of links and course headings, not guess course from boat number.
  const racerIds=[...new Set([...html.matchAll(/(?:[?&]|&amp;)toban=(\d{4,6})(?=[&#"'\s]|$)/g)].map(m=>m[1]))];
  const entryCourseHeadings=[...html.matchAll(/<(?:th|td)\b[^>]*>\s*(?:進入|コース)\s*<\/(?:th|td)>/gi)].length;
  const finishTablePresent=/<th[^>]*>\s*着\s*<\/th>/i.test(html);
  return {...base,status:'needs_independent_structure_review',racerIds,entryCourseHeadings,finishTablePresent,
   racerCountCandidate:racerIds.length,
   entryCourseCandidates:[],
   missing:[
    ...(racerIds.length!==6?['six_racer_ids_not_confirmed']:[]),
    'six_actual_entry_courses_not_confirmed',
    'racer_to_finish_and_course_mapping_not_confirmed'
   ]};
 });
 return {method:'offline_official_racer_course_evidence_inspection',rows,
  verifiedRacerCourses:0,eligibleForHistoricalProfile:0,
  warning:'Racer links are candidates only. Do not equate boat number with actual entry course or infer mappings from page text. Independently inspect official table structure.'};
}
if(process.argv[1]&&new URL(import.meta.url).pathname===process.argv[1]){
 const [input,output]=process.argv.slice(2);
 if(!input||!output)throw Error('Usage: node scripts/inspect-official-racer-course-evidence.mjs <saved-pages.json> <report.json>');
 const result=inspectOfficialRacerCourseEvidence(JSON.parse(fs.readFileSync(input,'utf8')));
 fs.writeFileSync(output,JSON.stringify(result,null,2)+'\n');
 console.log(JSON.stringify({pages:result.rows.length,withSixRacerIdCandidates:result.rows.filter(r=>r.racerCountCandidate===6).length,verifiedRacerCourses:0}));
}
