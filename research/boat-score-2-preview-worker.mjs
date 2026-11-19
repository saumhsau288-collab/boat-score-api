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
  // A name must be explicitly present in the official racer cell. Never infer it from boat order.
  const racerCellText=clean(cells[2]).normalize('NFKC');
  const nameCandidates=[...racerCellText.matchAll(/[一-龯々〆ヵヶぁ-ゖァ-ヺー]{2,}(?:[\\s\\u3000]+[一-龯々〆ヵヶぁ-ゖァ-ヺー]{1,})*/g)].map(m=>m[0].replace(/[\\s\\u3000]/g,''));
  const name=nameCandidates.find(n=>n.length>=2&&!/^(?:登録|選手|級別|支部|出身|年齢)$/.test(n))??null;
  const st=Number(clean(cells[3]).match(/(?:^|\s)(0\.\d{2})(?=\s|$)/)?.[1]);
  const national=Number(clean(cells[4]).match(/(?:^|\s)(\d{1,2}\.\d{2})(?=\s|$)/)?.[1]);
  const local=Number(clean(cells[5]).match(/(?:^|\s)(\d{1,2}\.\d{2})(?=\s|$)/)?.[1]);
  if(!boat||!racerId||!Number.isFinite(st)||st<=0||st>0.5||!Number.isFinite(national)||national<=0||national>10||!Number.isFinite(local)||local<=0||local>10)continue;
  racers.push({boat,racerId,name,averageStartTiming:st,nationalWinRate:national,localWinRate:local,entryCourse:boat,makulaboRecent50WinRate:null,motorSecondPlaceRate:null,exhibitionTime:null,verifiedEntryCourse:null});
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
// Strict public-name matching is a research fallback only, never proof of registration identity.
export function matchMakulaboByName(official,recent){
 if(!Array.isArray(official)||official.length!==6||!Array.isArray(recent)||recent.length!==6)return {verified:false,reason:'six_racers_required',matches:[]};
 const norm=s=>typeof s==='string'?s.normalize('NFKC').replace(/[\s\u3000]/g,''):''; 
 const names=official.map(r=>norm(r.name));
 if(names.some(n=>n.length<2)||new Set(names).size!==6)return {verified:false,reason:'official_names_incomplete',matches:[]};
 const byName=new Map();
 for(const row of recent){
  const n=norm(row?.name);
  if(n.length<2||byName.has(n))return {verified:false,reason:'recent_names_incomplete_or_duplicate',matches:[]};
  if(!Number.isInteger(row?.starts)||row.starts<1||row.starts>50||!Array.isArray(row?.finishCounts)||row.finishCounts.length!==6||row.finishCounts.some(v=>!Number.isInteger(v)||v<0)||row.finishCounts.reduce((a,b)=>a+b,0)!==row.starts)return {verified:false,reason:'invalid_finish_counts',matches:[]};
  byName.set(n,row);
 }
 if(names.some(n=>!byName.has(n)))return {verified:false,reason:'name_mismatch',matches:[]};
 return {verified:true,identityMethod:'exact_normalized_name_only',registrationVerified:false,matches:official.map(r=>({boat:r.boat,racerId:r.racerId,record:byName.get(norm(r.name))}))};
}
// Makulabo identity matching: exact registration IDs only; no inferred boat order.
export function matchMakulaboByRegistration(official,recent){
 if(!Array.isArray(official)||official.length!==6||!Array.isArray(recent)||recent.length!==6)return {verified:false,reason:'six_racers_required',matches:[]};
 const ids=official.map(r=>String(r.racerId??''));
 if(ids.some(id=>!/^\d{4}$/.test(id))||new Set(ids).size!==6||new Set(official.map(r=>r.boat)).size!==6)return {verified:false,reason:'invalid_official_identity',matches:[]};
 const byId=new Map();
 for(const row of recent){
  const id=String(row?.racerId??'');
  if(!/^\d{4}$/.test(id)||byId.has(id))return {verified:false,reason:'duplicate_or_invalid_recent_identity',matches:[]};
  const rate=row?.winRate;
  if(typeof rate!=='number'||!Number.isFinite(rate)||rate<0||rate>100)return {verified:false,reason:'invalid_recent50_win_rate',matches:[]};
  byId.set(id,row);
 }
 if(byId.size!==6||ids.some(id=>!byId.has(id)))return {verified:false,reason:'registration_mismatch',matches:[]};
 return {verified:true,matches:official.map(r=>({boat:r.boat,racerId:r.racerId,record:byId.get(String(r.racerId))}))};
}
// Research-only comparison. Never call this with unverified scraped labels.
export function compareVerifiedMakulaboScores(official,recent,{weight=10,date,venue,race}={}){
 const baseline=Array.isArray(official)&&official.length===6?rankRace(official):null;
 const identity=matchMakulaboByRegistration(official,recent);
 if(!baseline||!identity.verified)return {applied:false,reason:identity.reason??'invalid_official_six',baseline};
 if(typeof weight!=='number'||!Number.isFinite(weight)||weight<0||weight>20)return {applied:false,reason:'invalid_weight',baseline};
 if(identity.matches.some(m=>m.record.verified!==true||typeof m.record.sourceUrl!=='string'||!/^https:\/\/makulabo-jp\.com\//.test(m.record.sourceUrl)||typeof m.record.observedAt!=='string'||!Number.isFinite(Date.parse(m.record.observedAt))))return {applied:false,reason:'source_evidence_incomplete',baseline};
 if(date!==undefined||venue!==undefined||race!==undefined){
  if(!/^20\d{6}$/.test(String(date))||!Number.isInteger(venue)||venue<1||venue>24||!Number.isInteger(race)||race<1||race>12)return {applied:false,reason:'invalid_race_context',baseline};
  const expected='https://makulabo-jp.com/data/'+String(venue).padStart(2,'0')+'/'+race+'/heatmap?hd='+date;
  if(identity.matches.some(m=>m.record.sourceUrl!==expected))return {applied:false,reason:'source_race_mismatch',baseline};
 }
 const rates=new Map(identity.matches.map(m=>[m.boat,m.record.winRate]));
 const ranking=baseline.ranking.map(r=>{const baseFactor=1-weight/100;const makulaboPoints=Number((rates.get(r.boat)*weight/100).toFixed(3));return {...r,makulaboRecent50WinRate:rates.get(r.boat),scoreBreakdown:{...r.scoreBreakdown,winRatePoints:Number((r.scoreBreakdown.winRatePoints*baseFactor).toFixed(3)),startPoints:Number((r.scoreBreakdown.startPoints*baseFactor).toFixed(3)),assumedCoursePoints:Number((r.scoreBreakdown.assumedCoursePoints*baseFactor).toFixed(3)),makulaboPoints},score:Number((r.score*baseFactor+makulaboPoints).toFixed(3))};}).sort((a,b)=>b.score-a.score||a.boat-b.boat);
 const all=[];
 for(const a of ranking)for(const b of ranking)for(const c of ranking)if(a.boat!==b.boat&&a.boat!==c.boat&&b.boat!==c.boat)all.push({ticket:[a.boat,b.boat,c.boat].join('-'),heuristic:Number((a.score*.5+b.score*.3+c.score*.2).toFixed(2))});
 all.sort((a,b)=>b.heuristic-a.heuristic||a.ticket.localeCompare(b.ticket));
 const favorite=ranking[0].boat;
 const adjusted={ranking,main:all.filter(x=>x.ticket.startsWith(favorite+'-')).slice(0,6),upset:all.filter(x=>!x.ticket.startsWith(favorite+'-')).slice(0,6)};
 return {applied:true,baseline,adjusted,weight,warning:'Research comparison only. Source metadata and verified flags are claims; underlying 50 races have not been independently authenticated.'};
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
   const declaredSize=Number(response.headers.get('content-length')??0);if(declaredSize>1500000)return reply({status:'not_integrated',date,venue,race,recent50Ready:false,message:'まくらぼページが大きすぎるため取得を中止しました。'});
   const type=response.headers.get('content-type')??'';
   const rawPage=response.ok&&/text\/html/i.test(type)?await response.text():'';
   const truncated=rawPage.length>1500000;
   const page=truncated?'':rawPage;
   const visibleText=page.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,' ').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ');
   const indicators={hasHeatmapLabel:/ヒートマップ/.test(visibleText),hasRecent50Label:/直近\s*50\s*走|過去\s*50\s*走|50走/.test(visibleText),hasRegistrationId:/\b[3-5]\d{3}\b/.test(visibleText),hasLoginPrompt:/ログイン|会員登録|有料会員|新規登録/.test(visibleText)};
   const accessible=Boolean(page)&&indicators.hasHeatmapLabel&&!indicators.hasLoginPrompt;
   const readyForIdentityReview=accessible&&indicators.hasRecent50Label&&indicators.hasRegistrationId;
   const structure={tableCount:(page.match(/<table\b/gi)??[]).length,rowCount:(page.match(/<tr\b/gi)??[]).length,scriptCount:(page.match(/<script\b/gi)??[]).length,hasNextData:page.includes('__NEXT_DATA__'),hasNuxtData:page.includes('__NUXT__'),hasEmbeddedJson:/type\s*=\s*["']application\/json["']/i.test(page),hasApiPath:/\/api\/|axios\.|fetch\(/i.test(page)};
   return reply({status:'not_integrated',date,venue,race,sourceUrl:url,httpStatus:response.status,pageAccessible:accessible&&!truncated,inspectionTruncated:truncated,indicators,structure,readyForIdentityReview,recent50Ready:false,message:accessible?'まくらぼページへの接続は確認できましたが、6選手の直近50走の照合は未完了です。予想点には未反映です。':'まくらぼの対象ページを確認できません（非公開・ログイン・取得制限の可能性）。予想点には未反映です。'});
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
