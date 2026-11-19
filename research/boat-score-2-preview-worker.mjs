// Isolated preview Worker only. Never deploy over the original Boat Score.
// Public official racelist; assumed boat-order entry, not verified exhibition.
const cors={'access-control-allow-origin':'*','access-control-allow-methods':'GET,OPTIONS','access-control-allow-headers':'content-type'};
const reply=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store',...cors}});
const clean=s=>s.replace(/<[^>]+>/g,' ').replace(/&nbsp;|&#160;|&#xA0;/gi,' ').replace(/\s+/g,' ').trim();
export function parseRacers(html){
 const racers=[];
 for(const tr of html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)){
  const cells=[...tr[1].matchAll(/<td\b(?=[^>]*\browspan\s*=\s*(?:["']4["']|4(?=\s|>)))[^>]*>([\s\S]*?)<\/td>/gi)].map(x=>x[1]);
  if(cells.length<6)continue;
  const boat=Number(clean(cells[0]).normalize('NFKC').match(/^([1-6])(?:\s|$)/)?.[1]);
  const racerId=clean(cells[2]).match(/(?:^|\s)(\d{4,6})(?=\s|$)/)?.[1]??cells[2].match(/racersearch\/profile\/(\d{4,6})/)?.[1];
  const st=Number(clean(cells[3]).match(/(?:^|\s)(0\.\d{2})(?=\s|$)/)?.[1]);
  const national=Number(clean(cells[4]).match(/(?:^|\s)(\d{1,2}\.\d{2})(?=\s|$)/)?.[1]);
  const local=Number(clean(cells[5]).match(/(?:^|\s)(\d{1,2}\.\d{2})(?=\s|$)/)?.[1]);
  if(!boat||!racerId||!Number.isFinite(st)||st<=0||st>0.5||!Number.isFinite(national)||national<=0||national>10||!Number.isFinite(local)||local<=0||local>10)continue;
  racers.push({boat,racerId,averageStartTiming:st,nationalWinRate:national,localWinRate:local,entryCourse:boat,makulaboRecent50WinRate:null,motorSecondPlaceRate:null,exhibitionTime:null,verifiedEntryCourse:null});
 }
 return racers.length===6&&new Set(racers.map(r=>r.boat)).size===6&&new Set(racers.map(r=>r.racerId)).size===6?racers.sort((a,b)=>a.boat-b.boat):null;
}
export function rankRace(racers){
 const ranking=racers.map(r=>{
  const winRateAverage=(r.nationalWinRate+r.localWinRate)/2;
  const winRatePoints=Number((winRateAverage/10*70).toFixed(3));
  const startPoints=Number((Math.max(0,Math.min(1,(0.30-r.averageStartTiming)/0.30))*20).toFixed(3));
  const assumedCoursePoints=Number(((6-r.entryCourse)/5*10).toFixed(3));
  return {...r,winRateAverage,scoreBreakdown:{winRatePoints,startPoints,assumedCoursePoints,makulaboPoints:null,motorPoints:null,exhibitionPoints:null},score:Number((winRatePoints+startPoints+assumedCoursePoints).toFixed(3))};
 }).sort((a,b)=>b.score-a.score||a.boat-b.boat);
 const all=[];
 for(const a of ranking)for(const b of ranking)for(const c of ranking)if(a.boat!==b.boat&&a.boat!==c.boat&&b.boat!==c.boat)all.push({ticket:[a.boat,b.boat,c.boat].join('-'),heuristic:Number((a.score*.5+b.score*.3+c.score*.2).toFixed(2))});
 all.sort((a,b)=>b.heuristic-a.heuristic||a.ticket.localeCompare(b.ticket));
 return {ranking,main:all.filter(x=>x.ticket.startsWith(ranking[0].boat+'-')).slice(0,6),upset:all.filter(x=>!x.ticket.startsWith(ranking[0].boat+'-')).slice(0,6)};
}
export default {async fetch(request){
 if(request.method==='OPTIONS')return new Response(null,{headers:cors});
 const u=new URL(request.url);
 if(u.pathname==='/api/makulabo-status'){
  const date=u.searchParams.get('date')??'',venue=Number(u.searchParams.get('venue')),race=Number(u.searchParams.get('race'));
  if(!/^20\d{6}$/.test(date)||!Number.isInteger(venue)||venue<1||venue>24||!Number.isInteger(race)||race<1||race>12)return reply({status:'invalid_selection'},400);
  const url='https://makulabo-jp.com/data/'+String(venue).padStart(2,'0')+'/'+race+'/heatmap?hd='+date;
  try{
   const response=await fetch(url,{headers:{accept:'text/html'},redirect:'follow',signal:AbortSignal.timeout(10000)});
   const page=response.ok?(await response.text()).slice(0,200000):'';
   const accessible=response.ok&&!/ログイン|会員登録|login|sign.in/i.test(page);
   return reply({status:'not_integrated',date,venue,race,sourceUrl:url,httpStatus:response.status,pageAccessible:accessible,recent50Ready:false,message:accessible?'まくらぼページへの接続は確認できましたが、6選手の直近50走の照合は未完了です。予想点には未反映です。':'まくらぼの対象ページを確認できません（非公開・ログイン・取得制限の可能性）。予想点には未反映です。'});
  }catch(e){return reply({status:'not_integrated',date,venue,race,recent50Ready:false,message:'まくらぼの取得に失敗しました。予想点には未反映です。',error:String(e.message).slice(0,120)});}
 }
 if(u.pathname!=='/api/predict')return reply({status:'not_found'},404);
 const date=u.searchParams.get('date')??'',venue=Number(u.searchParams.get('venue')),race=Number(u.searchParams.get('race'));
 if(!/^20\d{6}$/.test(date)||!u.searchParams.has('venue')||!u.searchParams.has('race')||!Number.isInteger(venue)||venue<1||venue>24||!Number.isInteger(race)||race<1||race>12)return reply({status:'invalid_selection'},400);
 const officialUrl='https://www.boatrace.jp/owpc/pc/race/racelist?'+new URLSearchParams({hd:date,jcd:String(venue).padStart(2,'0'),rno:String(race)});
 try{
  const res=await fetch(officialUrl,{headers:{accept:'text/html'},signal:AbortSignal.timeout(12000),redirect:'follow'});
  if(!res.ok)return reply({status:'official_fetch_failed',httpStatus:res.status,date,venue,race});
  const size=Number(res.headers.get('content-length')??0);if(size>2000000)return reply({status:'official_page_too_large',date,venue,race});
  const html=await res.text();
  if(html.length>2000000)return reply({status:'official_page_too_large',date,venue,race});
  const racers=parseRacers(html);
  if(!racers)return reply({status:'official_features_incomplete',date,venue,race,main:[],upset:[],message:'6選手の公式データを照合できません'});
  return reply({status:'experimental',date,venue,race,...rankRace(racers),entryScenario:'boat_order_assumption',makulaboComparison:null,dataCompleteness:{officialRacelist:true,verifiedEntry:false,exhibition:false,motor:false,makulaboRecent50:false},provenance:{officialUrl,fetchedAt:new Date().toISOString(),preCutoffSnapshotAuthenticated:false},warning:'研究用の暫定予想。進入は枠なり仮定、展示・直前情報・まくらぼ未反映。'});
 }catch(e){return reply({status:'official_fetch_failed',date,venue,race,error:String(e.message).slice(0,120)});}
}};
