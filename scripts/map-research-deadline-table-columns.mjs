// Research-only strict table-column extraction. Do not authenticate race cutoffs.
export function mapResearchDeadlineTableColumns(html){
 if(typeof html!=='string')return {status:'invalid_html',verified:false};
 const tables=[...html.matchAll(/<table\b[^>]*>[\s\S]*?<\/table>/gi)];
 const text=x=>x.replace(/<[^>]*>/g,' ').replace(/&nbsp;|&#160;/g,' ').replace(/\s+/g,' ').trim();
 for(const match of tables){
  const rows=[...match[0].matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)].map(x=>x[1]);
  let header=null;
  for(const row of rows){
   const cells=[...row.matchAll(/<(?:th|td)\b[^>]*>([\s\S]*?)<\/(?:th|td)>/gi)].map(x=>x[1]);
   const races=cells.map(c=>{const label=text(c).match(/^(\d{1,2})R$/i);const href=c.match(/href=["']([^"']+)["']/i);return label&&href?Number(label[1]):null;});
   if(races.length>=13&&races.slice(-12).every((n,i)=>n===i+1)){header=races;continue;}
   if(header&&cells.length>=13&&/締切予定時刻/.test(text(cells[0]))){
    const times=cells.slice(-12).map(c=>text(c).match(/^(?:[01]?\d|2[0-3]):[0-5]\d$/)?.[0]||null);
    if(times.every(Boolean))return {status:'table_columns_consistent_not_authenticated',raceTimes:times.map((time,i)=>({race:i+1,time})),verified:false};
    return {status:'deadline_row_incomplete',verified:false};
   }
  }
 }
 return {status:'matching_deadline_table_not_found',verified:false};
}
