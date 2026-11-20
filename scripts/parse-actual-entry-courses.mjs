// Actual start-table row order is entry-course order; numbered spans identify boat numbers.
// Post-race actual entry course is an outcome descriptor, not a pre-race scoring input.
export function parseActualEntryCourses(html){
 const reject=reason=>({verified:false,reason,coursesByBoat:[]});
 if(typeof html!=='string')return reject('invalid_html');
 const tables=[...html.matchAll(/<table\b[^>]*>([\s\S]*?)<\/table>/gi)];
 const matches=[];
 for(const [,body] of tables){
  if(!/<th[^>]*>\s*スタート情報\s*<\/th>/i.test(body))continue;
  const rows=[...body.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)].map(m=>m[1]).filter(x=>/<td\b/i.test(x));
  if(rows.length!==6)continue;
  const boats=[];
  for(const row of rows){
   const m=row.match(/<span\b[^>]*class="[^"]*table1_boatImage1Number[^"]*"[^>]*>\s*([1-6])\s*<\/span>/i);
   if(!m){boats.length=0;break;}boats.push(Number(m[1]));
  }
  if(boats.length===6&&new Set(boats).size===6)matches.push(boats.map((boat,i)=>({boat,entryCourse:i+1})).sort((a,b)=>a.boat-b.boat));
 }
 if(matches.length!==1)return reject(matches.length?'ambiguous_start_tables':'six_start_rows_missing');
 return {verified:true,reason:null,coursesByBoat:matches[0]};
}
