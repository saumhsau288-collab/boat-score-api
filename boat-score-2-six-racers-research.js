import {expandTableGrid} from './boat-score-2-table-grid-research.js';

// Research-only verified extraction. Every racer must occupy its own 4-row
// rowspan block and match an explicit profile ID. No partial output is accepted.
const plain=s=>String(s||'').replace(/<[^>]*>/g,' ').replace(/&nbsp;|&#160;/gi,' ').replace(/\s+/g,' ').trim();
const firstNumber=(html,index)=>{const matches=plain(html).match(/\d+(?:\.\d+)?/g)||[];return matches[index]===undefined?null:Number(matches[index]);};
const boatNumber=s=>{const t=plain(s).normalize('NFKC');return /^[1-6]$/.test(t)?Number(t):null;};
function racerName(html,id) {
 const links=[...String(html||'').matchAll(/<a\b[^>]*href=[\"']([^\"']*)[\"'][^>]*>([\s\S]*?)<\/a>/gi)]
   .filter(m=>m[1].includes('racersearch/profile')&&m[1].includes('toban='+id));
 if(links.length!==1)return null;
 const name=plain(links[0][2]);
 return name&&name.length<=60&&!/^[0-9]+$/.test(name)?name:null;
}
function profileId(html) {
 const match=String(html||'').match(/(?:\?|&)toban=(\d{4})(?:[&#"']|$)/i);
 return match?match[1]:null;
}
export function extractSixOfficialRacers(html) {
 if(typeof html!=='string'||html.length>2_000_000) return {verified:false,reason:'invalid_html',racers:[]};
 const tables=[...html.matchAll(/<table\b[^>]*>[\s\S]*?<\/table>/gi)].map(m=>m[0]);
 for(const table of tables) {
  if(!/全国/.test(table)||!/当地/.test(table)||!/モーター/.test(table))continue;
  let grid;
  try{grid=expandTableGrid(table);}catch{return {verified:false,reason:'invalid_table_grid',racers:[]};}
  if(grid.length<4||grid[0].length<8)continue;
  const heads=grid[0].slice(0,8).map(c=>plain(c?.html));
  if(heads[0]!=='枠'||heads[4]!=='全国'||heads[5]!=='当地'||heads[6]!=='モーター')continue;
  const racers=[];
  const seenBoats=new Set(),seenIds=new Set();
  for(let i=3;i<grid.length;i++){
   const row=grid[i];
   if(!row?.[0]||row[0].originRow!==i)continue;
   const boat=boatNumber(row[0].html);
   if(!boat)continue;
   if(row[0].originCol!==0||i+3>=grid.length) return {verified:false,reason:'invalid_boat_block',racers:[]};
   for(let j=0;j<4;j++){
    if(grid[i+j]?.[0]!==row[0]) return {verified:false,reason:'boat_rowspan_not_four',racers:[]};
    for(const col of [2,3,4,5,6]){
     if(grid[i+j]?.[col]!==row[col])return {verified:false,reason:'metric_rowspan_mismatch',racers:[]};
    }
   }
   const identityHtml=row[2]?.html||'';
   const racerId=profileId(identityHtml);
   const identityText=plain(identityHtml);
   if(!racerId||!identityText.includes(racerId))return {verified:false,reason:'racer_identity_unverified',racers:[]};
   const name=racerName(identityHtml,racerId);
   const st=firstNumber(row[3]?.html,2); // F0 L0 0.14
   const nationalWinRate=firstNumber(row[4]?.html,0);
   const localWinRate=firstNumber(row[5]?.html,0);
   const motorTwoWinRate=firstNumber(row[6]?.html,1); // No, 2連率, 3連率
   if([nationalWinRate,localWinRate,motorTwoWinRate].some(v=>v===null)||
     (st!==null&&(st<0||st>1))||nationalWinRate<0||nationalWinRate>10||
     localWinRate<0||localWinRate>10||motorTwoWinRate<0||motorTwoWinRate>100)
    return {verified:false,reason:'invalid_metric_values',racers:[],diagnostics:{boat,racerId,st,nationalWinRate,localWinRate,motorTwoWinRate,raw:{st:plain(row[3]?.html).slice(0,120),national:plain(row[4]?.html).slice(0,120),local:plain(row[5]?.html).slice(0,120),motor:plain(row[6]?.html).slice(0,120)}}};
   if(seenBoats.has(boat)||seenIds.has(racerId))
    return {verified:false,reason:'duplicate_boat_or_racer',racers:[]};
   seenBoats.add(boat);seenIds.add(racerId);
   racers.push({boat,racerId,name,averageSt:st,averageStAvailable:st!==null,nationalWinRate,localWinRate,motorTwoWinRate});
  }
  const verified=racers.length===6&&[1,2,3,4,5,6].every(b=>seenBoats.has(b));
  return {verified,racers:verified?racers.sort((a,b)=>a.boat-b.boat):[],
   reason:verified?null:'six_boat_mapping_incomplete'};
 }
 return {verified:false,reason:'official_grouped_table_not_found',racers:[]};
}
