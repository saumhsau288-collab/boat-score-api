// Research-only parser: actual race start ST and entry order from saved official result HTML.
// These are POST-RACE outcomes, never prediction-time features or calibration inputs.
const strip = s => s.replace(/<[^>]+>/g,' ').replace(/&nbsp;|&#160;/gi,' ').replace(/\s+/g,' ').trim();
export function extractOfficialActualStart(html){
 if(typeof html!=='string')return {status:'invalid_html',starts:[],eligibleForCalibration:false};
 const table=[...html.matchAll(/<table\b[^>]*>([\s\S]*?)<\/table>/gi)]
  .map(m=>m[1]).find(s=>/<th[^>]*>\s*スタート情報\s*<\/th>/i.test(s));
 if(!table)return {status:'start_table_missing',starts:[],eligibleForCalibration:false};
 const rows=[...table.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)].map(m=>m[1]);
 const starts=[];
 for(const row of rows){
  const boat=Number(row.match(/class=["'][^"']*\btable1_boatImage1Number\b[^"']*["'][^>]*>\s*([1-6])\s*<\/span>/i)?.[1]);
  const inner=row.match(/class=["'][^"']*\btable1_boatImage1TimeInner\b[^"']*["'][^>]*>([\s\S]*?)<\/span>/i)?.[1];
  if(!boat||inner===undefined)continue;
  const value=strip(inner);
  const match=value.match(/^([FL])?\s*([+-]?\d?\.\d{1,2})\b/i);
  // A false start or late start is not silently treated as an ordinary numeric ST.
  starts.push({boat,entryCourse:starts.length+1,st:match&&!match[1]?Number(match[2]):null,rawST:value,startStatus:match?.[1]??null});
 }
 const valid=starts.length===6&&new Set(starts.map(x=>x.boat)).size===6&&
  starts.every(x=>Number.isInteger(x.boat)&&x.boat>=1&&x.boat<=6&&
   (x.st===null||(Number.isFinite(x.st)&&x.st>=-1&&x.st<=1)));
 return {status:valid?'parsed_needs_independent_review':'start_table_incomplete',
  starts:valid?starts:[],eligibleForCalibration:false,
  warning:'Post-race start information; no independently authenticated pre-race inputs.'};
}
