// Research-only structural inspection of captured official result HTML.
// Avoid guessing finish positions from unrelated tables or unverified links.
export function inspectOfficialResultMarkup(html){
 if(typeof html!=='string'||!html.length||Buffer.byteLength(html,'utf8')>2_000_000)throw Error('invalid_html');
 const tables=[...html.matchAll(/<table\b[^>]*>([\s\S]*?)<\/table>/gi)];
 const counts={tableCount:tables.length,profileLinkCount:(html.match(/racersearch\/profile/gi)||[]).length,
  resultKeywords:(html.match(/着順|選手名|登録番号|艇番|進入|スタート/gi)||[]).length};
 const tableSamples=tables.slice(0,15).map((m,i)=>{
  const rows=[...m[1].matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)];
  const clean=s=>s.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,'')
   .replace(/<[^>]*>/g,' ').replace(/&(?:nbsp|amp|lt|gt);/gi,' ').replace(/\s+/g,' ').trim().slice(0,240);
  return {tableIndex:i,rowCount:rows.length,rows:rows.slice(0,9).map((r,j)=>({
   rowIndex:j,cellCount:(r[1].match(/<td\b/gi)||[]).length,
   headerCount:(r[1].match(/<th\b/gi)||[]).length,
   profileLinks:(r[1].match(/racersearch\/profile/gi)||[]).length,
   sample:clean(r[1])
  }))};
 });
 return {status:'official_result_markup_diagnostic',...counts,tableSamples,
  verified:false,eligibleForCalibration:false};
}
