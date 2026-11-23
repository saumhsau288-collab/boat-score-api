// Offline parsing of racer registration numbers and finish order from saved official
// raceresult HTML. Entry courses derive only from an explicit six-boat start order.
import fs from 'node:fs';
const num=s=>Number(String(s).replace(/[０-９]/g,c=>String(c.charCodeAt(0)-65296)));
const text=s=>s.replace(/<[^>]*>/g,' ').replace(/&nbsp;|&#160;/g,' ').replace(/\s+/g,' ').trim();
export function extractOfficialResultRacers(report){
 if(!Array.isArray(report?.pages))throw Error('Expected saved official pages[]');
 const rows=report.pages.map(p=>{
  const base={date:p.date,venue:p.venue,race:p.race,url:p.url,
   racerFinishIndependentlyVerified:false,actualEntryCoursesVerified:false,eligibleForScoreChange:false};
  if(p.status!=='raw_html_saved'||typeof p.html!=='string')return {...base,status:'not_saved',racers:[]};
  let u;
  try{u=new URL(p.url);}catch{return {...base,status:'invalid_official_identity',racers:[]};}
  if(u.protocol!=='https:'||u.hostname!=='www.boatrace.jp'||u.pathname!=='/owpc/pc/race/raceresult'||
   u.searchParams.get('hd')!==p.date||Number(u.searchParams.get('jcd'))!==p.venue||
   Number(u.searchParams.get('rno'))!==p.race)return {...base,status:'invalid_official_identity',racers:[]};
  const table=p.html.match(/<table\b[^>]*class=["'][^"']*\bis-w495\b[^"']*["'][^>]*>([\s\S]*?)<\/table>/i)?.[1];
  if(!table||!/<th[^>]*>\s*着\s*<\/th>/i.test(table)||!/<th[^>]*>\s*枠\s*<\/th>/i.test(table)||!table.includes('ボートレーサー'))
   return {...base,status:'finish_table_not_found',racers:[],eligibleForScoreChange:false};
  const racers=[];
  for(const match of table.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)){
   const cells=[...match[1].matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map(m=>m[1]);
   if(cells.length!==4)continue;
   const rankText=text(cells[0]);
   const rank=/^[１-６1-6]$/.test(rankText)?num(rankText):null;
   const resultStatus=rank===null?rankText:null;
   const boat=num(text(cells[1]));
   const racerId=cells[2].match(/<span\b[^>]*class=["'][^"']*\bis-fs12\b[^"']*["'][^>]*>\s*(\d{4,6})\s*<\/span>/i)?.[1];
   const racerName=cells[2].match(/<span\b[^>]*class=["'][^"']*\bis-fs18\b[^"']*["'][^>]*>([\s\S]*?)<\/span>/i)?.[1];
   if((rank===null&&!/^(転|落|妨|失|欠|不|Ｆ|Ｌ|F|L|転覆|落水|失格|欠場|不完走)$/.test(resultStatus))||!Number.isInteger(boat)||!racerId||!racerName)continue;
   racers.push({finish:rank,resultStatus,boat,racerId,name:text(racerName),actualEntryCourse:null});
  }
  const ranks=racers.map(r=>r.finish).filter(Number.isInteger);
  const valid=racers.length===6&&new Set(ranks).size===ranks.length&&
   ranks.every((rank,i)=>rank>=1&&rank<=6)&&
   [1,2,3].every(rank=>ranks.includes(rank))&&
   new Set(racers.map(r=>r.boat)).size===6&&new Set(racers.map(r=>r.racerId)).size===6&&
   racers.every(r=>r.boat>=1&&r.boat<=6);
  // The official start information table is ordered by actual entry course.
  // Do not infer the course from the boat's color, number, or finishing order.
  const startTable=[...p.html.matchAll(/<table\b[^>]*>([\s\S]*?)<\/table>/gi)]
   .map(m=>m[1]).find(t=>/<th[^>]*>\s*スタート情報\s*<\/th>/i.test(t));
  const startBoats=startTable?[...startTable.matchAll(/<span\b[^>]*class=["'][^"']*\btable1_boatImage1Number\b[^"']*["'][^>]*>\s*([1-6])\s*<\/span>/gi)]
   .map(m=>Number(m[1])):[];
  const startOrderValid=startBoats.length===6&&new Set(startBoats).size===6&&
   startBoats.every(b=>b>=1&&b<=6);
  const entryCourses=valid&&startOrderValid?Object.fromEntries(startBoats.map((boat,index)=>[boat,index+1])):null;
  if(entryCourses)for(const racer of racers)racer.actualEntryCourse=entryCourses[racer.boat];
  return {...base,status:valid?'parsed_needs_independent_review':'racer_finish_mapping_incomplete',
   startOrderBoats:startOrderValid?startBoats:null,entryCoursesExtracted:!!entryCourses,
   racers:valid?racers:[],podium:valid?racers.filter(r=>Number.isInteger(r.finish)&&r.finish<=3).sort((a,b)=>a.finish-b.finish).map(r=>r.boat):null};
 });
 return {method:'saved_official_result_racer_finish_parser',rows,parsedRaces:rows.filter(r=>r.status==='parsed_needs_independent_review').length,
  independentlyVerifiedRaces:0,eligibleForHistoricalProfile:0,
  warning:'Non-finish statuses (e.g. 転) are preserved as null finish; start-order-derived courses require independent review; no scoring changes.'};
}
if(process.argv[1]&&new URL(import.meta.url).pathname===process.argv[1]){
 const [input,output]=process.argv.slice(2);
 if(!input||!output)throw Error('Usage: node scripts/extract-official-result-racers.mjs <saved.official-raw.json> <racer-results.json>');
 const result=extractOfficialResultRacers(JSON.parse(fs.readFileSync(input,'utf8')));
 fs.writeFileSync(output,JSON.stringify(result,null,2)+'\n');
 console.log(JSON.stringify({pages:result.rows.length,parsedRaces:result.parsedRaces,independentlyVerifiedRaces:0}));
}
