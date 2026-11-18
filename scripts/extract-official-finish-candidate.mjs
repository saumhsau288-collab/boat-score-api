// Research-only candidate extraction. Never upgrades HTML text to verified official finish evidence.
function plain(value){return value.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,' ').replace(/<[^>]*>/g,' ').replace(/&nbsp;|&#160;/gi,' ').replace(/\s+/g,' ').trim();}
export function extractOfficialFinishCandidate(html){
 if(typeof html!=='string'||!html.length)return {status:'missing_html',verified:false,top3:null};
 const tables=[...html.matchAll(/<table\b[^>]*>[\s\S]*?<\/table>/gi)].map(m=>m[0]);
 const candidates=[];
 for(const table of tables){
  const rows=[...table.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)].map(m=>[...m[1].matchAll(/<(?:td|th)\b[^>]*>([\s\S]*?)<\/(?:td|th)>/gi)].map(c=>plain(c[1])));
  if(!rows.some(cells=>cells.includes('着')&&(cells.includes('艇番')||cells.includes('枠'))))continue;
  const head=rows.findIndex(cells=>cells.includes('着')&&(cells.includes('艇番')||cells.includes('枠')));
  const rankCol=rows[head].indexOf('着'),boatCol=rows[head].indexOf('艇番')>=0?rows[head].indexOf('艇番'):rows[head].indexOf('枠');
  const podium=new Map();let invalid=false;
  for(const cells of rows.slice(head+1)){
   const rank=cells[rankCol],boat=cells[boatCol];
   if(!/^[1-3]$/.test(rank||''))continue;
   if(!/^[1-6]$/.test(boat||'')||podium.has(Number(rank))){invalid=true;break;}
   podium.set(Number(rank),Number(boat));
  }
  if(invalid||podium.size!==3||new Set(podium.values()).size!==3)continue;
  candidates.push([podium.get(1),podium.get(2),podium.get(3)]);
 }
 if(!candidates.length)return {status:'finish_table_not_unambiguously_found',verified:false,top3:null};
 if(candidates.length!==1)return {status:'multiple_finish_tables',verified:false,top3:null};
 return {status:'finish_candidate_needs_independent_verification',verified:false,top3:candidates[0]};
}
