import {generateTwelveIndependentMethods} from './generate-twelve-independent-methods.mjs';
import {matchOfficialCourseStats} from './match-official-course-stats.mjs';
import officialCourseData from './research/course-stats/2027-1.json' with {type:'json'};
const ALLOWED_ORIGINS = new Set([
  'https://ancient-brook-67e7.saumh-sau-288.workers.dev',
  'https://rough-math-6d4c.saumh-sau-288.workers.dev'
]);
function cors(request) {
  const origin = request.headers.get('Origin');
  return origin && ALLOWED_ORIGINS.has(origin) ? {'Access-Control-Allow-Origin':origin,'Vary':'Origin'} : {};
}
function reply(request, data, status=200) {
  return new Response(JSON.stringify(data), {status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store',...cors(request)}});
}
// Verified beforeinfo only: short-lived per-isolate reuse for the same exact race.
// A cache miss or worker restart simply falls back to the official fetch.
const verifiedBeforeinfoCache=new Map();
function beforeinfoCacheKey(date,venue,race){return date+':'+Number(venue)+':'+Number(race);}
function getVerifiedBeforeinfo(date,venue,race){
  const key=beforeinfoCacheKey(date,venue,race),item=verifiedBeforeinfoCache.get(key);
  if(!item)return null;
  if(Date.now()-item.savedAt>120000){verifiedBeforeinfoCache.delete(key);return null;}
  return item;
}
function saveVerifiedBeforeinfo(date,venue,race,exhibition,start,weather=null){
  const exhibitionOK=exhibition?.verified===true&&exhibition.rows?.length===6;
  const startOK=start?.verified===true&&start.rows?.length===6;
  if(!exhibitionOK&&!startOK)return;
  if(verifiedBeforeinfoCache.size>=30)verifiedBeforeinfoCache.delete(verifiedBeforeinfoCache.keys().next().value);
  verifiedBeforeinfoCache.set(beforeinfoCacheKey(date,venue,race),{savedAt:Date.now(),
    exhibition:exhibitionOK?exhibition:{verified:false,rows:[]},
    start:startOK?start:{verified:false,rows:[]},weather:weather?.verified===true?weather:null});
}
// Cross-isolate reuse where the existing MORNING_KV binding is available.
// Never trust a KV entry without the exact race key, freshness and six-row checks.
async function readSharedVerifiedBeforeinfo(env,date,venue,race){
  if(!env?.MORNING_KV)return null;
  try{
    const item=JSON.parse(await env.MORNING_KV.get('verified-beforeinfo:'+beforeinfoCacheKey(date,venue,race))||'null');
    if(item?.date!==date||item?.venue!==Number(venue)||item?.race!==Number(race)||
       !Number.isFinite(item.savedAt)||Date.now()-item.savedAt>120000||Date.now()<item.savedAt)return null;
    const valid=x=>x?.verified===true&&Array.isArray(x.rows)&&x.rows.length===6&&
      new Set(x.rows.map(r=>r.boat)).size===6&&x.rows.every(r=>Number.isInteger(r.boat)&&r.boat>=1&&r.boat<=6);
    if(!valid(item.exhibition)&&!valid(item.start))return null;
    return {savedAt:item.savedAt,exhibition:valid(item.exhibition)?item.exhibition:{verified:false,rows:[]},
      start:valid(item.start)?item.start:{verified:false,rows:[]},weather:item.weather?.verified===true?item.weather:null};
  }catch{return null;}
}
async function writeSharedVerifiedBeforeinfo(env,date,venue,race,exhibition,start,weather=null){
  if(!env?.MORNING_KV)return;
  const valid=x=>x?.verified===true&&Array.isArray(x.rows)&&x.rows.length===6&&
    new Set(x.rows.map(r=>r.boat)).size===6&&x.rows.every(r=>Number.isInteger(r.boat)&&r.boat>=1&&r.boat<=6);
  if(!valid(exhibition)&&!valid(start))return;
  try{await env.MORNING_KV.put('verified-beforeinfo:'+beforeinfoCacheKey(date,venue,race),
    JSON.stringify({date,venue:Number(venue),race:Number(race),savedAt:Date.now(),
      exhibition:valid(exhibition)?exhibition:null,start:valid(start)?start:null,weather:weather?.verified===true?weather:null}),{expirationTtl:180});}catch{}
}
// Short-lived per-isolate deduplication reduces repeated official-site traffic.
// Failures and unverified data are never persisted across requests.
// Limit upstream connections; preserve original venue/race order in results.
async function mapOfficialLimited(items, limit, mapper) {
  const results=new Array(items.length);
  let next=0;
  await Promise.all(Array.from({length:Math.min(limit,items.length)},async()=>{
    while(next<items.length){
      const index=next++;
      results[index]=await mapper(items[index]);
    }
  }));
  return results;
}
async function officialScheduleVenueCandidates(date) {
  try {
    let res=null;
    // Retry transport timeouts once; never mark venues as closed on failure.
    for(const timeoutMs of [9000,15000]){
      try{
        res=await fetch('https://www.boatrace.jp/owpc/pc/race/index?hd='+date,{
          headers:{Accept:'text/html'},signal:AbortSignal.timeout(timeoutMs)
        });
        break;
      }catch(error){
        if(error?.name!=='TimeoutError'&&error?.name!=='AbortError')throw error;
      }
    }
    if(!res?.ok)return null;
    const html=await res.text();if(html.length>1000000)return null;
    const codes=new Set();
    for(const match of html.matchAll(/href=["']([^"']*racelist[^"']*)["']/gi)){
      try {
        const link=new URL(match[1].replace(/&amp;/g,'&'),'https://www.boatrace.jp');
        if(!link.pathname.includes('/owpc/pc/race/racelist'))continue;
        const code=Number(link.searchParams.get('jcd')),hd=link.searchParams.get('hd');
        if(Number.isInteger(code)&&code>=1&&code<=24&&(!hd||hd===date))codes.add(code);
      }catch{}
    }
    return codes.size?[...codes].sort((a,b)=>a-b):null;
  }catch{return null;}
}
// Never share in-flight fetch promises across Cloudflare Worker requests.
// A promise started in another request context can never settle here.
async function getVerifiedList(_key, producer) {
  return await producer();
}

// UTC 23:00 is 08:00 JST the following calendar day.
// This handler requires a Cloudflare Cron Trigger and a KV binding named MORNING_KV.
// Without both, no unattended morning report is created.
function jstDateFromUtc(date) {
  return new Date(date.getTime()+9*3600000).toISOString().slice(0,10).replace(/-/g,'');
}
function validSavedMorningRecord(row,date){
 const scores=row?.rankedScores,c=Date.parse(row?.capturedAt||''),d=Date.parse(row?.deadlineAt||'');
 if(row?.date!==date||row.ready!==true||row.officialVerified!==true||row.statsVerified!==true||!Number.isInteger(row.venue)||row.venue<1||row.venue>24||!Number.isInteger(row.race)||row.race<1||row.race>12||!Number.isFinite(c)||!Number.isFinite(d)||c>=d||!Array.isArray(scores)||scores.length!==6||new Set(scores.map(x=>x?.boat)).size!==6||!scores.every(x=>x&&Number.isInteger(x.boat)&&x.boat>=1&&x.boat<=6&&Number.isFinite(x.score)))return false;
 const day=t=>new Date(t+9*3600000).toISOString().slice(0,10).replace(/-/g,'');
 return day(c)===date&&day(d)===date&&JSON.stringify(row.predictedOrder)===JSON.stringify(scores.slice().sort((a,b)=>b.score-a.score||a.boat-b.boat).map(x=>x.boat));
}
async function runScheduledMorning(env,scheduledTime) {
  const date=jstDateFromUtc(new Date(scheduledTime));
  if(!env?.MORNING_KV)throw Error('MORNING_KV binding is required');
  const key='morning:'+date;
  let state;
  try{state=JSON.parse(await env.MORNING_KV.get(key)||'null')}catch{}
  // Preserve verified progress when the official schedule is temporarily unavailable.
  // Only use venues from an earlier schedule verified for this same date.
  const freshVenues=await officialScheduleVenueCandidates(date);
  const venues=freshVenues?.length?freshVenues:
    (state?.date===date&&Array.isArray(state.venues)&&state.venues.length?state.venues:null);
  if(!venues?.length){
    if(state&&Array.isArray(state.completedVenues)){
      state.scheduleLastCheck='unverified';
      state.updatedAt=new Date().toISOString();
      await env.MORNING_KV.put(key,JSON.stringify(state),{expirationTtl:31536000});
    }else{
      await env.MORNING_KV.put(key,JSON.stringify({date,status:'schedule_unverified',
        updatedAt:new Date().toISOString(),venues:[],completedVenues:[],failedVenues:[],
        categories:{main:[],upset:[],chaos:[]}}),{expirationTtl:31536000});
    }
    return;
  }
  if(!state||state.date!==date||!Array.isArray(state.completedVenues))
    state={date,status:'running',venues,completedVenues:[],failedVenues:[],attempts:{},records:[],updatedAt:null};
  state.scheduleLastCheck=freshVenues?.length?'verified':'reused_previous_verified_schedule';
  if(!state.attempts||typeof state.attempts!=='object')state.attempts={};
  if(!Array.isArray(state.failedVenues))state.failedVenues=[];
  if(!Array.isArray(state.records))state.records=[];
  state.venues=venues;
  const verified=new Map();
  state.invalidMorningRecords=Array.isArray(state.invalidMorningRecords)?state.invalidMorningRecords:[];
  const invalidKeys=new Set(state.invalidMorningRecords.map(x=>x?.date+':'+x?.venue+':'+x?.race));
  for(const row of state.records){
    const id=row?.date+':'+row?.venue+':'+row?.race;
    if(validSavedMorningRecord(row,date)){if(!verified.has(id))verified.set(id,row);}
    else if(!invalidKeys.has(id)){state.invalidMorningRecords.push(row);invalidKeys.add(id);}
  }
  state.records=[...verified.values()];
  state.completedVenues=venues.filter(v=>state.records.filter(x=>x.venue===v).length===12);
  const remaining=venues.filter(v=>!state.completedVenues.includes(v)&&(state.attempts[v]||0)<3).sort((a,b)=>(state.attempts[a]||0)-(state.attempts[b]||0)||a-b).slice(0,2);
  if(!remaining.length){
    // A subsequent cron invocation must not leave a stale 'running' snapshot.
    const exhausted=venues.filter(v=>!state.completedVenues.includes(v)&&(state.attempts[v]||0)>=3);
    state.exhaustedVenues=exhausted;
    state.status=state.completedVenues.length>=venues.length?'completed':'incomplete';
    state.updatedAt=new Date().toISOString();
    const ranking=classifyDailyRaceCandidates(state.records);
    state.categories={main:ranking.main,upset:ranking.upset,chaos:ranking.chaos};
    state.boatOneRanking=rankMorningBoatOne(state.records,date);
    state.boatOneRankedAt=state.updatedAt;
    await env.MORNING_KV.put(key,JSON.stringify(state),{expirationTtl:31536000});
    return;
  }
  for(const venue of remaining){
    state.attempts[venue]=(state.attempts[venue]||0)+1;
    try{
      // Retry only missing races; never mark a venue complete after a partial scan.
      const completedRaces=new Set(state.records.filter(x=>x.date===date&&x.venue===venue&&x.ready===true).map(x=>x.race));
      const missingRaces=Array.from({length:12},(_,i)=>i+1).filter(r=>!completedRaces.has(r));
      const rows=await mapOfficialLimited(missingRaces,3,async race=>{
        const official=await fetchOfficialRacers(date,venue,race);
        const row=buildMorningRaceInputs(date,venue,race,official);
        if(row.ready!==true)return row;
        const capturedAt=new Date().toISOString();
        const deadline=Date.parse(row.deadlineAt||'');
        const predictedOrder=row.rankedScores.slice().sort((a,b)=>b.score-a.score||a.boat-b.boat).map(x=>x.boat);
        if(!Number.isFinite(deadline)||Date.parse(capturedAt)>=deadline||predictedOrder.length!==6||new Set(predictedOrder).size!==6||!predictedOrder.every(x=>Number.isInteger(x)&&x>=1&&x<=6))
          return {...row,ready:false,reason:'invalid_predeadline_record'};
        return {...row,capturedAt,predictedOrder,evidenceVersion:2,raceCard:{racers:official.racers,statsByBoat:official.statsByBoat},courseStats:matchOfficialCourseStats(officialCourseData,date,official,null)};
      });
      const existing=new Set(state.records.map(x=>x.date+':'+x.venue+':'+x.race));
      for(const row of rows.filter(x=>validSavedMorningRecord(x,date))){
        const id=row.date+':'+row.venue+':'+row.race;
        if(!existing.has(id)){state.records.push(row);existing.add(id);completedRaces.add(row.race);}
      }
      if(completedRaces.size===12){
        if(!state.completedVenues.includes(venue))state.completedVenues.push(venue);
        state.failedVenues=state.failedVenues.filter(v=>v!==venue);
      }else if(!state.failedVenues.includes(venue)){
        state.failedVenues.push(venue);
      }
    }catch(e){if(!state.failedVenues.includes(venue))state.failedVenues.push(venue);}
    state.updatedAt=new Date().toISOString();
    const ranking=classifyDailyRaceCandidates(state.records);
    state.categories={main:ranking.main,upset:ranking.upset,chaos:ranking.chaos};
    state.boatOneRanking=rankMorningBoatOne(state.records,date);
    state.boatOneRankedAt=state.updatedAt;
    const exhausted=venues.filter(v=>!state.completedVenues.includes(v)&&(state.attempts[v]||0)>=3);
    state.status=state.completedVenues.length>=venues.length?'completed':exhausted.length+state.completedVenues.length>=venues.length?'incomplete':'partial';
    state.exhaustedVenues=exhausted;
    await env.MORNING_KV.put(key,JSON.stringify(state),{expirationTtl:31536000});
  }
}
// Separate, bounded official result archive. Never overwrite a verified result with a failed fetch.
// Daily research audit: use only archived pre-deadline scores and verified official results.
function summarizeArchivedRanks(date,morning,archive){
 const summary={date,version:1,matched:0,missingResult:0,excluded:0,firstRankWins:0,rankByFinish:Array.from({length:6},()=>Array(6).fill(0)),excludedReasons:{},records:[]};
 const seen=new Set();
 const exclude=reason=>{summary.excluded++;summary.excludedReasons[reason]=(summary.excludedReasons[reason]||0)+1;};
 for(const row of (Array.isArray(morning?.records)?morning.records:[])){
  const id=row.venue+':'+row.race;
  if(row.date!==date||!Number.isInteger(row.venue)||row.venue<1||row.venue>24||!Number.isInteger(row.race)||row.race<1||row.race>12||seen.has(id)){exclude('invalid_or_duplicate_race');continue;}seen.add(id);
  const capture=Date.parse(row.capturedAt||''),deadline=Date.parse(row.deadlineAt||'');
  if(!Number.isFinite(capture)||!Number.isFinite(deadline)||capture>=deadline){exclude('missing_or_late_timestamp');continue;}
  const scores=row.rankedScores;
  if(row.ready!==true||row.officialVerified!==true||row.statsVerified!==true||!Array.isArray(scores)||scores.length!==6||new Set(scores.map(x=>x.boat)).size!==6||!scores.every(x=>Number.isInteger(x.boat)&&x.boat>=1&&x.boat<=6&&Number.isFinite(x.score))){exclude('invalid_scores');continue;}
  const result=archive?.records?.[id],order=result?.finishOrder;
  if(result?.verified!==true||result.date!==date||result.venue!==row.venue||result.race!==row.race||!Array.isArray(order)||order.length!==6||new Set(order).size!==6||!order.every(x=>Number.isInteger(x)&&x>=1&&x<=6)){summary.missingResult++;continue;}
  const ranked=scores.slice().sort((a,b)=>b.score-a.score||a.boat-b.boat).map(x=>x.boat);
  summary.matched++;if(ranked[0]===order[0])summary.firstRankWins++;
  ranked.forEach((boat,i)=>summary.rankByFinish[i][order.indexOf(boat)]++);
  summary.records.push({venue:row.venue,race:row.race,ranked,finishOrder:order,capturedAt:row.capturedAt,deadlineAt:row.deadlineAt,model:row.method||null});
 }
 summary.firstRankWinRate=summary.matched?summary.firstRankWins/summary.matched:null;
 return summary;
}
// Aggregate archived research observations, never reconstruct missing forecasts.
function summarizeRankAuditWindow(endDate,days,audits){
 const result={endDate,days,availableDays:0,missingDays:[],matched:0,missingResult:0,excluded:0,firstRankWins:0,rankByFinish:Array.from({length:6},()=>Array(6).fill(0)),byVenue:{},byModel:{}};
 const seen=new Set();
 for(const {date,audit} of audits){
  if(!audit||audit.date!==date||audit.version!==1||!Array.isArray(audit.records)){result.missingDays.push(date);continue;}
  result.availableDays++;
  result.missingResult+=Number.isInteger(audit.missingResult)&&audit.missingResult>=0?audit.missingResult:0;
  result.excluded+=Number.isInteger(audit.excluded)&&audit.excluded>=0?audit.excluded:0;
  for(const row of audit.records){
   const {venue,race,ranked,finishOrder}=row;
   const validOrder=x=>Array.isArray(x)&&x.length===6&&new Set(x).size===6&&x.every(n=>Number.isInteger(n)&&n>=1&&n<=6);
   const key=date+':'+venue+':'+race,capture=Date.parse(row.capturedAt||''),deadline=Date.parse(row.deadlineAt||'');
   if(seen.has(key)||!Number.isInteger(venue)||venue<1||venue>24||!Number.isInteger(race)||race<1||race>12||!validOrder(ranked)||!validOrder(finishOrder)||!Number.isFinite(capture)||!Number.isFinite(deadline)||capture>=deadline){result.excluded++;continue;}
   seen.add(key);result.matched++;
   const hit=ranked[0]===finishOrder[0]?1:0;result.firstRankWins+=hit;
   ranked.forEach((boat,i)=>result.rankByFinish[i][finishOrder.indexOf(boat)]++);
   for(const [group,id] of [[result.byVenue,String(venue)],[result.byModel,'model:'+String(row.model||'unknown')]]){
    const item=group[id]||(group[id]={matched:0,firstRankWins:0});item.matched++;item.firstRankWins+=hit;
   }
  }
 }
 result.firstRankWinRate=result.matched?result.firstRankWins/result.matched:null;
 for(const group of [result.byVenue,result.byModel])for(const item of Object.values(group))item.firstRankWinRate=item.firstRankWins/item.matched;
 return result;
}
async function readRankAuditWindows(env,endDate){
 const end=Date.parse(endDate.slice(0,4)+'-'+endDate.slice(4,6)+'-'+endDate.slice(6,8)+'T00:00:00Z');
 if(!Number.isFinite(end)||new Date(end).toISOString().slice(0,10).replace(/-/g,'')!==endDate)throw Error('Invalid calendar date');
 const audits=[];
 for(let offset=0;offset<30;offset++){
  const date=new Date(end-offset*86400000).toISOString().slice(0,10).replace(/-/g,'');
  const raw=await env.MORNING_KV.get('rank-audit:v1:'+date);
  let audit=null;try{audit=JSON.parse(raw||'null');}catch{}
  audits.push({date,audit});
 }
 return {endDate,windows:[7,14,30].map(days=>summarizeRankAuditWindow(endDate,days,audits.slice(0,days))),note:'Descriptive archived rank statistics only; missing days excluded, no automatic model changes.'};
}
// Descriptive pre-race measurements paired with verified results, not a forecast.
function summarizeBeforeArchive(date,before,archive){
 const summary={date,version:1,matched:0,missingResult:0,excluded:0,records:[],model:'observation-only-v1'};
 const validBoats=rows=>Array.isArray(rows)&&rows.length===6&&new Set(rows.map(x=>x?.boat)).size===6&&rows.every(x=>Number.isInteger(x?.boat)&&x.boat>=1&&x.boat<=6);
 for(const [id,row] of Object.entries(before?.records||{})){
  const capture=Date.parse(row?.capturedAt||''),deadline=Date.parse(row?.deadlineAt||'');
  if(row?.date!==date||id!==row.venue+':'+row.race||!Number.isInteger(row.venue)||row.venue<1||row.venue>24||!Number.isInteger(row.race)||row.race<1||row.race>12||!Number.isFinite(capture)||!Number.isFinite(deadline)||capture>=deadline||deadline-capture>600000||row.exhibition?.verified!==true||row.start?.verified!==true||!validBoats(row.exhibition.rows)||!validBoats(row.start.rows)){summary.excluded++;continue;}
  const result=archive?.records?.[id],order=result?.finishOrder;
  if(result?.verified!==true||result.date!==date||result.venue!==row.venue||result.race!==row.race||!Array.isArray(order)||order.length!==6||new Set(order).size!==6||!order.every(x=>Number.isInteger(x)&&x>=1&&x<=6)){summary.missingResult++;continue;}
  summary.records.push({date,venue:row.venue,race:row.race,capturedAt:row.capturedAt,deadlineAt:row.deadlineAt,finishOrder:order,exhibition:row.exhibition.rows,start:row.start.rows,weather:row.weather||null});
  summary.matched++;
 }
 return summary;
}
async function runScheduledResultArchive(env,scheduledTime){
 if(!env?.MORNING_KV)throw Error('MORNING_KV binding is required');
 const date=jstDateFromUtc(new Date(scheduledTime-86400000));
 const key='result-archive:v1:'+date;
 const morning=JSON.parse(await env.MORNING_KV.get('morning:'+date)||'null');
 let state=JSON.parse(await env.MORNING_KV.get(key)||'null');
 const before=JSON.parse(await env.MORNING_KV.get('before-archive:v1:'+date)||'null');
 const known=[...(morning?.date===date&&Array.isArray(morning.venues)?morning.venues:[]),...(before?.date===date&&Array.isArray(before.venues)?before.venues:[]),...(state?.date===date&&Array.isArray(state.venues)?state.venues:[])];
 const candidates=known.length?known:await officialScheduleVenueCandidates(date);
 const venues=[...new Set((candidates||[]).filter(v=>Number.isInteger(v)&&v>=1&&v<=24))];
 if(!venues.length)return;
 if(!state||state.date!==date)state={date,version:1,records:{},attempts:{},updatedAt:null};
 const targets=venues.flatMap(venue=>Array.from({length:12},(_,i)=>({venue,race:i+1})));
 const pending=targets.filter(({venue,race})=>{const id=venue+':'+race;return !state.records[id]&&(state.attempts[id]||0)<6;}).sort((a,b)=>(state.attempts[a.venue+':'+a.race]||0)-(state.attempts[b.venue+':'+b.race]||0)).slice(0,12);
 const rows=await mapOfficialLimited(pending,3,async ({venue,race})=>{
  const id=venue+':'+race,source='https://www.boatrace.jp/owpc/pc/race/raceresult?rno='+race+'&jcd='+String(venue).padStart(2,'0')+'&hd='+date;
  try{const response=await fetch(source,{headers:{Accept:'text/html'},signal:AbortSignal.timeout(12000)});
   if(!response.ok)return {id,reason:'http_'+response.status};
   const html=await response.text();if(html.length>1000000)return {id,reason:'response_too_large'};
   const result=parseOfficialFinishOrder(html);
   if(result.verified!==true)return {id,reason:result.reason||'unverified'};
   return {id,record:{date,venue,race,finishOrder:result.finishOrder,verified:true,source,capturedAt:new Date().toISOString()}};
  }catch{return {id,reason:'fetch_failed'};}
 });
 if(!state.failures)state.failures={};
 for(const row of rows){state.attempts[row.id]=(state.attempts[row.id]||0)+1;if(row.record){state.records[row.id]=row.record;delete state.failures[row.id];}else state.failures[row.id]=row.reason;}
 state.venues=venues;state.targetCount=targets.length;state.updatedAt=new Date().toISOString();
 state.verifiedCount=Object.keys(state.records).length;
 state.status=state.verifiedCount===targets.length?'completed':targets.every(({venue,race})=>state.records[venue+':'+race]||(state.attempts[venue+':'+race]||0)>=6)?'incomplete':'partial';
 await env.MORNING_KV.put(key,JSON.stringify(state),{expirationTtl:31536000});
 const audit=summarizeArchivedRanks(date,morning,state);await env.MORNING_KV.put('rank-audit:v1:'+date,JSON.stringify(audit),{expirationTtl:31536000});
 const beforeAudit=summarizeBeforeArchive(date,before,state);await env.MORNING_KV.put('before-audit:v1:'+date,JSON.stringify(beforeAudit),{expirationTtl:31536000});
}
// Research-only time-stamped pre-deadline observations; never replace morning records.
async function runScheduledBeforeArchive(env,scheduledTime){
 if(!env?.MORNING_KV)throw Error('MORNING_KV binding is required');
 const date=jstDateFromUtc(new Date(scheduledTime)),now=Date.now();
 const morning=JSON.parse(await env.MORNING_KV.get('morning:'+date)||'null');
 
 const key='before-archive:v1:'+date;
 const state=JSON.parse(await env.MORNING_KV.get(key)||'null')||{date,version:1,records:{},attempts:{}};
 const candidates=new Map();
 for(const row of (morning?.date===date&&Array.isArray(morning.records)?morning.records:[])){
  if(row.date===date&&row.ready===true&&Number.isFinite(Date.parse(row.deadlineAt||'')))candidates.set(row.venue+':'+row.race,row);
 }
 state.deadlines=state.deadlines||{};
 state.discoveryAttempts=state.discoveryAttempts||{};
 state.discoveryFailures=state.discoveryFailures||{};
 state.partialRecords=state.partialRecords||{};
 state.failures=state.failures||{};
 const venues=Array.isArray(morning?.venues)&&morning.date===date&&morning.venues.length?morning.venues:(state.venues?.length?state.venues:await officialScheduleVenueCandidates(date)||[]);
 state.venues=venues;
 for(const row of Object.values(state.deadlines))candidates.set(row.venue+':'+row.race,row);
 const missing=venues.filter(v=>Number.isInteger(v)&&v>=1&&v<=24).flatMap(venue=>Array.from({length:12},(_,i)=>({venue,race:i+1}))).filter(({venue,race})=>!candidates.has(venue+':'+race)&&(state.discoveryAttempts[venue+':'+race]||0)<8).sort((a,b)=>(state.discoveryAttempts[a.venue+':'+a.race]||0)-(state.discoveryAttempts[b.venue+':'+b.race]||0)||a.race-b.race).slice(0,6);
 const discovered=await mapOfficialLimited(missing,3,async ({venue,race})=>{
  const id=venue+':'+race;
  try{
   const url='https://www.boatrace.jp/owpc/pc/race/racelist?rno='+race+'&jcd='+String(venue).padStart(2,'0')+'&hd='+date;
   const res=await fetch(url,{headers:{Accept:'text/html'},signal:AbortSignal.timeout(5000)});
   if(!res.ok)return {id,reason:'http_'+res.status};
   const html=await res.text();
   if(html.length>1000000)return {id,reason:'response_too_large'};
   const deadlineAt=extractOfficialRaceDeadline(html,date);
   if(!deadlineAt)return {id,reason:'deadline_unverified'};
   if(extractOfficialBoatRows(html).verified!==true)return {id,reason:'six_boat_rows_unverified'};
   return {id,row:{date,venue,race,deadlineAt}};
  }catch(e){return {id,reason:'fetch_or_parse_'+String(e?.name||'error')};}
 });
 for(const item of discovered){state.discoveryAttempts[item.id]=(state.discoveryAttempts[item.id]||0)+1;if(item.row){state.deadlines[item.id]=item.row;candidates.set(item.id,item.row);delete state.discoveryFailures[item.id];}else state.discoveryFailures[item.id]={reason:item.reason||'unknown',at:new Date().toISOString()};}
 const eligible=[...candidates.values()].filter(row=>{
  const id=row.venue+':'+row.race,deadline=Date.parse(row.deadlineAt||'');
  return row.date===date&&Number.isInteger(row.venue)&&row.venue>=1&&row.venue<=24&&Number.isInteger(row.race)&&row.race>=1&&row.race<=12&&Number.isFinite(deadline)&&deadline-Date.now()<=600000&&deadline-Date.now()>=15000&&!state.records[id]&&(state.attempts[id]||0)<4;
 }).sort((a,b)=>Date.parse(a.deadlineAt)-Date.parse(b.deadlineAt));
 const pending=eligible.slice(0,12);
 state.lastScan={at:new Date().toISOString(),targetCount:venues.length*12,knownDeadlineCount:candidates.size,discoveryBatch:missing.length,eligibleCount:eligible.length,selectedCount:pending.length,expiredUnverified:[...candidates.values()].filter(row=>Date.parse(row.deadlineAt)<=now&&!state.records[row.venue+':'+row.race]).length,futureCount:[...candidates.values()].filter(row=>Date.parse(row.deadlineAt)>now+600000).length};
 const rows=await mapOfficialLimited(pending,3,async row=>{
  const id=row.venue+':'+row.race;let deadline=Date.parse(row.deadlineAt);
  const source='https://www.boatrace.jp/owpc/pc/race/beforeinfo?rno='+row.race+'&jcd='+String(row.venue).padStart(2,'0')+'&hd='+date;
  try{
   const check=await fetch('https://www.boatrace.jp/owpc/pc/race/racelist?rno='+row.race+'&jcd='+String(row.venue).padStart(2,'0')+'&hd='+date,{headers:{Accept:'text/html'},signal:AbortSignal.timeout(5000)});
   if(!check.ok)return {id,reason:'deadline_recheck_http_'+check.status};
   const page=await check.text();
   const confirmed=page.length<=1000000&&extractOfficialBoatRows(page).verified===true?extractOfficialRaceDeadline(page,date):null;
   if(!confirmed)return {id,reason:'deadline_recheck_unverified'};
   deadline=Date.parse(confirmed);
   state.deadlines[id]={date,venue:row.venue,race:row.race,deadlineAt:confirmed};
   if(deadline-Date.now()>600000)return {id,deferred:true};
   const budget=Math.min(12000,deadline-Date.now()-1000);if(budget<1000)return {id,reason:'deadline_near'};
   const res=await fetch(source,{headers:{Accept:'text/html'},signal:AbortSignal.timeout(budget)});
   if(!res.ok)return {id,reason:'http_'+res.status};const html=await res.text();if(html.length>1000000)return {id,reason:'response_too_large'};
   const capturedAt=new Date().toISOString();if(Date.parse(capturedAt)>=deadline)return {id,reason:'deadline_passed'};
   const exhibition=extractOfficialExhibition(html),start=extractOfficialStartExhibition(html),weather=extractOfficialWeather(html);
   const observation={date,venue:row.venue,race:row.race,deadlineAt:new Date(deadline).toISOString(),capturedAt,source,exhibition,start,weather,model:'observation-only-v1'};
   if(exhibition.verified!==true||start.verified!==true||exhibition.rows?.length!==6||start.rows?.length!==6)return {id,reason:'exhibition_or_start_unverified',details:{exhibition:exhibition.verified===true,start:start.verified===true,weather:weather.verified===true,exhibitionRows:exhibition.candidateCount??0,startRows:start.candidateCount??0},partial:observation};
   return {id,record:observation};
  }catch(e){return {id,reason:'fetch_or_parse_'+String(e?.name||'error')};}
 });
 for(const row of rows){if(row.deferred)continue;state.attempts[row.id]=(state.attempts[row.id]||0)+1;if(row.record&&!state.records[row.id]){state.records[row.id]=row.record;delete state.failures[row.id];}else if(!row.record){state.failures[row.id]={reason:row.reason||'unknown',details:row.details||null,at:new Date().toISOString()};if(row.partial){const p=state.partialRecords[row.id]||{};for(const k of ['exhibition','start','weather'])if(row.partial[k]?.verified===true&&!p[k])p[k]={capturedAt:row.partial.capturedAt,deadlineAt:row.partial.deadlineAt,source:row.partial.source,data:row.partial[k]};if(Object.keys(p).length)state.partialRecords[row.id]=p;}}}
 state.updatedAt=new Date().toISOString();
 await env.MORNING_KV.put(key,JSON.stringify(state),{expirationTtl:31536000});
}
// Read-only daily storage inventory. A planned slot is not proof of a completed race.
function buildArchiveInventory(date,morning,before,result,now=Date.now()){
 const validVenue=v=>Number.isInteger(v)&&v>=1&&v<=24;
 const validRace=r=>Number.isInteger(r)&&r>=1&&r<=12;
 const validId=x=>x?.date===date&&validVenue(x.venue)&&validRace(x.race);
 const orderOK=a=>Array.isArray(a)&&a.length===6&&new Set(a).size===6&&a.every(n=>Number.isInteger(n)&&n>=1&&n<=6);
 const sixRows=a=>Array.isArray(a)&&orderOK(a.map(x=>x?.boat));
 const timely=x=>{const c=Date.parse(x?.capturedAt||''),d=Date.parse(x?.deadlineAt||'');return Number.isFinite(c)&&Number.isFinite(d)&&c<d;};
 const m=new Map(),b=new Map(),f=new Map();
 for(const row of Array.isArray(morning?.records)?morning.records:[]){
  if(validId(row)&&row.ready===true&&row.officialVerified===true&&row.statsVerified===true&&sixRows(row.rankedScores)&&row.rankedScores.every(x=>Number.isFinite(x.score)))m.set(row.venue+':'+row.race,row);
 }
 for(const [k,row] of Object.entries(before?.records||{})){
  if(validId(row)&&k===row.venue+':'+row.race&&timely(row)&&Date.parse(row.deadlineAt)-Date.parse(row.capturedAt)<=600000&&row.exhibition?.verified===true&&row.start?.verified===true&&sixRows(row.exhibition.rows)&&sixRows(row.start.rows))b.set(k,row);
 }
 for(const [k,row] of Object.entries(result?.records||{})){
  if(validId(row)&&k===row.venue+':'+row.race&&row.verified===true&&orderOK(row.finishOrder))f.set(k,row);
 }
 const venues=[...new Set([morning,before,result].flatMap(x=>Array.isArray(x?.venues)?x.venues:[]).filter(validVenue))].sort((a,b)=>a-b);
 const partialOK=(x,k)=>x?.data?.verified===true&&timely(x)&&(k==='weather'||sixRows(x.data.rows));
 const counts={morning:0,morningTimed:0,morningOrder:0,before:0,exhibition:0,start:0,weather:0,partial:0,results:0,complete:0};
 const rows=[];
 for(const venue of venues)for(let race=1;race<=12;race++){
  const k=venue+':'+race,mr=m.get(k),br=b.get(k),fr=f.get(k),p=before?.partialRecords?.[k]||{};
  const deadlineAt=before?.deadlines?.[k]?.deadlineAt||br?.deadlineAt||mr?.deadlineAt||null;
  const deadline=Date.parse(deadlineAt||'');
  const expired=Number.isFinite(deadline)&&deadline<=now;
  const morningOK=!!mr,morningTimed=!!mr&&timely(mr),morningOrder=morningTimed&&orderOK(mr.predictedOrder);
  const exhibition=!!br||partialOK(p.exhibition,'exhibition'),start=!!br||partialOK(p.start,'start'),weather=br?.weather?.verified===true||partialOK(p.weather,'weather');
  const partial=!br&&(exhibition||start||weather);
  const flags={morning:morningOK,morningTimed,morningOrder,before:!!br,exhibition,start,weather,partial,results:!!fr,complete:morningOrder&&!!br&&!!fr};
  for(const key of Object.keys(counts))if(flags[key])counts[key]++;
  const missing=[];
  if(!morningOK)missing.push('morning_missing');else if(!morningOrder)missing.push('morning_evidence_missing');
  if(!br)missing.push(expired?'before_missing':Number.isFinite(deadline)?'before_pending':'deadline_unknown');
  if(!fr)missing.push(expired?'result_unconfirmed':Number.isFinite(deadline)?'result_pending':'result_unconfirmed_deadline_unknown');
  const reason=x=>typeof x==='string'?x:typeof x?.reason==='string'?x.reason:null;
  rows.push({venue,race,deadlineAt,flags,missing,failures:{deadline:reason(before?.discoveryFailures?.[k]),before:reason(before?.failures?.[k]),result:reason(result?.failures?.[k])},attempts:{deadline:before?.discoveryAttempts?.[k]||0,before:before?.attempts?.[k]||0,result:result?.attempts?.[k]||0}});
 }
 const stamp=x=>Number.isFinite(Date.parse(x||''))?x:null;
 return {date,expected:venues.length?venues.length*12:null,venues,counts,rows,updatedAt:{morning:stamp(morning?.updatedAt),before:stamp(before?.updatedAt),result:stamp(result?.updatedAt)},lastScan:before?.lastScan||null,archivesPresent:{morning:!!morning,before:!!before,result:!!result},source:'worker_kv_automatic_only',note:'予定枠数は実開催確定数ではありません。研究用GitHub保存・事後展示・例外着順の集計は含みません。未確認は中止・返還・不的中を意味しません。'};
}
export default {
  async scheduled(event,env,ctx) {
    // Route using the scheduled UTC hour rather than the provider's cron-string formatting.
    const scheduledTime=event.scheduledTime;
    const hour=new Date(scheduledTime).getUTCHours();
    const mode=hour===23?'morning':hour>=15?'result':'before';
    ctx.waitUntil((async()=>{
      const date=jstDateFromUtc(new Date(scheduledTime-(mode==='result'?86400000:0)));
      const key='scheduler-health:v1:'+mode+':'+date;
      const status={date,mode,scheduledAt:new Date(scheduledTime).toISOString(),cron:event.cron||null,status:'started'};
      const report=async()=>{try{await env.MORNING_KV.put(key,JSON.stringify(status),{expirationTtl:2592000});}catch(e){console.error('scheduler_health_write_failed',mode,String(e));}};
      await report();
      try{
        if(mode==='morning')await runScheduledMorning(env,scheduledTime);
        else if(mode==='result')await runScheduledResultArchive(env,scheduledTime);
        else await runScheduledBeforeArchive(env,scheduledTime);
        status.status='finished';
      }catch(error){status.status='failed';status.error=String(error?.message||error).slice(0,240);console.error('scheduler_failed',mode,status.error);throw error;}
      finally{status.finishedAt=new Date().toISOString();await report();}
    })());
  },
  async fetch(request,env) {
    const u = new URL(request.url);
    if (request.method === 'OPTIONS') return new Response(null, {status:204,headers:{...cors(request),'Access-Control-Allow-Methods':'GET, OPTIONS','Access-Control-Allow-Headers':'Content-Type','Access-Control-Max-Age':'600'}});
    
if(u.pathname==='/api/research/rank-audit-windows'){
 if(request.method!=='GET')return reply(request,{error:'Method not allowed'},405);
 const date=u.searchParams.get('date')||'';
 if(!/^20[0-9]{6}$/.test(date))return reply(request,{error:'Invalid date'},400);
 if(!env?.MORNING_KV)return reply(request,{date,status:'not_configured'},503);
 try{return reply(request,await readRankAuditWindows(env,date));}
 catch(error){return reply(request,{date,status:'unavailable',reason:String(error.message||error).slice(0,100)},422);}
}
if(u.pathname==='/api/research/rank-audit'){
 if(request.method!=='GET')return reply(request,{error:'Method not allowed'},405);
 const date=u.searchParams.get('date')||'';
 if(!/^20[0-9]{6}$/.test(date))return reply(request,{error:'Invalid date'},400);
 if(!env?.MORNING_KV)return reply(request,{date,status:'not_configured'},503);
 const raw=await env.MORNING_KV.get('rank-audit:v1:'+date);
 if(!raw)return reply(request,{date,status:'not_available'},404);
 return reply(request,JSON.parse(raw));
}
if(u.pathname==='/api/research/before-archive'){
 if(request.method!=='GET')return reply(request,{error:'Method not allowed'},405);
 const date=u.searchParams.get('date')||'';
 if(!/^20[0-9]{6}$/.test(date))return reply(request,{error:'Invalid date'},400);
 if(!env?.MORNING_KV)return reply(request,{date,status:'not_configured'},503);
 const raw=await env.MORNING_KV.get('before-archive:v1:'+date);
 if(!raw)return reply(request,{date,status:'not_available'},404);
 const state=JSON.parse(raw);
 return reply(request,{date,status:'recorded',updatedAt:state.updatedAt,verifiedCount:Object.keys(state.records||{}).length,attemptedCount:Object.keys(state.attempts||{}).length,discoveredDeadlineCount:Object.keys(state.deadlines||{}).length,partialCount:Object.keys(state.partialRecords||{}).length,lastScan:state.lastScan||null,discoveryFailures:state.discoveryFailures||{},failures:state.failures||{}});
}
// Read-only coverage diagnostics for archived observations; never estimate missing values.
if(u.pathname==='/api/research/morning-records'){
 if(request.method!=='GET')return reply(request,{error:'Method not allowed'},405);
 const date=u.searchParams.get('date')||'';
 if(!/^20[0-9]{6}$/.test(date))return reply(request,{error:'Invalid date'},400);
 if(!env?.MORNING_KV)return reply(request,{date,status:'not_configured'},503);
 const raw=await env.MORNING_KV.get('morning:'+date);
 if(!raw)return reply(request,{date,status:'not_available',records:[]},404);
 const state=JSON.parse(raw);
 const records=(Array.isArray(state.records)?state.records:[]).filter(x=>x?.date===date&&x.ready===true&&x.officialVerified===true&&x.statsVerified===true&&Number.isInteger(x.venue)&&x.venue>=1&&x.venue<=24&&Number.isInteger(x.race)&&x.race>=1&&x.race<=12).map(x=>({date,venue:x.venue,race:x.race,capturedAt:x.capturedAt||null,deadlineAt:x.deadlineAt||null,predictedOrder:x.predictedOrder||null,rankedScores:x.rankedScores||null,method:x.method||null,courseStats:x.courseStats||null}));
 return reply(request,{date,status:'recorded',records,note:'Original archived fields only; missing values are not backfilled.'});
}
if(u.pathname==='/api/research/scheduler-health'){
 if(request.method!=='GET')return reply(request,{error:'Method not allowed'},405);
 const date=u.searchParams.get('date')||'';
 if(!/^20[0-9]{6}$/.test(date))return reply(request,{error:'Invalid date'},400);
 if(!env?.MORNING_KV)return reply(request,{date,status:'not_configured'},503);
 const modes=['morning','before','result'];
 const raw=await Promise.all(modes.map(mode=>env.MORNING_KV.get('scheduler-health:v1:'+mode+':'+date)));
 return reply(request,{date,modes:Object.fromEntries(modes.map((mode,i)=>[mode,raw[i]?JSON.parse(raw[i]):null])),note:'Latest recorded execution for each mode; finished does not imply data collection succeeded.'});
}
if(u.pathname==='/api/research/morning-boat-one-audit'){
 if(request.method!=='GET')return reply(request,{error:'Method not allowed'},405);
 const date=u.searchParams.get('date')||'';
 if(!/^20[0-9]{6}$/.test(date))return reply(request,{error:'Invalid date'},400);
 const parsed=new Date(date.slice(0,4)+'-'+date.slice(4,6)+'-'+date.slice(6,8)+'T00:00:00Z');
 if(!Number.isFinite(parsed.getTime())||parsed.toISOString().slice(0,10).replace(/-/g,'')!==date)return reply(request,{error:'Invalid date'},400);
 if(!env?.MORNING_KV)return reply(request,{date,status:'not_configured'},503);
 try{
  const [m,f]=await Promise.all(['morning:','result-archive:v1:'].map(k=>env.MORNING_KV.get(k+date)));
  return reply(request,summarizeMorningBoatOne(date,JSON.parse(m||'null'),JSON.parse(f||'null')));
 }catch(e){return reply(request,{date,status:'archive_read_failed'},503);}
}
if(u.pathname==='/api/research/archive-inventory'){
 if(request.method!=='GET')return reply(request,{error:'Method not allowed'},405);
 const date=u.searchParams.get('date')||'';
 if(!/^20[0-9]{6}$/.test(date))return reply(request,{error:'Invalid date'},400);
 const parsed=new Date(date.slice(0,4)+'-'+date.slice(4,6)+'-'+date.slice(6,8)+'T00:00:00Z');
 if(!Number.isFinite(parsed.getTime())||parsed.toISOString().slice(0,10).replace(/-/g,'')!==date)return reply(request,{error:'Invalid date'},400);
 if(!env?.MORNING_KV)return reply(request,{date,status:'not_configured'},503);
 const keys=['morning:','before-archive:v1:','result-archive:v1:'];
 try{
  const raw=await Promise.all(keys.map(k=>env.MORNING_KV.get(k+date)));
  const values=raw.map(x=>{if(!x)return null;const d=JSON.parse(x);if(d?.date!==date)throw Error('archive date mismatch');return d;});
  return reply(request,buildArchiveInventory(date,...values));
 }catch(e){return reply(request,{date,status:'archive_read_failed',error:String(e?.message||e).slice(0,120)},503);}
}
if(u.pathname==='/api/research/archive-quality'){
 if(request.method!=='GET')return reply(request,{error:'Method not allowed'},405);
 const date=u.searchParams.get('date')||'';
 if(!/^20[0-9]{6}$/.test(date))return reply(request,{error:'Invalid date'},400);
 if(!env?.MORNING_KV)return reply(request,{date,status:'not_configured'},503);
 const keys=['morning:','before-archive:v1:','result-archive:v1:','rank-audit:v1:','before-audit:v1:'];
 const raw=await Promise.all(keys.map(key=>env.MORNING_KV.get(key+date)));
 const data=raw.map(value=>{try{const x=JSON.parse(value||'null');return x?.date===date?x:null;}catch{return null;}});
 const [morning,before,result,rankAudit,beforeAudit]=data;
 const venues=new Set([morning,before,result].flatMap(x=>Array.isArray(x?.venues)?x.venues:[]).filter(v=>Number.isInteger(v)&&v>=1&&v<=24));
 const expected=venues.size?venues.size*12:null;
 const validId=x=>x?.date===date&&Number.isInteger(x.venue)&&x.venue>=1&&x.venue<=24&&Number.isInteger(x.race)&&x.race>=1&&x.race<=12;
 const count=rows=>new Set(rows.filter(validId).map(x=>x.venue+':'+x.race)).size;
 const values=x=>Object.values(x?.records||{});
 const m=Array.isArray(morning?.records)?morning.records:[],b=values(before),f=values(result);
 const verifiedFinish=x=>x?.verified===true&&Array.isArray(x.finishOrder)&&x.finishOrder.length===6&&new Set(x.finishOrder).size===6&&x.finishOrder.every(n=>Number.isInteger(n)&&n>=1&&n<=6);
 const validTime=x=>{const c=Date.parse(x?.capturedAt||''),d=Date.parse(x?.deadlineAt||'');return Number.isFinite(c)&&Number.isFinite(d)&&c<d;};
 return reply(request,{date,expected,expectedBasis:'scheduled venue slots; cancellations and unavailable races are not classified',archivesPresent:Object.fromEntries(keys.map((key,i)=>[key,!!data[i]])),morning:{unique:count(m),preDeadline:count(m.filter(validTime)),invalidOrDuplicate:m.length-count(m)},before:{unique:count(b),preDeadline:count(b.filter(validTime)),invalidOrDuplicate:b.length-count(b)},results:{verified:count(f.filter(verifiedFinish)),invalidOrDuplicate:f.length-count(f)},matched:{morning:rankAudit?.matched??null,before:beforeAudit?.matched??null},note:'Coverage diagnostics only; missing records are not losses. No model changes.'});
}
if(u.pathname==='/api/research/before-audit'){
 if(request.method!=='GET')return reply(request,{error:'Method not allowed'},405);
 const date=u.searchParams.get('date')||'';
 if(!/^20[0-9]{6}$/.test(date))return reply(request,{error:'Invalid date'},400);
 if(!env?.MORNING_KV)return reply(request,{date,status:'not_configured'},503);
 const raw=await env.MORNING_KV.get('before-audit:v1:'+date);
 if(!raw)return reply(request,{date,status:'not_available'},404);
 return reply(request,JSON.parse(raw));
}
if(u.pathname==='/api/research/result-archive'){
 if(request.method!=='GET')return reply(request,{error:'Method not allowed'},405);
 const date=u.searchParams.get('date')||'';
 if(!/^20[0-9]{6}$/.test(date))return reply(request,{error:'Invalid date'},400);
 if(!env?.MORNING_KV)return reply(request,{date,status:'not_configured'},503);
 const raw=await env.MORNING_KV.get('result-archive:v1:'+date);
 if(!raw)return reply(request,{date,status:'not_available',verifiedCount:0},404);
 const state=JSON.parse(raw);
 return reply(request,{...state,note:'Verified six-boat finish orders only. Unverified races are not losses or proof of cancellation.'});
}

if (u.pathname === '/api/morning/snapshot') {
  if(request.method!=='GET')return reply(request,{error:'Method not allowed'},405);
  const date=u.searchParams.get('date')||'';
  if(!/^20[0-9]{6}$/.test(date))return reply(request,{error:'Invalid YYYYMMDD date'},400);
  if(!env?.MORNING_KV)return reply(request,{date,status:'not_configured',message:'Scheduled storage is not configured'},503);
  const saved=await env.MORNING_KV.get('morning:'+date);
  if(!saved)return reply(request,{date,status:'not_available',message:'No saved morning snapshot'},404);
  const state=JSON.parse(saved);
  const records=Array.isArray(state.records)?state.records:[];
  const evidenceValid=row=>validSavedMorningRecord(row,date);
  const verifiedEvidence=records.filter(evidenceValid).length;
  const rankedCandidates=['main','upset','chaos'].flatMap(k=>Array.isArray(state.categories?.[k])?state.categories[k]:[]);
  const validCandidate=x=>{const row=records.find(y=>y.venue===x?.venue&&y.race===x?.race);return !!(row&&evidenceValid(row)&&x.date===date&&x.capturedAt===row.capturedAt&&x.deadlineAt===row.deadlineAt&&JSON.stringify(x.predictedOrder)===JSON.stringify(row.predictedOrder));};
  const verifiedCategories=Object.fromEntries(['main','upset','chaos'].map(k=>[k,(Array.isArray(state.categories?.[k])?state.categories[k]:[]).filter(validCandidate)]));
  const validCandidateCount=Object.values(verifiedCategories).reduce((n,rows)=>n+rows.length,0);
  return reply(request,{date,status:state.status,evidence:{verifiedRecords:verifiedEvidence,unverifiedRecords:records.length-verifiedEvidence,quarantinedRecords:Array.isArray(state.invalidMorningRecords)?state.invalidMorningRecords.length:0,verifiedCandidates:validCandidateCount,unverifiedCandidates:rankedCandidates.length-validCandidateCount},updatedAt:state.updatedAt||null,venues:state.venues||[],
    completedVenues:state.completedVenues||[],failedVenues:state.failedVenues||[],exhaustedVenues:state.exhaustedVenues||[],
    scheduleLastCheck:state.scheduleLastCheck||'unknown',
    verifiedRacesByVenue:Object.fromEntries((state.venues||[]).map(v=>[v,(state.records||[]).filter(r=>r.venue===v&&evidenceValid(r)).length])),
    categories:state.categories||{main:[],upset:[],chaos:[]},verifiedCategories,categoryCoverage:Object.fromEntries(Object.entries(verifiedCategories).map(([k,rows])=>[k,{verified:rows.length,target:20,shortfall:Math.max(0,20-rows.length)}])),boatOneRanking:Array.isArray(state.boatOneRanking)?state.boatOneRanking:[],boatOneRankedAt:state.boatOneRankedAt||null,boatOneRankingMethod:'boat_one_score_margin_v1',boatOneRankingProbabilityVerified:false,eligible:(state.records||[]).length,
    provisional:true,method:'two_factor_morning_screening_unvalidated',modelVersion:'morning-rank-v1',retentionDays:365,calibrationStatus:'not_yet_calibrated',note:'Historical snapshots preserve baseline rankings; no automatic weight tuning until verified results are matched.'});
}

if (u.pathname === '/api/morning/venues') {
  if(request.method!=='GET')return reply(request,{error:'Method not allowed'},405);
  const date=u.searchParams.get('date')||'';
  if(!/^20\d{6}$/.test(date))return reply(request,{error:'Invalid date; use YYYYMMDD'},400);
  // Each request verifies one venue only, so a slow official site cannot block all 24.
  const offset=Math.max(0,Math.min(23,Number(u.searchParams.get('offset')||0)||0));
  const venue=offset+1;
  let verified=false;
  try {
    const data=await fetchOfficialRacers(date,venue,1,{verificationOnly:true,fastVerification:true});
    verified=data?.verified===true;
  }catch{}
  return reply(request,{date,status:'partial_verified_race1_fallback',
    venues:verified?[venue]:[],venueCount:verified?1:0,
    nextOffset:offset<23?offset+1:null,checkedVenue:venue,
    completeScheduleVerified:false,forecastStatus:'not_generated',
    message:'公式1R出走表による逐次確認。未確認は非開催を意味しません。'});

}

// Connectivity-only diagnostics: do not treat HTTP success as verified race data.
if (u.pathname === '/api/official/source-diagnostics') {
  if(request.method!=='GET')return reply(request,{error:'Method not allowed'},405);
  const date=u.searchParams.get('date')||'',venue=Number(u.searchParams.get('venue')),race=Number(u.searchParams.get('race')||1);
  if(!/^20[0-9]{6}$/.test(date)||!Number.isInteger(venue)||venue<1||venue>24||!Number.isInteger(race)||race<1||race>12)
    return reply(request,{error:'Invalid date, venue or race'},400);
  const urls=[
    ['pc_racelist','https://www.boatrace.jp/owpc/pc/race/racelist?rno='+race+'&jcd='+String(venue).padStart(2,'0')+'&hd='+date],
    ['pc_schedule','https://www.boatrace.jp/owpc/pc/race/index?hd='+date],
    ['sp_race','https://www.boatrace.jp/owsp/sp/race/index?hd='+date+'&jcd='+String(venue).padStart(2,'0')]
  ];
  const checks=[];
  for(const [source,url] of urls){
    const started=Date.now();
    try{
      const res=await fetch(url,{headers:{Accept:'text/html'},signal:AbortSignal.timeout(4000)});
      const contentType=res.headers.get('content-type')||'';
      // Do not read the body; this endpoint tests reachability only.
      if(res.body)await res.body.cancel();
      checks.push({source,status:res.status,ok:res.ok,contentType:contentType.slice(0,90),elapsedMs:Date.now()-started});
    }catch(error){
      checks.push({source,ok:false,errorName:String(error?.name||'Error').slice(0,50),elapsedMs:Date.now()-started});
    }
  }
  return reply(request,{date,venue,race,checks,verified:false,note:'Connectivity diagnostics only. HTTP 200 does not verify six racers.'});
}
if (u.pathname === '/api/version') return reply(request,{app:'Boat Score 2 preview',build:'20261126-official-position-trial-v1',sourceBranch:'fix-boat-score-2-syntax-20261115',features:['official-verified-venues','official-verified-races','six-racer-finish-rate-comparison','abort-obsolete-fetches','bounded-upstream-concurrency'],deployedAt:'not_reported'});

if (u.pathname === '/' || u.pathname === '/index.html') {
  if(request.method!=='GET')return reply(request,{error:'Method not allowed'},405);
  const html = String.raw`<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Boat Score 2</title>
<style>body{font-family:system-ui,sans-serif;background:#0b1424;color:#e5f0ff;margin:0}main{max-width:720px;margin:auto;padding:18px}h1{font-size:1.65rem}section{background:#17253b;border-radius:14px;padding:18px;margin:14px 0;box-shadow:0 2px 9px #172a4212}label{display:block;margin:12px 0 4px;font-weight:600}input,select,button{font:inherit;padding:11px;border:1px solid #b6c4d3;border-radius:8px;max-width:100%;box-sizing:border-box}button{background:#1768a6;color:white;border:0;margin:12px 0;cursor:pointer}button:disabled{opacity:.5}a{color:#72c8ff}pre{white-space:pre-wrap;overflow-wrap:anywhere;font-size:.85rem}small{color:#a9bdd5}.warn{color:#a64a00}.table-hint{font-size:.85rem;color:#a9bdd5;margin:10px 0 4px}.comparison-scroll{display:block;width:100%;max-width:100%;box-sizing:border-box;overflow-x:scroll;overflow-y:hidden;touch-action:pan-x pan-y;overscroll-behavior-x:contain;-webkit-overflow-scrolling:touch;border:1px solid #354760;border-radius:8px}.comparison-scroll #comparison{width:1800px!important;min-width:1800px!important;table-layout:auto}.comparison-controls{display:flex;gap:8px}.comparison-controls button{flex:1;margin:4px 0 8px;padding:10px;font-size:.9rem}.comparison-scroll th,.comparison-scroll td{white-space:nowrap;padding:9px 11px;border-bottom:1px solid #354760;text-align:left}.comparison-scroll th:first-child,.comparison-scroll td:first-child{position:sticky;left:0;background:#17253b;z-index:1;box-shadow:2px 0 3px #0b1424}.comparison-scroll th:first-child{z-index:2}.prediction-side-by-side{display:grid;grid-template-rows:auto;grid-auto-flow:column;grid-auto-columns:calc((100% - 8px)/2);gap:8px;align-items:start;max-width:100%;min-width:0;overflow-x:auto;padding-bottom:8px;scroll-snap-type:x proximity;overscroll-behavior-x:contain;-webkit-overflow-scrolling:touch}.prediction-side-by-side>.prediction-panel{scroll-snap-align:start;min-width:0}.prediction-side-by-side>#venueTraitsPanel{grid-column:auto}.prediction-side-by-side .prediction-panel h3{min-height:2.6em}.prediction-side-by-side #venueTraitsPanel h3{min-height:0}.prediction-panel [role=status]{min-width:0;overflow-wrap:anywhere}.prediction-side-by-side .prediction-compact{line-height:1.4}.prediction-side-by-side .prediction-panel:nth-child(3){border-color:#a18a46}.prediction-side-by-side .prediction-panel:nth-child(4){border-color:#a18a46}@media(max-width:759px){main{padding:8px}#racePanel{padding:10px}#previewTabs button{padding:7px 9px;margin:3px 0;font-size:12px}.prediction-panel{padding:7px 5px}}.prediction-side-by-side>.prediction-panel:nth-child(1){border-color:#4590c8}.prediction-side-by-side>.prediction-panel:nth-child(2){border-color:#4590c8}.prediction-side-by-side>#venueTraitsPanel{border-color:#64748b}.prediction-side-by-side #venueTraitsText{font-size:13px;line-height:1.6}.prediction-side-by-side #venueTraitsLink{display:block;font-size:12px;line-height:1.5;margin-top:10px}.prediction-panel{min-width:0;padding:7px 5px;border:1px solid #354760;border-radius:9px;box-sizing:border-box}.prediction-panel h3{font-size:clamp(12px,3.2vw,17px);line-height:1.3;margin:0 0 7px;overflow-wrap:anywhere}.prediction-panel pre{margin:0;white-space:pre-wrap;overflow-wrap:anywhere;font-size:clamp(11px,2.9vw,15px);line-height:1.35;letter-spacing:-.025em}.prediction-panel details{font-size:12px;margin:0 0 6px}.prediction-panel details input,.prediction-panel details select{max-width:100%;box-sizing:border-box}.prediction-panel details button{font-size:12px;padding:6px}.prediction-panel .prediction-compact{font-variant-numeric:tabular-nums}.prediction-panel .prediction-full{margin-top:8px}@media(min-width:760px){main{max-width:960px}.prediction-side-by-side{gap:14px;grid-auto-columns:calc((100% - 14px)/2)}.prediction-panel{padding:14px}.prediction-panel pre{font-size:16px}}</style></head>
<body><main><h1>Boat Score 2</h1><nav id="previewTabs" aria-label="表示切り替え" style="display:flex;gap:6px;flex-wrap:wrap;position:sticky;top:0;background:#0b1424;z-index:5"><button type="button" data-panel="racePanel" aria-pressed="true">レース・予想</button><button type="button" data-panel="makulaboPanel" aria-pressed="false">画像取り込み</button><button type="button" data-panel="historyPanel" aria-pressed="false">結果比較</button><button type="button" data-panel="morningRankingSection" aria-pressed="false">朝8時一覧</button><button type="button" data-panel="researchPanel" aria-pressed="false">研究資料</button></nav><section id="racePanel"><h2>開催場・レースをまとめて選択</h2><label for="day">開催日</label><input type="date" id="day"><button type="button" id="officialScheduleLink">選択日の公式開催一覧を確認</button><script>document.getElementById("officialScheduleLink").addEventListener("click",function(){const d=document.getElementById("day").value;if(d)window.open("https://www.boatrace.jp/owpc/pc/race/index?hd="+d.replace(/-/g,""),"_blank","noopener");});</script><label for="venue">競艇場</label><select id="venue"><option value="">競艇場を選択</option><option value="1">桐生</option><option value="2">戸田</option><option value="3">江戸川</option><option value="4">平和島</option><option value="5">多摩川</option><option value="6">浜名湖</option><option value="7">蒲郡</option><option value="8">常滑</option><option value="9">津</option><option value="10">三国</option><option value="11">びわこ</option><option value="12">住之江</option><option value="13">尼崎</option><option value="14">鳴門</option><option value="15">丸亀</option><option value="16">児島</option><option value="17">宮島</option><option value="18">徳山</option><option value="19">下関</option><option value="20">若松</option><option value="21">芦屋</option><option value="22">福岡</option><option value="23">唐津</option><option value="24">大村</option></select><label for="race">レース</label><select id="race"><option value="">レースを選択</option><option value="1">1R</option><option value="2">2R</option><option value="3">3R</option><option value="4">4R</option><option value="5">5R</option><option value="6">6R</option><option value="7">7R</option><option value="8">8R</option><option value="9">9R</option><option value="10">10R</option><option value="11">11R</option><option value="12">12R</option></select><button id="load">選択したレースの公式データを取得</button><button id="predictSelected">このレースを予想（本命6点・穴6点）</button><details id="beforeinfoDetails"><summary>直前情報の公式照合（展示・ST・進入・風）</summary><p>公式照合できた値だけを表示します。未確認項目は予想に加点しません。</p><button type="button" id="checkBeforeinfo">選択レースの直前情報を確認</button></details><pre id="beforeinfoStatus" role="status" style="white-space:pre-wrap;overflow-wrap:anywhere">直前情報：未取得。開催場・レースを選択してください。</pre><p id="predictStatus" role="status">競艇場とレースを選択してください。</p><details><summary>予想に使用した情報・注意事項</summary><p id="predictionInputNotice" role="status" style="font-size:.9rem;line-height:1.5;color:#cbd5e1">予想は公式6艇・勝率・モーター成績による暫定評価です。選択レースの予想では、公式確認済みの展示タイムと数値の展示STが6艇分そろった場合に限り、小幅な補正を行います。展示STのF・L表示は、公式の選手平均STを照合できた場合だけ代用し、代用した艇を明示します。進入・チルト・風・波・まくらぼ50走は予想点数に未反映です。取得状況は予想結果の「直前情報の反映」で確認してください。</p></details><p style="font-size:12px;color:#cbd5e1;margin:6px 0">横一列で比較（左右にスワイプ）：全国・当地平均の通常予想 → 当地勝率の基礎予想 → 全国・当地平均の直前＋まくらぼ → 当地勝率の直前＋まくらぼ → 開催場特性。</p><div class="prediction-side-by-side" aria-label="予想と開催場特性の比較"><div class="prediction-panel"><h3>全国・当地平均<br>従来予想</h3><pre id="predictCompact" class="prediction-compact" role="status">予想を実行してください。</pre><details class="prediction-full"><summary>取得状況・詳細</summary><pre id="predictOutput"></pre></details></div><div class="prediction-panel"><h3>当地勝率<br>基礎予想</h3><div id="localBasePrediction" role="status">予想を実行してください。</div></div><div class="prediction-panel"><h3>全国・当地平均<br>直前＋まくらぼ</h3><pre id="combinedCompact" class="prediction-compact" role="status">まくらぼと直前情報の照合待ち</pre><details><summary>風・進入予測を手動変更</summary><small>確認できた値だけ入力。手入力は公式確認済みとは扱いません。</small><label for="trialWind">風向（スタート方向に対して）</label><select id="trialWind"><option value="">未確認</option><option value="head">向かい風</option><option value="tail">追い風</option><option value="cross">横風</option><option value="calm">無風</option></select><label for="trialWindSpeed">風速（m/s）</label><input id="trialWindSpeed" type="number" min="0" max="30" step="0.1" placeholder="未確認"><label for="trialEntry">進入予測（内から順に6艇）</label><input id="trialEntry" inputmode="numeric" placeholder="例：123456" maxlength="11"><button type="button" id="trialApply">変更を試算に反映</button><button type="button" id="trialClear">入力をクリア</button><p id="trialStatus" role="status">未入力。入力は選択中のレースだけに適用します。</p></details><details class="prediction-full"><summary>反映条件・詳細</summary><pre id="combinedPredictionOutput">公式6艇・展示タイム・展示ST・まくらぼ50走を照合後に表示します。未確認の場合は保留します。</pre></details></div><div class="prediction-panel"><h3>当地勝率<br>直前＋まくらぼ</h3><div id="localCombinedPrediction" role="status">予想を実行してください。</div></div><aside id="venueTraitsPanel" class="prediction-panel" style="overflow-wrap:anywhere"><h3>開催場特性（参考）</h3><small>予想点数には未反映</small><p id="venueTraitsText" style="white-space:pre-wrap;margin:6px 0" aria-live="polite">開催場を選択してください。</p><a id="venueTraitsLink" href="https://www.boatrace.jp/owpc/pc/extra/data/index.html" target="_blank" rel="noopener noreferrer">公式コース別入着率・水面図</a></aside></div><section id="scenarioPredictionPanel" style="padding:12px;margin:14px 0;border:1px solid #64748b"><h2 style="font-size:18px;margin:0 0 6px">展開指定予想（独立試算）</h2><small>全国＋当地勝率・モーター・照合済み直前情報・まくらぼ50走。既存の予想とは別に表示します。</small><p style="font-size:13px;margin:8px 0">艇番をタップして複数選択。未選択の着順は指定なし。同じ艇を異なる着順の候補に含めても、実際の組み合わせでは重複させません。</p><fieldset id="scenarioFirst" style="min-width:0;margin:10px 0;padding:5px;border:1px solid #52647c;border-radius:8px"><legend>1着 <span id="scenarioFirstSummary" style="font-size:12px;color:#a9bdd5">指定なし</span></legend><div style="display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:4px"><button type="button" data-boat="1" aria-label="1着 1号艇" aria-pressed="false" style="margin:0;min-height:44px;padding:4px 0;border:2px solid #64748b;background:#fff;color:#111;font-weight:700">1<span style="display:block;font-size:11px" aria-hidden="true">□</span></button><button type="button" data-boat="2" aria-label="1着 2号艇" aria-pressed="false" style="margin:0;min-height:44px;padding:4px 0;border:2px solid #64748b;background:#222;color:#fff;font-weight:700">2<span style="display:block;font-size:11px" aria-hidden="true">□</span></button><button type="button" data-boat="3" aria-label="1着 3号艇" aria-pressed="false" style="margin:0;min-height:44px;padding:4px 0;border:2px solid #64748b;background:#dc2626;color:#fff;font-weight:700">3<span style="display:block;font-size:11px" aria-hidden="true">□</span></button><button type="button" data-boat="4" aria-label="1着 4号艇" aria-pressed="false" style="margin:0;min-height:44px;padding:4px 0;border:2px solid #64748b;background:#2563eb;color:#fff;font-weight:700">4<span style="display:block;font-size:11px" aria-hidden="true">□</span></button><button type="button" data-boat="5" aria-label="1着 5号艇" aria-pressed="false" style="margin:0;min-height:44px;padding:4px 0;border:2px solid #64748b;background:#eab308;color:#111;font-weight:700">5<span style="display:block;font-size:11px" aria-hidden="true">□</span></button><button type="button" data-boat="6" aria-label="1着 6号艇" aria-pressed="false" style="margin:0;min-height:44px;padding:4px 0;border:2px solid #64748b;background:#16a34a;color:#fff;font-weight:700">6<span style="display:block;font-size:11px" aria-hidden="true">□</span></button></div></fieldset><fieldset id="scenarioSecond" style="min-width:0;margin:10px 0;padding:5px;border:1px solid #52647c;border-radius:8px"><legend>2着 <span id="scenarioSecondSummary" style="font-size:12px;color:#a9bdd5">指定なし</span></legend><div style="display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:4px"><button type="button" data-boat="1" aria-label="2着 1号艇" aria-pressed="false" style="margin:0;min-height:44px;padding:4px 0;border:2px solid #64748b;background:#fff;color:#111;font-weight:700">1<span style="display:block;font-size:11px" aria-hidden="true">□</span></button><button type="button" data-boat="2" aria-label="2着 2号艇" aria-pressed="false" style="margin:0;min-height:44px;padding:4px 0;border:2px solid #64748b;background:#222;color:#fff;font-weight:700">2<span style="display:block;font-size:11px" aria-hidden="true">□</span></button><button type="button" data-boat="3" aria-label="2着 3号艇" aria-pressed="false" style="margin:0;min-height:44px;padding:4px 0;border:2px solid #64748b;background:#dc2626;color:#fff;font-weight:700">3<span style="display:block;font-size:11px" aria-hidden="true">□</span></button><button type="button" data-boat="4" aria-label="2着 4号艇" aria-pressed="false" style="margin:0;min-height:44px;padding:4px 0;border:2px solid #64748b;background:#2563eb;color:#fff;font-weight:700">4<span style="display:block;font-size:11px" aria-hidden="true">□</span></button><button type="button" data-boat="5" aria-label="2着 5号艇" aria-pressed="false" style="margin:0;min-height:44px;padding:4px 0;border:2px solid #64748b;background:#eab308;color:#111;font-weight:700">5<span style="display:block;font-size:11px" aria-hidden="true">□</span></button><button type="button" data-boat="6" aria-label="2着 6号艇" aria-pressed="false" style="margin:0;min-height:44px;padding:4px 0;border:2px solid #64748b;background:#16a34a;color:#fff;font-weight:700">6<span style="display:block;font-size:11px" aria-hidden="true">□</span></button></div></fieldset><fieldset id="scenarioThird" style="min-width:0;margin:10px 0;padding:5px;border:1px solid #52647c;border-radius:8px"><legend>3着 <span id="scenarioThirdSummary" style="font-size:12px;color:#a9bdd5">指定なし</span></legend><div style="display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:4px"><button type="button" data-boat="1" aria-label="3着 1号艇" aria-pressed="false" style="margin:0;min-height:44px;padding:4px 0;border:2px solid #64748b;background:#fff;color:#111;font-weight:700">1<span style="display:block;font-size:11px" aria-hidden="true">□</span></button><button type="button" data-boat="2" aria-label="3着 2号艇" aria-pressed="false" style="margin:0;min-height:44px;padding:4px 0;border:2px solid #64748b;background:#222;color:#fff;font-weight:700">2<span style="display:block;font-size:11px" aria-hidden="true">□</span></button><button type="button" data-boat="3" aria-label="3着 3号艇" aria-pressed="false" style="margin:0;min-height:44px;padding:4px 0;border:2px solid #64748b;background:#dc2626;color:#fff;font-weight:700">3<span style="display:block;font-size:11px" aria-hidden="true">□</span></button><button type="button" data-boat="4" aria-label="3着 4号艇" aria-pressed="false" style="margin:0;min-height:44px;padding:4px 0;border:2px solid #64748b;background:#2563eb;color:#fff;font-weight:700">4<span style="display:block;font-size:11px" aria-hidden="true">□</span></button><button type="button" data-boat="5" aria-label="3着 5号艇" aria-pressed="false" style="margin:0;min-height:44px;padding:4px 0;border:2px solid #64748b;background:#eab308;color:#111;font-weight:700">5<span style="display:block;font-size:11px" aria-hidden="true">□</span></button><button type="button" data-boat="6" aria-label="3着 6号艇" aria-pressed="false" style="margin:0;min-height:44px;padding:4px 0;border:2px solid #64748b;background:#16a34a;color:#fff;font-weight:700">6<span style="display:block;font-size:11px" aria-hidden="true">□</span></button></div></fieldset><p id="scenarioCombinationCount" role="status" style="font-size:13px">条件内 120通り（指定なし）</p><div style="display:flex;gap:8px;flex-wrap:wrap"><button type="button" id="runScenarioPrediction">指定条件で予想</button><button type="button" id="clearScenarioPrediction" style="background:#354760">指定解除</button></div><p id="scenarioPredictionStatus" role="status">着順を1つ以上指定してください。</p><div id="scenarioPredictionOutput" style="white-space:pre-wrap;overflow-wrap:anywhere" aria-live="polite"></div><section style="padding:8px;border:1px solid #64748b;margin:12px 0"><h3 style="font-size:15px;margin:0 0 6px">1号艇1着固定：着順別・隣接ST研究（比較用）</h3><small>11/24・25の探索結果による仮配点。現行展開指定予想とは独立。改善効果は未確認。</small><div id="scenarioCourseTrialOutput" role="status" style="white-space:pre-wrap;overflow-wrap:anywhere;margin-top:8px">1着を1号艇だけに指定して比較できます。</div></section><details style="margin:8px 0"><summary>選手別コース成績（公式・研究用）</summary><div id="scenarioOfficialCourseStats" role="status" style="white-space:pre-wrap;overflow-wrap:anywhere">予想実行後に表示します。</div><small>1～3着それぞれの回数／通常完走数。展示進入が未確認なら枠番を仮のコースとして表示。既存予想点数には未反映です。</small><h4>選手別着順補正の独立研究方式</h4><pre id="officialPositionTrialOutput" style="white-space:pre-wrap;overflow-wrap:anywhere">1号艇1着固定で比較できます。</pre><small>同コース全選手の成績を20走相当の事前分布として使用する仮補正。改善効果は未確認です。</small></details><details style="margin:8px 0"><summary>展開指定予想の研究記録（端末保存）</summary><p id="scenarioArchiveStatus" role="status">予想実行時に自動記録します。</p><small>締切前の公式応答時刻と端末記録時刻を区別。記録はこのブラウザー内のみで、サーバー認証済み予想履歴ではありません。</small><div style="display:flex;gap:6px;flex-wrap:wrap"><button type="button" id="scenarioArchiveList">選択日の記録確認</button><button type="button" id="scenarioArchiveExport">選択日のJSON保存</button><button type="button" id="scenarioArchiveAudit">公式結果と照合・集計</button></div><p id="scenarioAuditStatus" role="status"></p><pre id="scenarioAuditOutput" style="white-space:pre-wrap;overflow-wrap:anywhere"></pre><pre id="scenarioArchiveOutput" style="white-space:pre-wrap;overflow-wrap:anywhere"></pre></details><small>指定した展開が成立する確率は未算出。風・波は未反映。研究方式の進入は展示コースのみです。</small></section><section><h2>まくらぼ直近50走</h2><p>開催日・競艇場・レースを選び、自動検索できます。空白の着順回数は0、49走は49走として照合します。</p><button type="button" id="searchMakulaboInBoatScore">まくらぼを自動検索</button><p id="makulaboSearchStatus" role="status"></p><div id="makulaboSearchResult"></div><p><a id="openMakulaboForRace" href="/tools/makulabo-screenshot">画像で確認・手動取り込み</a></p></section><details><summary>12方式の詳細（必要な場合のみ開く）</summary><p>各方式の検証用予想。未確認データの方式は保留します。</p><button type="button" id="predictTwelveMethods">12方法を表示</button><p id="twelveMethodStatus" role="status">開催日・場・レースを選び、ボタンを押してください。</p><pre id="twelveMethodOutput" style="white-space:pre-wrap;overflow-wrap:anywhere"></pre></details><details id="recent50CompareTab"><summary>まくらぼ50走反映：前後の点数・買い目比較（試算）</summary><p>6艇照合済みの場合のみ、直近50走の1着率から最大10点を加算して比較します。通常予想は変更しません。</p><pre id="recent50CompareOutput">予想実行後に表示します。</pre></details><details><summary>まくらぼ着順別ヒートマップ比較（試算）</summary><pre id="positionHeatmapOutput">まくらぼ取得後に予想を実行してください。</pre></details><details><summary>開催場の一括照合（任意・詳細）</summary><p><button id="schedule">開催場の一括照合（任意）</button></p><p id="scheduleStatus" role="status">公式出走表を確認できたレースだけ選択できます。</p><div id="scheduleOutput"></div><small>一括照合は参考情報です。開催の有無・出走表はレース取得時に公式確認し、未確認の情報は補いません。</small></details><p id="status" role="status"></p><p class="table-hint">選手比較表：横に指で動かすか、下の「右へ」「左へ」を押してください。</p><div class="comparison-controls"><button type="button" id="comparisonLeft">◀ 左へ</button><button type="button" id="comparisonRight">右へ ▶</button></div><div class="comparison-scroll" role="region" aria-label="出走選手の公式成績比較表（左右スクロール可能）" tabindex="0"><table id="comparison" style="border-collapse:collapse;width:max-content;min-width:100%;font-size:.84rem"><thead><tr><th>艇</th><th>選手名</th><th>登録番号</th><th>全国勝率</th><th>当地勝率</th><th>全国2連対率</th><th>全国3連対率</th><th>当地2連対率</th><th>当地3連対率</th><th>モーター</th><th>モーター2連対率</th><th>モーター3連対率</th><th>平均ST</th><th>展示タイム</th><th>展示ST</th><th>進入</th><th>チルト</th><th>まくらぼ50走</th></tr></thead><tbody id="comparisonBody"><tr><td colspan="18">レースを選んで「公式データを確認」を押してください</td></tr></tbody></table></div><small>選手の全国・当地2連対率／3連対率、モーター2連対率／3連対率を復元しました。公式照合できた場合のみ表示します。1着率・2着率・3着率の個別値はこの取得元からは未取得です。平均STは公式から個別に照合できた場合のみ表示します。まくらぼ50走は未確認です。</small><h3>選手の入賞率比較（公式照合済みのみ）</h3><div id="finishRateSummary" role="status">レースを選んで公式データを確認してください。</div><details><summary>公式データの取得結果・診断ログ</summary><pre id="output"></pre></details><h3>出走選手・診断ポイント</h3><div id="racerPoints" role="status">公式データ確認後に表示します。未確認項目は加点しません。</div></section>
<section id="makulaboPanel" hidden><h2>まくらぼ画像取り込み</h2><p id="makulaboFrameStatus" role="status">レースを選択してから画像取り込みを開いてください。</p><button type="button" id="loadMakulaboFrame">選択レースの取り込み画面を開く</button><iframe id="makulaboFrame" title="まくらぼ画像取り込み" style="width:100%;height:75vh;border:0" hidden></iframe></section><section id="historyPanel" hidden><h2>過去レースの予想・確定結果比較</h2><p>上で開催日・競艇場・レースを選択してください。Boat Score 2と同じ予想APIで再計算し、公式の確定着順と照合します。</p><button id="compareHistorical">選択した過去レースを予想・結果照合</button><pre id="compareHistoricalOutput">未実行</pre><small>過去時点の保存済み予想ではありません。取得できる現在の公式成績で再計算する場合があり、朝8時の的中実績とは区別します。まくらぼと直前情報が未取得なら比較に含みません。</small></section>

<section id="morningRankingSection" hidden><h2>朝8時の全国レース予想ランキング</h2><p>当日の開催場を一斉評価した暫定ランキングです。既存3分類と1号艇1着期待度の各20レース（最大80表示枠）。候補不足時は確認できた件数のみ表示します。分類間の重複あり。</p><p id="morningRankingStatus" role="status">朝8時の保存予想を確認しています…</p><div id="morningLinks" aria-label="朝8時の全国ランキングからレースを選択"></div><details><summary>1号艇1着期待度20件の実績（研究）</summary><button type="button" id="loadBoatOneAudit">保存済み公式結果と照合</button><pre id="boatOneAuditOutput" role="status" style="white-space:pre-wrap;overflow-wrap:anywhere"></pre><small>前日分の公式結果が自動保存された後に集計可能。未確認・締切後の順位は分母外。実測率であり将来の勝率ではありません。</small></details><small>公式6艇と基礎成績による朝の暫定評価です。直前展示・風・進入・まくらぼ50走を加味した確定予想ではありません。的中率は未検証です。</small></section>
<details id="researchPanel" style="margin:16px 0" hidden><summary>開発・研究資料</summary><small>開発版 20261126-official-position-trial-v1 · <a href="/api/version" target="_blank" rel="noopener">公開バージョンを確認</a></small><section id="dailyArchiveInventory" style="margin:14px 0;padding:12px;border:1px solid #64748b;border-radius:10px"><h2 style="font-size:18px;margin:0 0 8px">日別の自動保存管理</h2><small>アプリの自動保存（サーバーKV）のみ。GitHubの研究用事後保存とは別集計です。</small><label for="inventoryDate">開催日</label><input type="date" id="inventoryDate"><button type="button" id="loadInventory">保存状況を確認・更新</button><p id="inventoryNotice" role="status">日付を選択して確認してください。</p><div id="inventorySummary"></div><details><summary>不足・未確認レースと理由</summary><div id="inventoryMissing" style="font-size:13px;overflow-wrap:anywhere"></div></details><small>未確認は欠場・中止・返還と断定しません。締切前に保存した情報と事後取得を混ぜません。</small></section><section id="archiveResearchStatus" style="margin:14px 0;padding:12px;border:1px solid #64748b;border-radius:10px"><h2>自動収集・分析状況</h2><label for="archiveResearchDate">集計終了日</label><input type="date" id="archiveResearchDate"><button type="button" id="loadArchiveResearch">保存済み分析を確認</button><p id="archiveResearchNotice" role="status">未取得</p><pre id="archiveResearchOutput" style="white-space:pre-wrap;overflow-wrap:anywhere">必要なときだけ取得します。</pre><small>評価順位と確定着順の統計です。自動学習・評価方式変更は未実装です。</small></section><section id="exclusionResearchStatus" aria-label="過去データ除外検証の状況" style="border:1px solid #64748b;border-radius:12px;padding:14px;margin:14px 0">
<h2 style="margin:0 0 8px;font-size:18px">1着・2着除外の研究状況（2026/11/23確認）</h2>
<p style="margin:4px 0 10px">過去3日分のうち検証可能な275レースを分析。レース後に再計算した評価点による研究結果です。</p>
<table style="width:100%;border-collapse:collapse;font-size:13px"><caption style="text-align:left;margin-bottom:5px">11/19・11/21で候補を選び、11/22の結果で照合</caption>
<thead><tr><th style="text-align:left">研究候補</th><th>対象</th><th>除外失敗</th></tr></thead>
<tbody><tr><td>評価6位・6号艇</td><td>1着</td><td>0/32</td></tr>
<tr><td>評価6位・6号艇</td><td>2着以内</td><td>0/32</td></tr>
<tr><td>評価5位・6号艇</td><td>1着</td><td>0/18</td></tr>
<tr><td>評価5位・4号艇</td><td>1着</td><td>0/17</td></tr>
<tr><td>評価6位・5号艇</td><td>1着</td><td>0/22</td></tr></tbody></table>
<p style="font-size:12px;margin:10px 0 0"><strong>研究用・自動除外なし。</strong> 事前に保存した予想による的中率ではありません。検証日は1日で、将来の入着を保証しません。実際の買い目や12方式の点数は変更しません。</p>
</section>
<section><details><summary>開発用：朝8時の全国事前評価・保存結果</summary><h2>朝8時の全国事前評価</h2><p>当日開催場の公式日程を先に確認します。予想・ランキングはデータ確認が完了するまで表示しません。</p><button id="morningSaved">朝8時のサーバー保存結果</button><details><summary>朝8時の手動確認・再集計（開発用）</summary><button id="morningCheck">選択日の開催場を確認</button><button id="morningVenue">選択場の12Rを事前評価</button><button id="morningNational">全国の開催候補を集計</button></details><p id="morningStatus" role="status">未確認</p><pre id="morningOutput"></pre><small>本命20R・穴20R・大荒れ20R・1号艇1着期待度20R／本命6点・穴6点は公式6艇と基礎成績が確認できた場合のみ暫定表示します。展示・ST・進入・風・直近50走は予想点数に未反映です。</small></details></section>
</details></main><script>
// Switch existing DOM panels without resetting selection, data, or issuing requests.
(function(){const tabs=document.getElementById('previewTabs');const buttons=Array.from(tabs.querySelectorAll('button[data-panel]'));tabs.addEventListener('click',event=>{const target=event.target.closest('button[data-panel]');if(!target||!buttons.includes(target))return;for(const button of buttons){const active=button===target;button.setAttribute('aria-pressed',String(active));button.style.background=active?'#1768a6':'#354760';document.getElementById(button.dataset.panel).hidden=!active;}if(target.dataset.panel==='researchPanel')document.getElementById('researchPanel').open=true;});})();
(function(){
 const button=document.getElementById('loadBoatOneAudit'),out=document.getElementById('boatOneAuditOutput'),day=document.getElementById('day');
 let seq=0,controller=null;
 day.addEventListener('change',()=>{seq++;controller?.abort();controller=null;button.disabled=false;out.textContent='';});
 button.addEventListener('click',async()=>{
  controller?.abort();controller=new AbortController();const token=++seq,signal=controller.signal,date=day.value.replace(/-/g,'');
  const active=()=>token===seq&&!signal.aborted&&day.value.replace(/-/g,'')===date;
  button.disabled=true;out.textContent='保存済みの順位と公式結果を照合中…';
  try{
   const res=await fetch('/api/research/morning-boat-one-audit?date='+date,{signal:AbortSignal.any([signal,AbortSignal.timeout(15000)])}),d=await res.json();
   if(!active())return;if(!res.ok||d.date!==date)throw Error(d.status||'HTTP '+res.status);
   if(!d.rankingPresent){out.textContent='この日の1号艇ランキングは保存されていません。過去分は再作成しません。';return;}
   const rate=(n,x)=>x?n+'/'+x+' ('+(100*n/x).toFixed(1)+'%)':'結果未確認';
   const lines=[date+' 研究実績','保存順位時刻：'+(d.rankedAt||'未確認'),'候補 '+d.selected+'R／確定 '+d.matched+'R','1号艇1着 '+rate(d.wins,d.matched),'他の事前評価レース '+rate(d.other.wins,d.other.matched),'未確定 '+d.pending+'R／証拠不足 '+d.excluded+'R',''];
   for(const r of d.details)lines.push(r.rank+'位 '+(r.venue||'?')+'場 '+(r.race||'?')+'R '+(r.status==='win'?'1号艇1着':r.status==='loss'?'1号艇以外1着':r.status==='result_unverified'?'結果未確認':'時刻・証拠不足')+(r.finishOrder?' '+r.finishOrder.slice(0,3).join('-'):''));
   out.textContent=lines.join('\n');
  }catch(e){if(active())out.textContent='照合失敗：'+String(e.message||e).slice(0,100);}
  finally{if(token===seq){button.disabled=false;controller=null;}}
 });
})();
document.getElementById('compareHistorical').onclick=async function(){
 const date=document.getElementById('day').value.replace(/-/g,''),v=document.getElementById('venue').value,r=document.getElementById('race').value;
 const out=document.getElementById('compareHistoricalOutput');
 if(!/^20\d{6}$/.test(date)||!v||!r){out.textContent='日付・競艇場・レースを選択してください。';return;}
 this.disabled=true;out.textContent='Boat Score 2の既存予想と公式結果を照合しています…';
 try{
  const query='?'+new URLSearchParams({date,venue:v,race:r});
  const [pRes,rRes]=await Promise.all([
   fetch('/api/predict/selected-race'+query+'&mode=beforeinfo',{signal:AbortSignal.timeout(65000)}),
   fetch('/api/official/result'+query,{signal:AbortSignal.timeout(20000)})
  ]);
  const [p,result]=await Promise.all([pRes.json(),rRes.json()]);
  if(date!==document.getElementById('day').value.replace(/-/g,'')||v!==document.getElementById('venue').value||r!==document.getElementById('race').value){
   out.textContent='選択が変更されたため比較を中止しました。';return;
  }
  if(!pRes.ok||p.ready!==true||!rRes.ok||result.verified!==true||!Array.isArray(result.finishOrder)||result.finishOrder.length!==6){
   out.textContent='照合保留：予想 '+(p.reason||p.error||pRes.status)+'／公式結果 '+(result.reason||rRes.status)+'。未確認データで的中扱いにはしません。';return;
  }
  const actual=result.finishOrder.slice(0,3).join('-');
  const valid=arr=>Array.isArray(arr)&&arr.length===6&&arr.every(x=>Array.isArray(x)&&x.length===3&&new Set(x).size===3&&x.every(n=>Number.isInteger(n)&&n>=1&&n<=6));
  if(!valid(p.main)||!valid(p.upset)){out.textContent='予想6点ずつの形式を検証できません。';return;}
  const format=arr=>arr.map(x=>x.join('-'));
  const main=format(p.main),upset=format(p.upset);
  out.textContent='【'+date+'／'+v+'場／'+r+'R】\n公式確定三連単：'+actual+
   '\n\n【既存Boat Score 2・本命6点】\n'+main.join('、')+'\n結果：'+(main.includes(actual)?'的中':'不的中')+
   '\n\n【既存Boat Score 2・穴6点】\n'+upset.join('、')+'\n結果：'+(upset.includes(actual)?'的中':'不的中')+
   '\n\n※過去時点に保存した予想ではなく、現在取得可能な公式成績を使う再計算です。まくらぼ50走とヒートマップの反映前後は別タブの試算であり、ここで的中判定していません。';
 }catch(e){out.textContent='照合に失敗しました：'+String(e.message||e).slice(0,120);}
 finally{this.disabled=false;}
};
document.getElementById('checkBeforeinfo').onclick=async function(){
 const v=document.getElementById('venue').value,r=document.getElementById('race').value;
 const date=document.getElementById('day').value.replace(/-/g,'');
 const output=document.getElementById('beforeinfoStatus');
 if(!v||!r||!/^20\d{6}$/.test(date)){output.textContent='開催日・競艇場・レースを選択してください。';return;}
 const requestedKey=date+':'+v+':'+r;
 this.disabled=true;output.textContent='公式の直前情報を照合中…';
 try{
  const response=await fetch('/api/official/beforeinfo?date='+date+'&venue='+v+'&race='+r,{signal:AbortSignal.timeout(18000)});
  const d=await response.json();
  if(!response.ok)throw Error(d.reason||'HTTP '+response.status);
  if(requestedKey!==document.getElementById('day').value.replace(/-/g,'')+':'+document.getElementById('venue').value+':'+document.getElementById('race').value){output.textContent='選択レースが変わりました。新しいレースで再確認してください。';return;}
  const lines=['公式直前情報（未確認項目は予想点数に反映しません）',
   '展示タイム: '+(d.exhibitionVerified?'公式確認済み':'未確認'),
   '展示ST・進入: '+(d.startVerified?'公式確認済み':'未確認'),
   '風・波: '+(d.weatherVerified?'公式確認済み':'未確認'),
   '風向: '+(d.windDirectionVerified?'公式確認済み':'未確認')];
  const show=v=>v===null||v===undefined||v===''?'未確認':String(v);
  if(d.exhibitionVerified){
   const entries=Array.isArray(d.exhibitionByBoat)?d.exhibitionByBoat:[];
   for(const x of entries)lines.push(x.boat+'号艇：展示タイム '+show(x.exhibitionTime)+' / チルト '+show(x.tilt));
   if(entries.length!==6)lines.push('注意：展示データは6艇分そろっていません。');
  }
  if(d.startVerified){
   const entries=Array.isArray(d.startByCourse)?d.startByCourse:[];
   for(const x of entries)lines.push(show(x.boat)+'号艇：進入 '+show(x.course)+'コース / 展示ST '+show(x.startTiming));
   if(entries.length!==6)lines.push('注意：展示進入データは6艇分そろっていません。');
  }
  if(d.weatherVerified){
   const w=d.weather||{};
   lines.push('気象：風向 '+show(w.windDirection)+' / 風速 '+show(w.windSpeed)+' / 波高 '+show(w.waveHeight));
   lines.push('気象の詳細：'+JSON.stringify(w));
  }
  lines.push('※この確認画面は直前情報の表示用です。予想ボタンを押すと、公式照合済みの展示タイム・展示STを6艇分確認できた場合に限り小幅補正します。F・Lは公式平均STが確認できた艇だけ代用します。進入・チルト・風・波は点数に未反映です。');
  lines.push('照合したレース: '+date+' / '+v+'場 / '+r+'R');
  output.textContent=lines.join('\n');
 }catch(e){output.textContent='直前情報を確認できません: '+e.message+'。未確認の値は使用しません。';}
 finally{this.disabled=false;}
};
document.getElementById('comparisonLeft').addEventListener('click',()=>document.querySelector('.comparison-scroll').scrollBy({left:-300,behavior:'smooth'}));
document.getElementById('comparisonRight').addEventListener('click',()=>document.querySelector('.comparison-scroll').scrollBy({left:300,behavior:'smooth'}));
const names=['桐生','戸田','江戸川','平和島','多摩川','浜名湖','蒲郡','常滑','津','三国','びわこ','住之江','尼崎','鳴門','丸亀','児島','宮島','徳山','下関','若松','芦屋','福岡','唐津','大村'];
const day=document.getElementById('day'),venue=document.getElementById('venue'),race=document.getElementById('race');
const today=new Date(Date.now()+9*3600000).toISOString().slice(0,10);day.value=today;
(function(){
 const date=document.getElementById('inventoryDate'),button=document.getElementById('loadInventory'),notice=document.getElementById('inventoryNotice'),summary=document.getElementById('inventorySummary'),missing=document.getElementById('inventoryMissing');
 date.value=new Date(Date.now()+9*3600000).toISOString().slice(0,10);
 let seq=0,controller=null;
 const names=['','桐生','戸田','江戸川','平和島','多摩川','浜名湖','蒲郡','常滑','津','三国','びわこ','住之江','尼崎','鳴門','丸亀','児島','宮島','徳山','下関','若松','芦屋','福岡','唐津','大村'];
 const reasons={morning_missing:'朝評価点なし',morning_evidence_missing:'朝順位・時刻の証拠不足',before_missing:'締切前直前情報なし',before_pending:'直前情報待ち',deadline_unknown:'締切時刻未確認',result_unconfirmed:'着順未確認',result_pending:'結果待ち',result_unconfirmed_deadline_unknown:'着順・締切未確認'};
 const jpTime=s=>s?new Date(s).toLocaleString('ja-JP',{timeZone:'Asia/Tokyo'}):'未保存';
 const line=(parent,t)=>{const p=document.createElement('p');p.style.margin='6px 0';p.textContent=t;parent.append(p);};
 function clear(){seq++;if(controller)controller.abort();button.disabled=false;summary.replaceChildren();missing.replaceChildren();notice.textContent='日付を選択して確認してください。';}
 date.addEventListener('change',clear);
 button.addEventListener('click',async()=>{
  if(!date.value)return;clear();const token=seq,selected=date.value.replace(/-/g,'');controller=new AbortController();const signal=controller.signal;button.disabled=true;notice.textContent='保存済み情報を確認中…';
  try{
   const res=await fetch('/api/research/archive-inventory?date='+selected,{signal,cache:'no-store'}),d=await res.json();
   if(signal.aborted||token!==seq)return;
   if(!res.ok||d.date!==selected||!d.counts||!Array.isArray(d.rows))throw Error('保存状況を取得できませんでした');
   const total=d.expected;notice.textContent=total===null?'開催予定・保存データをまだ確認できません。':'対象 '+d.venues.length+' 場・予定 '+total+' R（実開催確定数ではありません）';
   for(const [key,label] of [['morning','朝の評価点'],['morningTimed','締切前時刻付き評価点'],['morningOrder','締切前予想順位'],['before','締切前の完全直前情報'],['exhibition','締切前展示タイム'],['start','締切前展示ST'],['weather','締切前気象'],['partial','部分保存のみ'],['results','通常6艇の公式着順'],['complete','朝順位・直前・着順が揃ったレース']]){
    const v=d.counts[key]||0;line(summary,label+'：'+v+' / '+(total??'未確認')+' R');
    if(total>0){const bar=document.createElement('progress');bar.max=total;bar.value=v;bar.style.width='100%';bar.setAttribute('aria-label',label);summary.append(bar);}
   }
   line(summary,'最終更新（日本時間） 朝：'+jpTime(d.updatedAt?.morning)+' ／直前：'+jpTime(d.updatedAt?.before)+' ／着順：'+jpTime(d.updatedAt?.result));
   if(d.lastScan)line(summary,'直前収集：締切判明 '+d.lastScan.knownDeadlineCount+'／候補 '+d.lastScan.eligibleCount+'／期限切れ未保存 '+d.lastScan.expiredUnverified);
   const incomplete=d.rows.filter(x=>!x.flags.complete);line(missing,'不足・未確認：'+incomplete.length+' R（開催前・結果待ちを含む）');
   for(const x of incomplete){const p=document.createElement('p');p.style.cssText='margin:8px 0;padding:6px 0;border-bottom:1px solid #354760';p.textContent=(names[x.venue]||x.venue)+' '+x.race+'R：'+x.missing.map(k=>reasons[k]||k).join('／')+'。'+Object.entries(x.failures||{}).filter(([,v])=>v).map(([k,v])=>k+'：'+v+'（'+(x.attempts?.[k]||0)+'回）').join('／');missing.append(p);}
  }catch(e){if(!signal.aborted&&token===seq)notice.textContent='保存状況の取得失敗。再度確認してください。';}
  finally{if(token===seq)button.disabled=false;}
 });
})();
(function(){const date=document.getElementById('archiveResearchDate'),button=document.getElementById('loadArchiveResearch'),notice=document.getElementById('archiveResearchNotice'),out=document.getElementById('archiveResearchOutput');date.value=new Date(Date.now()+9*3600000-86400000).toISOString().slice(0,10);let seq=0,controller=null;
date.addEventListener('change',()=>{seq++;if(controller)controller.abort();button.disabled=false;notice.textContent='日付を変更しました。';out.textContent='未取得';});
button.addEventListener('click',async()=>{if(!date.value)return;const key=date.value.replace(/-/g,''),token=++seq;if(controller)controller.abort();controller=new AbortController();const signal=AbortSignal.any([controller.signal,AbortSignal.timeout(20000)]);button.disabled=true;notice.textContent='保存データを確認中…';out.textContent='';
const get=async path=>{try{const r=await fetch(path+'?date='+key,{signal});if(r.status===404)return {missing:true};if(!r.ok)throw Error('HTTP '+r.status);return await r.json();}catch(e){return {error:String(e.message||e)};}};
try{const [archive,audit,periods,morning,before]=await Promise.all(['/api/research/result-archive','/api/research/rank-audit','/api/research/rank-audit-windows','/api/morning/snapshot','/api/research/before-archive'].map(get));if(token!==seq)return;
const lines=['対象日：'+key,'【公式確定着順の保存】',archive.error?'取得失敗：'+archive.error:archive.missing?'保存記録なし':'保存済み '+archive.verifiedCount+' / '+archive.targetCount+'R（'+archive.status+'）','【評価順位と着順の照合】',audit.error?'取得失敗：'+audit.error:audit.missing?'保存記録なし':'照合 '+audit.matched+'R / 結果未取得 '+audit.missingResult+'R / 除外 '+audit.excluded+'件'];
const unavailable=x=>x.error?'取得失敗：'+x.error:x.missing?'保存記録なし':null;
lines.splice(1,0,'【朝の情報収集】',unavailable(morning)||('確認済み '+Object.values(morning.verifiedRacesByVenue||{}).reduce((a,b)=>a+b,0)+'R / 開催場 '+(morning.venues||[]).length+'場（'+morning.status+'）'),'【直前情報の収集】',unavailable(before)||('保存済み '+before.verifiedCount+'R / 試行 '+before.attemptedCount+'R'));
if(!unavailable(before)){lines.push('締切時刻の独立確認：'+(before.discoveredDeadlineCount||0)+'R');for(const [id,failure] of Object.entries(before.failures||{}))lines.push('直前未確認 '+id+'：'+(failure.reason||'unknown'));}
if(!unavailable(archive))for(const [id,reason] of Object.entries(archive.failures||{}))lines.push('着順未確認 '+id+'：'+reason);
const rate=x=>Number.isFinite(x)?(x*100).toFixed(1)+'%':'未集計';
if(!audit.error&&!audit.missing)lines.push('評価1位の1着率：'+rate(audit.firstRankWinRate));
lines.push('【期間集計】');if(periods.error)lines.push('取得失敗：'+periods.error);else for(const w of periods.windows||[]){lines.push(w.days+'日：保存 '+w.availableDays+'/'+w.days+'日、照合 '+w.matched+'R、評価1位の1着率 '+rate(w.firstRankWinRate));if(w.days===30&&w.matched>0){lines.push('30日・競艇場別照合件数');for(const [v,item] of Object.entries(w.byVenue||{}))lines.push((names[Number(v)-1]||v+'場')+'：'+item.matched+'R');}}
lines.push('自動学習・評価方式変更：未実装');out.textContent=lines.join('\n');notice.textContent='保存記録の確認完了（欠損は不的中に含めません）';}finally{if(token===seq)button.disabled=false;}});
})();

venue.disabled=false;race.disabled=false;
const dateCode=()=>day.value.replaceAll('-','');
const makulaboLink=document.getElementById('openMakulaboForRace');
function syncMakulaboLink(){const params=new URLSearchParams();if(/^20[0-9]{2}-[0-9]{2}-[0-9]{2}$/.test(day.value))params.set('date',dateCode());if(venue.value)params.set('venue',venue.value);if(race.value)params.set('race',race.value);makulaboLink.href='/tools/makulabo-screenshot?'+params.toString();}
for(const el of [day,venue,race])el.addEventListener('change',syncMakulaboLink);
syncMakulaboLink();
// Keep screenshot input and selected race intact when switching panels. Reload only on explicit action.
(function(){const frame=document.getElementById("makulaboFrame"),status=document.getElementById("makulaboFrameStatus"),button=document.getElementById("loadMakulaboFrame");let loadedKey="";const key=()=>day.value&&venue.value&&race.value?dateCode()+":"+venue.value+":"+race.value:"";function openFrame(){const next=key();if(!next){status.textContent="開催日・競艇場・レースを選択してください。";return;}if(loadedKey!==next){frame.src=makulaboLink.href;loadedKey=next;}frame.hidden=false;status.textContent="選択レース："+next+"。画像取り込み結果はこの画面内で確認してください。公式選手番号の照合後、手入力集計を比較表へ参考表示します。";}button.addEventListener("click",openFrame);makulaboLink.addEventListener("click",event=>{event.preventDefault();document.querySelector("#previewTabs button[data-panel=makulaboPanel]").click();openFrame();});for(const el of [day,venue,race])el.addEventListener("change",()=>{if(loadedKey!==key()){loadedKey='';frame.removeAttribute('src');frame.hidden=true;status.textContent="レースが変わりました。取り込み画面を開き直してください。";}});})();
let makulaboSearchToken=0,verifiedMakulabo=null,manualMakulabo=null;
window.addEventListener('message',event=>{const frame=document.getElementById('makulaboFrame'),m=event.data;if(event.origin!==location.origin||event.source!==frame.contentWindow||m?.type!=='boat-score-manual-review'||m.key!==dateCode()+':'+venue.value+':'+race.value)return;const rows=m.rows;if(!Array.isArray(rows)||rows.length!==6||rows.some(x=>!x)||new Set(rows.map(x=>x.boat)).size!==6||!rows.every(x=>Number.isInteger(x.boat)&&x.boat>=1&&x.boat<=6&&Number.isInteger(x.sampleSize)&&x.sampleSize>=1&&x.sampleSize<=50&&Array.isArray(x.finishCounts)&&x.finishCounts.length===6&&x.finishCounts.every(n=>Number.isInteger(n)&&n>=0)&&x.finishCounts.reduce((a,b)=>a+b,0)===x.sampleSize))return;manualMakulabo={key:m.key,rows};const n=syncVerifiedMakulaboComparison();document.getElementById('makulaboFrameStatus').textContent='公式選手番号照合済み・手入力集計を受信。比較表 '+n+'/6艇（自動取得優先、予想には未反映）。';});
let lastComparisonPrediction=null;
let trialConditions={key:null,wind:'',speed:null,entry:null};
function resetTrialConditions(){
 trialConditions={key:null,wind:'',speed:null,entry:null};
 document.getElementById('trialWind').value='';
 document.getElementById('trialWindSpeed').value='';
 document.getElementById('trialEntry').value='';
 document.getElementById('trialStatus').textContent='未入力。入力は選択中のレースだけに適用します。';
}
document.getElementById('trialApply').onclick=function(){
 const wind=document.getElementById('trialWind').value;
 const speedText=document.getElementById('trialWindSpeed').value.trim();
 const speed=speedText===''?null:Number(speedText);
 const entryText=document.getElementById('trialEntry').value.replace(/[\s,，\-ー→＞>]/g,'');
 const entry=entryText===''?null:entryText.split('').map(Number);
 const status=document.getElementById('trialStatus');
 if((speed!==null&&(!Number.isFinite(speed)||speed<0||speed>30))||
    (wind&&speed===null)||(speed!==null&&!wind)||
    (entry&& (entry.length!==6||entry.some(x=>!Number.isInteger(x)||x<1||x>6)||new Set(entry).size!==6))){
  status.textContent='入力を確認してください。風向と風速は両方入力、進入は1〜6を重複なく6艇入力します。';return;
 }
 trialConditions={key:dateCode()+':'+venue.value+':'+race.value,wind,speed,entry};
 status.textContent='手入力の条件を保存しました（選択レースのみ・未検証の試算）。';
 updateCombinedPredictionPanel();
};
document.getElementById('trialClear').onclick=function(){resetTrialConditions();updateCombinedPredictionPanel();};
function trialPicks(rows){
 const scores=new Map(rows.map(x=>[x.boat,x.score])),comb=[];
 for(let a=1;a<=6;a++)for(let b=1;b<=6;b++)for(let c=1;c<=6;c++){
  if(a===b||a===c||b===c)continue;
  comb.push({boats:[a,b,c],strength:scores.get(a)*.56+scores.get(b)*.29+scores.get(c)*.15});
 }
 comb.sort((a,b)=>b.strength-a.strength||a.boats.join('').localeCompare(b.boats.join('')));
 const main=comb.slice(0,6).map(x=>x.boats),used=new Set(main.map(x=>x.join('-')));
 const upset=comb.filter(x=>x.boats[0]>=4&&!used.has(x.boats.join('-'))).slice(0,6).map(x=>x.boats);
 return {main,upset};
}
function compactPredictionText(full){
 const t=String(full||'').trim();
 if(!t)return '予想を実行してください。';
 const main=t.match(/【本命(?:\s*6点)?】(?:\s*6点)?\s*\n([\s\S]*?)(?=\n\s*【(?:穴|取得状況|反映条件|手入力の試算条件)】|$)/);
 const upset=t.match(/【穴(?:\s*6点)?】(?:\s*6点)?\s*\n([\s\S]*?)(?=\n\s*【(?:取得状況|反映条件|手入力の試算条件)】|$)/);
 if(!main||!upset)return t.split('\n').slice(0,5).join('\n');
 const picks=v=>v.trim().split('\n').filter(x=>/^\s*\d+\.\s*[1-6]-[1-6]-[1-6]/.test(x)).slice(0,6).map(x=>x.replace(/^\s*\d+\.\s*/,'')).join('\n');
 const a=picks(main[1]),b=picks(upset[1]);
 return a&&b?(t.startsWith('【公式直前情報のみ（まくらぼ未取得）】')?'公式直前情報のみ／まくらぼ未取得\n\n':'')+'【本命6点】\n'+a+'\n\n【穴6点】\n'+b:t.split('\n').slice(0,5).join('\n');
}
function updateCompactPredictions(){
 updateVenueTraits();
 for(const [source,target] of [['predictOutput','predictCompact'],['combinedPredictionOutput','combinedCompact']]){
  const from=document.getElementById(source),to=document.getElementById(target);
  if(from&&to){
   const fallback=source==='combinedPredictionOutput'&&from.textContent.trim().startsWith('【公式直前情報のみ（まくらぼ未取得）】');
   const compact=compactPredictionText(from.textContent);
   to.replaceChildren();
   for(const [i,line] of compact.split('\n').entries()){
    if(i)to.appendChild(document.createTextNode('\n'));
    const span=document.createElement('span');span.textContent=line;
    if(fallback&&/^[1-6]-[1-6]-[1-6]$/.test(line.trim())){span.style.color='#fbbf24';span.style.fontWeight='700';}
    to.appendChild(span);
   }
   from.style.color=fallback?'#fbbf24':'';
   const current=lastComparisonPrediction;
   const key=dateCode()+':'+venue.value+':'+race.value;
   if(current?.key===key&&compact.includes('【本命6点】')&&compact.includes('【穴6点】')){
    const d=current.data;
    const fields=[['公式出走表',d.ready===true],['展示タイム',d.exhibitionAdjustmentApplied===true],['展示ST',d.startAdjustmentApplied===true],['まくらぼ50走',source==='combinedPredictionOutput'&&!fallback&&from.textContent.includes('まくらぼ50走：6艇照合済み')]];
    const items=source==='combinedPredictionOutput'?fields:fields.slice(0,3);
    const count=items.filter(x=>x[1]).length;
    const detail=document.createElement('span');
    detail.style.display='block';detail.style.marginTop='10px';detail.style.fontSize='0.8em';detail.style.fontWeight='400';detail.style.color='inherit';
    detail.textContent='データ反映状況：'+count+'/'+items.length+'項目\n'+items.map(x=>x[0]+'：'+(x[1]?'反映':'未反映')).join('\n')+'\n的中確率：未算出（検証データ不足）\n※項目数は的中確率ではありません。';
    to.appendChild(detail);
   }
  }
 }
}
for(const id of ['predictOutput','combinedPredictionOutput']){
 const el=document.getElementById(id);
 if(el)new MutationObserver(updateCompactPredictions).observe(el,{childList:true,characterData:true,subtree:true});
}
function renderExperimental100PointPrediction(){
 const previous=document.getElementById('experimental100PointPrediction');if(previous)previous.remove();
 const current=lastComparisonPrediction,key=dateCode()+':'+venue.value+':'+race.value;
 if(!current||current.key!==key)return;
 const d=current.data,model=d.experimental;
 if(!model?.ready||!Array.isArray(model.rows)||model.rows.length!==6)return;
 const valid=rows=>Array.isArray(rows)&&rows.length===6&&rows.every(x=>Array.isArray(x)&&x.length===3&&new Set(x).size===3&&x.every(n=>Number.isInteger(n)&&n>=1&&n<=6));
 if(!valid(model.main)||!valid(model.upset))return;
 const source=verifiedMakulabo?.key===key?verifiedMakulabo.rows:[];
 const matched=Array.isArray(source)?source.filter(x=>x.verified!==false&&Number.isInteger(x.boat)&&x.boat>=1&&x.boat<=6&&Number.isInteger(x.runs)&&x.runs>0&&x.runs<=50&&Array.isArray(x.counts)&&x.counts.length===6&&x.counts.every(n=>Number.isInteger(n)&&n>=0)&&x.counts.reduce((a,b)=>a+b,0)===x.runs):[];
 const unique=new Map(matched.map(x=>[x.boat,x]));
 const complete=unique.size===6&&verifiedMakulabo?.partial!==true;
 // Partial source is shown as reference only. No one-sided scoring advantage.
 const bonus=new Map();
 if(complete){
  for(const x of unique.values())bonus.set(x.boat,5*(x.counts[0]+.5*x.counts[1]+.25*x.counts[2])/x.runs);
 }
 const rows=model.rows.map(x=>({...x,score:x.score+(bonus.get(x.boat)||0),components:{...x.components,last50:Number((bonus.get(x.boat)||0).toFixed(2))}}));
 // 1st/2nd/3rd suitability uses verified 2/3-place rates, not only a shared total score.
 const map=new Map(rows.map(x=>[x.boat,x]));
 const combinations=[];
 for(let a=1;a<=6;a++)for(let b=1;b<=6;b++)for(let z=1;z<=6;z++){
  if(a===b||a===z||b===z)continue;
  const first=map.get(a),second=map.get(b),third=map.get(z);
  // Separate finishing-position suitability. The course arrays are experimental
  // shape priors, NOT claimed venue-specific observed probabilities.
  const courseByBoat=new Map((d.experimental?.rows||[]).map(x=>[x.boat,x.course]));
  const observedCourses=Array.isArray(d.experimental?.courses)?d.experimental.courses:null;
  const courseOf=boat=>observedCourses?.find(x=>x.boat===boat)?.course||null;
  const firstCourse=[1,.58,.43,.30,.18,.08],secondCourse=[.60,1,.90,.67,.46,.25],thirdCourse=[.44,.88,1,.94,.77,.48];
  const courseTerm=(boat,table)=>{const course=courseOf(boat);return Number.isInteger(course)&&course>=1&&course<=6?table[course-1]*8:0;};
  const secondSuitability=second.score*.25+(second.top2===null?0:second.top2*.075)+courseTerm(b,secondCourse);
  const thirdSuitability=third.score*.19+(third.top3===null?0:third.top3*.065)+courseTerm(z,thirdCourse);
  const firstSuitability=first.score*.56+courseTerm(a,firstCourse);
  combinations.push({boats:[a,b,z],strength:firstSuitability+secondSuitability+thirdSuitability});
 }
 combinations.sort((a,b)=>b.strength-a.strength||a.boats.join('').localeCompare(b.boats.join('')));
 const main=combinations.slice(0,6).map(x=>x.boats),used=new Set(main.map(x=>x.join('-')));
 const upset=combinations.filter(x=>x.boats[0]>=4&&!used.has(x.boats.join('-'))).slice(0,6).map(x=>x.boats);
 const fmt=items=>items.map((x,i)=>(i+1)+'. '+x.join('-')).join('\\n');
 const components={ability:'選手能力',course:'進入',averageST:'平均ST',motor:'モーター',exhibition:'展示',last50:'50走'};
 const trial=document.createElement('details');trial.id='experimental100PointPrediction';trial.open=true;
 const head=document.createElement('summary');head.textContent='新100点評価・直前情報＋まくらぼ（試験予想）';
 const pre=document.createElement('pre');pre.style.cssText='white-space:pre-wrap;overflow-wrap:anywhere';
 pre.textContent='【本命6点】\\n'+fmt(main)+'\\n\\n【穴6点】\\n'+fmt(upset)+'\\n\\n【艇別評価と反映内訳】\\n'+rows.map(x=>x.boat+'号艇 '+x.score.toFixed(1)+'点（'+Object.entries(x.components).map(([k,v])=>(components[k]||k)+':'+Number(v).toFixed(1)).join(' / ')+'）').join('\\n')+
 '\\n\\n【取得・反映状況】\\n展示・展示ST：'+(model.missingInputs.includes('exhibitionTime')?'展示タイム未反映':'展示タイム反映')+' / '+(model.missingInputs.includes('exhibitionST')?'展示ST未反映':'展示ST反映')+'\\n進入：'+(model.missingInputs.includes('course')?'未確認・未反映':'公式6艇の進入を反映')+'\\nまくらぼ50走：'+(complete?'6艇照合済み・最大5点を反映':unique.size+'艇確認・6艇未完了のため予想点には未反映')+
 '\\n着順別評価：1着=勝ち切る力、2着=2連対率、3着=3連対率。進入が6艇確認済みなら着順別コース仮補正を適用。\\n未反映：'+model.missingInputs.filter(x=>x!=='last50').join('、')+'\\n※コース別補正は実測確率ではなく検証用の仮値。的中率未検証。50走はコース別ではない着順実績です。欠損を実測0とはみなしません。従来予想は変更しません。';
 trial.append(head,pre);document.getElementById('predictOutput')?.parentElement?.appendChild(trial);
}
function renderLocalPredictions(){
 const left=document.getElementById('localBasePrediction'),right=document.getElementById('localCombinedPrediction');
 if(!left||!right)return;
 const current=lastComparisonPrediction,key=dateCode()+':'+venue.value+':'+race.value;
 left.textContent=right.textContent='予想を実行してください。';
 if(!current||current.key!==key)return;
 const model=current.data.localPrediction;
 if(!model?.ready){left.textContent=right.textContent='保留：公式の当地・全国勝率を6艇分確認できません。';return;}
 const recent=recent50SupplementForSelection();
 const valid=rows=>Array.isArray(rows)&&rows.length===6&&new Set(rows.map(x=>x.boat)).size===6&&rows.every(x=>Number.isInteger(x.boat)&&x.boat>=1&&x.boat<=6&&Number.isFinite(x.score));
 if(!valid(model.baseScores)||!valid(model.adjustedScores)||!Array.isArray(model.rates)||model.rates.length!==6){left.textContent=right.textContent='保留：6艇の評価点未確認';return;}
 const hasBefore=model.exhibitionApplied===true||model.startApplied===true;
 const hasRecent=Array.isArray(recent)&&recent.length===6&&new Set(recent.map(x=>x.boat)).size===6&&model.baseScores.every(x=>recent.some(y=>y.boat===x.boat&&Number.isFinite(y.points)));
 const draw=(target,rows,picks,note,fallback=false)=>{
  target.replaceChildren();
  const pre=document.createElement('pre');pre.className='prediction-compact';
  const fmt=items=>items.map(x=>x.join('-')).join('\n');
  pre.textContent='【本命6点】\n'+fmt(picks.main)+'\n\n【穴6点】\n'+fmt(picks.upset);
  if(fallback)pre.style.color='#fbbf24';
  target.appendChild(pre);
  const title=document.createElement('small');title.textContent='予想順位・当地勝率（全国との差）';target.appendChild(title);
  for(const [i,x] of rows.slice().sort((a,b)=>b.score-a.score||a.boat-b.boat).entries()){
   const rate=model.rates.find(y=>y.boat===x.boat);
   const line=document.createElement('div');line.style.fontSize='.8rem';
   const delta=rate.value-rate.national,diff=Math.round(delta*100);
   line.style.color=rate.substituted?'#ffffff':diff>=100?'#22c55e':diff<=-100?'#facc15':'#ffffff';
   line.textContent=(i+1)+'位 '+x.boat+'号艇 '+rate.value.toFixed(2)+(rate.substituted?'（全国代用）':'（'+(delta>0?'+':'')+delta.toFixed(2)+'）')+' / '+x.score.toFixed(2)+'点';
   target.appendChild(line);
  }
  const details=document.createElement('small');details.style.display='block';details.style.marginTop='8px';details.textContent=note+'。試算・的中率未検証。色：差±1.00以上で黄／緑、その他は白。';target.appendChild(details);
 };
 draw(left,model.baseScores,trialPicks(model.baseScores),'当地勝率に置換・モーター等は従来配点');
 // One verified supplemental source is enough for a clearly labelled comparison; never invent missing measurements.
 if(!hasBefore&&!hasRecent){right.textContent='保留：公式展示タイム・展示STと、まくらぼ6艇分のいずれも反映できません。';return;}
 const rows=model.adjustedScores.map(x=>({boat:x.boat,score:x.score+(hasRecent?recent.find(y=>y.boat===x.boat).points:0)}));
 const sourceNote=hasBefore?(hasRecent?'直前情報＋まくらぼ6艇':'直前情報のみ・まくらぼ未取得'):'まくらぼ6艇のみ・直前情報未反映';
 draw(right,rows,trialPicks(rows),'使用データ：'+sourceNote+'／展示タイム：'+(model.exhibitionApplied?'反映':'未反映')+'／展示ST：'+(model.startApplied?'反映':'未反映'),!hasRecent||!hasBefore);
}
// Independent constrained ranking. The existing four prediction panels are not modified.
function enumerateScenarioOrders(fixed){
 if(!Array.isArray(fixed)||fixed.length!==3||!fixed.every(x=>Array.isArray(x)&&new Set(x).size===x.length&&x.every(n=>Number.isInteger(n)&&n>=1&&n<=6)))return null;
 const orders=[];
 for(let a=1;a<=6;a++)for(let b=1;b<=6;b++)for(let c=1;c<=6;c++){
  const order=[a,b,c];
  if(new Set(order).size===3&&fixed.every((x,i)=>!x.length||x.includes(order[i])))orders.push(order);
 }
 return orders;
}
function rankScenarioCombinations(rows,fixed){
 const six=Array.isArray(rows)&&rows.length===6&&new Set(rows.map(x=>x.boat)).size===6&&rows.every(x=>Number.isInteger(x.boat)&&x.boat>=1&&x.boat<=6&&Number.isFinite(x.score));
 if(!six)return {ready:false,reason:'scores'};
 const orders=enumerateScenarioOrders(fixed);
 if(!orders)return {ready:false,reason:'invalid'};
 if(!fixed.some(x=>x.length)||!orders.length)return {ready:false,reason:'conditions'};
 const scores=new Map(rows.map(x=>[x.boat,x.score]));
 const combinations=orders.map(order=>({order,strength:scores.get(order[0])*.56+scores.get(order[1])*.29+scores.get(order[2])*.15}));
 combinations.sort((a,b)=>b.strength-a.strength||a.order.join('').localeCompare(b.order.join('')));
 const main=combinations.slice(0,6).map(x=>x.order);
 const used=new Set(main.map(x=>x.join('-')));
 const remaining=combinations.filter(x=>!used.has(x.order.join('-')));
 // Under a fixed inner winner the usual outer-winner definition cannot apply.
 // Prefer outer winners if allowed, then remaining ranked combinations.
 const alternatives=[...remaining.filter(x=>x.order[0]>=4),...remaining.filter(x=>x.order[0]<4)];
 return {ready:true,total:combinations.length,main,upset:alternatives.slice(0,6).map(x=>x.order)};
}
// Research-only conditional model. No changes to the original scenario scores or picks.
function rankInnerWinnerCourseTrial(base,fixed,evidence,recentRows,officialPositionAdjustments=null){
 if(!Array.isArray(fixed)||fixed[0]?.length!==1||fixed[0][0]!==1)return {ready:false,reason:'1号艇1着のみ固定すると比較できます。'};
 const check=rankScenarioCombinations(base,fixed);
 if(!check.ready)return {ready:false,reason:'評価点または指定条件が未確認。'};
 const starts=evidence?.start;
 const sixIds=a=>Array.isArray(a)&&a.length===6&&new Set(a.map(x=>x.boat)).size===6&&a.every(x=>Number.isInteger(x.boat)&&x.boat>=1&&x.boat<=6);
 if(!sixIds(starts)||new Set(starts.map(x=>x.course)).size!==6||!starts.every(x=>Number.isInteger(x.course)&&x.course>=1&&x.course<=6))return {ready:false,reason:'展示進入6艇が未確認。'};
 if(starts.find(x=>x.boat===1)?.course!==1)return {ready:false,reason:'1号艇が展示1コースではないため今回の研究対象外。'};
 const byCourse=new Map(starts.map(x=>[x.course,x])),byBoat=new Map(starts.map(x=>[x.boat,x]));
 const numeric=starts.every(x=>typeof x.st==='number'&&Number.isFinite(x.st)&&x.st>=0&&x.st<=1);
 const ex=evidence?.exhibition,exOK=sixIds(ex)&&ex.every(x=>typeof x.time==='number'&&Number.isFinite(x.time)&&x.time>=5&&x.time<=9);
 const time=new Map(exOK?ex.map(x=>[x.boat,x.time]):[]);
 const recentOK=sixIds(recentRows)&&recentRows.every(x=>Number.isFinite(x.secondPoints)&&x.secondPoints>=0&&x.secondPoints<=10&&Number.isFinite(x.thirdPoints)&&x.thirdPoints>=0&&x.thirdPoints<=10);
 const recent=new Map(recentOK?recentRows.map(x=>[x.boat,x]):[]);
 const second=[0,0,53,43,38,20,14],third=[0,0,31,41,44,30,22];
 const podium=new Map(),signals=[];
 function signal(course,points,label){const boat=byCourse.get(course).boat;podium.set(boat,(podium.get(boat)||0)+points);signals.push({boat,course,points,label});}
 if(numeric){
  const st=c=>byCourse.get(c).st;
  if(Math.abs(st(2)-st(3))<=.05000001)signal(4,2,'2・3コース展示ST差0.05秒以内');
  if(exOK&&Math.max(st(1),st(2),st(3))-Math.min(st(1),st(2),st(3))<=.05000001&&time.get(byCourse.get(4).boat)<=Math.min(...[1,2,3].map(c=>time.get(byCourse.get(c).boat)))+.05000001)signal(4,1,'内3艇ST接近・4コース展示タイム条件');
  for(const c of [5,6])if(st(c)<=st(c-1)-.02999999)signal(c,2,'隣の内艇より展示STが0.03秒以上速い');
 }
 const map=new Map(base.map(x=>[x.boat,x.score]));
 const combos=enumerateScenarioOrders(fixed).map(order=>{
  const b=order[1],c=order[2],bc=byBoat.get(b).course,cc=byBoat.get(c).course;
  // Course counts from 168 conditional finishes (both days). Conservative trial
  // log adjustment; arbitrary weights, not learned or calibrated probabilities.
  const strength=.56*map.get(1)+.29*(map.get(b)+(recent.get(b)?.secondPoints||0))+.15*(map.get(c)+(recent.get(c)?.thirdPoints||0))
   +1.5*Math.log((second[bc]+1)/34)+1.5*Math.log((third[cc]+1)/34)+(podium.get(b)||0)+(podium.get(c)||0)+(officialPositionAdjustments?.get(b)?.second||0)+(officialPositionAdjustments?.get(c)?.third||0);
  return {order,strength};
 });
 combos.sort((a,b)=>b.strength-a.strength||a.order.join('').localeCompare(b.order.join('')));
 return {ready:true,main:combos.slice(0,6).map(x=>x.order),upset:combos.slice(6,12).map(x=>x.order),total:combos.length,signals,numeric,exOK,recentOK};
}
// Compare against the same course's pooled rate, not against a different course.
function rankOfficialPositionTrial(base,fixed,evidence,recent){
 const data=evidence?.courseStats,starts=evidence?.start;
 if(data?.ready!==true||data.courseBasis!=='verified_exhibition_course'||!Array.isArray(data.rows)||data.rows.length!==6||!Array.isArray(starts)||starts.length!==6||new Set(data.rows.map(x=>x.boat)).size!==6||new Set(data.rows.map(x=>x.racerId)).size!==6)return {ready:false,reason:'公式コース成績・展示進入の照合不足'};
 const adjustments=new Map();
 for(const row of data.rows){
  if(!starts.some(x=>x.boat===row.boat&&x.course===row.course)||row.status!=='available'||!Number.isInteger(row.normalFinishes)||row.normalFinishes<=0||row.priorStrength!==20||!Array.isArray(row.pooledRates)||!Array.isArray(row.smoothedRates)||row.pooledRates.length!==3||row.smoothedRates.length!==3||![...row.pooledRates,...row.smoothedRates].every(x=>Number.isFinite(x)&&x>0&&x<=1))return {ready:false,reason:'6艇の着順別成績・標本数が未確認'};
  // Tentative bounded log ratios; preserve original course and ST contributions.
  const points=i=>Math.max(-3,Math.min(3,3*Math.log(row.smoothedRates[i]/row.pooledRates[i])));
  adjustments.set(row.boat,{boat:row.boat,course:row.course,n:row.normalFinishes,second:points(1),third:points(2)});
 }
 const trial=rankInnerWinnerCourseTrial(base,fixed,evidence,recent,adjustments);
 return trial.ready?{...trial,method:'official_position_shrink20_log3_v1',adjustments:[...adjustments.values()]}:trial;
}
function buildScenarioResearchRecord(d,conditions,basePicks,trial,baseWithRecent,recent,recordedAt,officialTrial=null){
 const validTime=x=>typeof x==='string'&&Number.isFinite(Date.parse(x));
 const deadline=d.scenarioEvidence?.deadlineAt||null,generated=d.scenarioEvidence?.generatedAt||null;
 const jstDay=x=>new Date(Date.parse(x)+9*3600000).toISOString().slice(0,10).replace(/-/g,'');
 if(!/^20[0-9]{6}$/.test(d.date)||!Number.isInteger(Number(d.venue))||Number(d.venue)<1||Number(d.venue)>24||!Number.isInteger(Number(d.race))||Number(d.race)<1||Number(d.race)>12||!basePicks?.ready||!validTime(recordedAt))return null;
 const timeVerified=validTime(deadline)&&validTime(generated)&&jstDay(deadline)===d.date&&jstDay(generated)===d.date&&Date.parse(generated)<Date.parse(deadline);
 const clientConsistent=timeVerified&&Date.parse(recordedAt)>=Date.parse(generated)-5000&&Date.parse(recordedAt)<Date.parse(deadline);
 return {schema:1,date:d.date,venue:Number(d.venue),race:Number(d.race),conditions:conditions.map(x=>x.slice()),recordedAt,generatedAt:generated,deadlineAt:deadline,serverResponseBeforeDeadline:timeVerified,deviceTimeConsistent:clientConsistent,source:'device_record_not_server_attested',model:'scenario-course-trial-v1',baseMethod:d.method,baseScores:d.rankedScores,baseWithRecent,recent:recent||null,evidence:d.scenarioEvidence||null,adjustments:{exhibition:d.exhibitionAdjustmentApplied===true,start:d.startAdjustmentApplied===true,averageSTSubstitutions:d.averageSTSubstitutions||[]},baseline:basePicks,research:trial,officialPositionTrial:officialTrial};
}
// Compare only matched, pre-deadline device records; one snapshot per race.
function selectScenarioAuditRecords(records,date){
 const validTime=x=>typeof x==='string'&&Number.isFinite(Date.parse(x));
 const jstDay=x=>new Date(Date.parse(x)+9*3600000).toISOString().slice(0,10).replace(/-/g,'');
 const byRace=new Map(),excluded={otherConditions:0,invalid:0,researchUnavailable:0,duplicates:0};
 const validPicks=p=>p?.ready===true&&Array.isArray(p.main)&&Array.isArray(p.upset)&&p.main.length===6&&p.upset.length===6&&[...p.main,...p.upset].every(x=>Array.isArray(x)&&x.length===3&&x[0]===1&&new Set(x).size===3&&x.every(b=>Number.isInteger(b)&&b>=1&&b<=6))&&new Set([...p.main,...p.upset].map(x=>x.join('-'))).size===12;
 for(const r of records){
  if(r?.schema!==1||r.date!==date||r.model!=='scenario-course-trial-v1'||!Number.isInteger(r.venue)||r.venue<1||r.venue>24||!Number.isInteger(r.race)||r.race<1||r.race>12){excluded.invalid++;continue;}
  if(!Array.isArray(r.conditions)||r.conditions.length!==3||!r.conditions.every(Array.isArray)||r.conditions[0].length!==1||r.conditions[0][0]!==1||r.conditions[1].length||r.conditions[2].length){excluded.otherConditions++;continue;}
  if(!validTime(r.generatedAt)||!validTime(r.deadlineAt)||!validTime(r.recordedAt)||jstDay(r.generatedAt)!==date||jstDay(r.deadlineAt)!==date||Date.parse(r.generatedAt)>=Date.parse(r.deadlineAt)||Date.parse(r.recordedAt)<Date.parse(r.generatedAt)-5000||Date.parse(r.recordedAt)>=Date.parse(r.deadlineAt)||r.serverResponseBeforeDeadline!==true||r.deviceTimeConsistent!==true||!validPicks(r.baseline)){excluded.invalid++;continue;}
  const key=r.venue+':'+r.race,old=byRace.get(key);
  // Choose latest eligible record before looking at results, not best outcome.
  if(old)excluded.duplicates++;
  if(!old||Date.parse(r.generatedAt)>Date.parse(old.generatedAt)||(r.generatedAt===old.generatedAt&&r.recordedAt>old.recordedAt))byRace.set(key,r);
 }
 const paired=[];
 for(const r of byRace.values()){
  const starts=r.evidence?.start;
  if(!validPicks(r.research)||!Array.isArray(starts)||starts.length!==6||new Set(starts.map(x=>x.boat)).size!==6||new Set(starts.map(x=>x.course)).size!==6||!starts.every(x=>Number.isInteger(x.boat)&&x.boat>=1&&x.boat<=6&&Number.isInteger(x.course)&&x.course>=1&&x.course<=6)||starts.find(x=>x.boat===1)?.course!==1){excluded.researchUnavailable++;continue;}
  paired.push(r);
 }
 return {records:paired.sort((a,b)=>a.venue-b.venue||a.race-b.race),excluded};
}
function summarizeScenarioAudit(records,results){
 const empty=()=>({main:0,total:0,secondTop:0,thirdTop:0,secondCover:0,thirdCover:0,course:Array.from({length:6},(_,i)=>({course:i+1,actual2:0,actual3:0,secondTop:0,thirdTop:0,secondCover:0,thirdCover:0}))});
 const overall={n:0,baseline:empty(),research:empty()},conditional={n:0,baseline:empty(),research:empty()},pending=[],details=[];
 const count=(group,record,actual)=>{
  group.n++;
  const course=new Map(record.evidence.start.map(x=>[x.boat,x.course]));
  for(const method of ['baseline','research']){
   const m=group[method],p=record[method],all=[...p.main,...p.upset],key=actual.join('-'),top=p.main[0];
   const h2=top[1]===actual[1],h3=top[2]===actual[2],c2=p.main.some(x=>x[1]===actual[1]),c3=p.main.some(x=>x[2]===actual[2]);
   m.main+=Number(p.main.some(x=>x.join('-')===key));m.total+=Number(all.some(x=>x.join('-')===key));
   m.secondTop+=Number(h2);m.thirdTop+=Number(h3);m.secondCover+=Number(c2);m.thirdCover+=Number(c3);
   const a=m.course[course.get(actual[1])-1],b=m.course[course.get(actual[2])-1];
   a.actual2++;a.secondTop+=Number(h2);a.secondCover+=Number(c2);b.actual3++;b.thirdTop+=Number(h3);b.thirdCover+=Number(c3);
  }
 };
 for(const r of records){
  const key=r.venue+':'+r.race,d=results.get(key),order=d?.finishOrder;
  if(d?.verified!==true||d.date!==r.date||Number(d.venue)!==r.venue||Number(d.race)!==r.race||!Array.isArray(order)||order.length!==6||new Set(order).size!==6||!order.every(b=>Number.isInteger(b)&&b>=1&&b<=6)){
   pending.push({venue:r.venue,race:r.race,reason:d?.reason||'official_result_unverified'});continue;
  }
  const actual=order.slice(0,3);count(overall,r,actual);if(actual[0]===1)count(conditional,r,actual);
  const compare=p=>({main:p.main.some(x=>x.join('-')===actual.join('-')),total:[...p.main,...p.upset].some(x=>x.join('-')===actual.join('-')),secondCover:p.main.some(x=>x[1]===actual[1]),thirdCover:p.main.some(x=>x[2]===actual[2])});
  details.push({venue:r.venue,race:r.race,actual,baseline:compare(r.baseline),research:compare(r.research)});
 }
 return {overall,conditional,pending,details};
}
(function(){
 const selectors=['scenarioFirst','scenarioSecond','scenarioThird'].map(id=>document.getElementById(id));
 const button=document.getElementById('runScenarioPrediction'),clear=document.getElementById('clearScenarioPrediction'),status=document.getElementById('scenarioPredictionStatus'),out=document.getElementById('scenarioPredictionOutput');
 const trialOut=document.getElementById('scenarioCourseTrialOutput'),courseOut=document.getElementById('scenarioOfficialCourseStats'),officialTrialOut=document.getElementById('officialPositionTrialOutput');
 function renderOfficialCourseStats(data){
  if(!data?.ready){courseOut.textContent='公式コース成績を確認できません：'+(data?.reason||'未取得');return;}
  const lines=['公式集計期間：'+data.periodStart+' ～ '+data.periodEnd,'進入：'+(data.courseBasis==='verified_exhibition_course'?'展示6艇確認済み':'枠番による仮定・進入未確認'),'取得 '+data.available+'/6艇',''];
  for(const x of data.rows){const rate=i=>x.rates?x.rates[i].toFixed(1)+'%（'+x.finishCounts[i]+'/'+x.normalFinishes+'）':'未算出';lines.push(x.boat+'号艇／'+x.course+'コース／登録 '+x.racerId+'：1着 '+rate(0)+'、2着 '+rate(1)+'、3着 '+rate(2)+'／進入 '+(x.entries??'不明')+'回'+(x.normalFinishes!==null&&x.normalFinishes<10?' ※通常完走10回未満':'') );}
  courseOut.textContent=lines.join('\\n');
 }
 const archiveStatus=document.getElementById('scenarioArchiveStatus'),archiveOutput=document.getElementById('scenarioArchiveOutput');
 const archivePrefix='boatScore2:scenario-research:v1:';
 function readArchive(){
  const date=dateCode(),records=[];
  for(let i=0;i<localStorage.length;i++){
   const k=localStorage.key(i);if(!k||!k.startsWith(archivePrefix+date+':'))continue;
   try{const r=JSON.parse(localStorage.getItem(k));if(r?.schema===1&&r.date===date)records.push(r);}catch{}
  }
  return records.sort((a,b)=>a.recordedAt.localeCompare(b.recordedAt));
 }
 function saveArchive(d,conditions,picks,trial,scores,recent,officialTrial){
  try{
   const record=buildScenarioResearchRecord(d,conditions,picks,trial,scores,recent,new Date().toISOString(),officialTrial);
   if(!record)throw Error('記録形式不正');
   if(!record.serverResponseBeforeDeadline||!record.deviceTimeConsistent){archiveStatus.textContent='締切前時刻を確認できないため研究記録に保存しません。';return;}
   const key=archivePrefix+record.date+':'+record.venue+':'+record.race+':'+crypto.randomUUID();
   localStorage.setItem(key,JSON.stringify(record));
   archiveStatus.textContent='端末に自動記録済み：'+new Date(record.recordedAt).toLocaleTimeString('ja-JP',{timeZone:'Asia/Tokyo'})+'／'+readArchive().length+'件（選択日）';
  }catch(e){archiveStatus.textContent='端末保存失敗：'+String(e.message||e).slice(0,80);}
 }
 document.getElementById('scenarioArchiveList').addEventListener('click',()=>{
  try{
   const records=readArchive(),races=new Set(records.map(r=>r.venue+':'+r.race));
   archiveOutput.textContent='記録 '+records.length+'件／'+races.size+'レース\n'+records.map(r=>r.venue+'場 '+r.race+'R '+new Date(r.recordedAt).toLocaleTimeString('ja-JP',{timeZone:'Asia/Tokyo'})+' 条件 '+r.conditions.map(x=>x.join('・')||'全艇').join('/')+'／研究 '+(r.research.ready?'あり':'保留')).join('\n');
  }catch(e){archiveOutput.textContent='記録読込失敗：'+String(e.message||e).slice(0,80);}
 });
 document.getElementById('scenarioArchiveExport').addEventListener('click',()=>{
  try{
   const records=readArchive();if(!records.length){archiveOutput.textContent='選択日の記録はありません。';return;}
   const url=URL.createObjectURL(new Blob([JSON.stringify({date:dateCode(),source:'device_record_not_server_attested',records},null,2)],{type:'application/json'})),link=document.createElement('a');
   link.href=url;link.download='boat-score-2-scenario-'+dateCode()+'.json';document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);
   archiveOutput.textContent='JSON出力：'+records.length+'件。ブラウザーのダウンロードを確認してください。';
  }catch(e){archiveOutput.textContent='出力失敗：'+String(e.message||e).slice(0,80);}
 });
 const auditButton=document.getElementById('scenarioArchiveAudit'),auditStatus=document.getElementById('scenarioAuditStatus'),auditOutput=document.getElementById('scenarioAuditOutput');
 let auditGeneration=0,auditController=null;
 day.addEventListener('change',()=>{auditGeneration++;auditController?.abort();auditController=null;auditButton.disabled=false;auditStatus.textContent='';auditOutput.textContent='';});
 auditButton.addEventListener('click',async()=>{
  auditController?.abort();auditController=new AbortController();
  const signal=auditController.signal,token=++auditGeneration,date=dateCode(),active=()=>token===auditGeneration&&!signal.aborted&&dateCode()===date;
  auditButton.disabled=true;auditOutput.textContent='';auditStatus.textContent='保存予想を確認中…';
  try{
   const {records,excluded}=selectScenarioAuditRecords(readArchive(),date),results=new Map();
   const exclusion='対象：1着1号艇のみ固定・2/3着指定なし・両方式あり。各R最新1件。\n除外：別条件 '+excluded.otherConditions+'／時刻・形式 '+excluded.invalid+'／研究保留 '+excluded.researchUnavailable+'／重複記録 '+excluded.duplicates;
   if(!records.length){auditOutput.textContent=exclusion+'\n対象記録なし';auditStatus.textContent='照合対象なし';return;}
   for(let i=0;i<records.length;i+=3){
    if(!active())return;
    auditStatus.textContent='公式結果照合 '+i+'/'+records.length;
    await Promise.all(records.slice(i,i+3).map(async r=>{
     const k=r.venue+':'+r.race;
     try{
      const response=await fetch('/api/official/result?'+new URLSearchParams({date,venue:String(r.venue),race:String(r.race)}),{signal:AbortSignal.any([signal,AbortSignal.timeout(18000)])});
      const d=await response.json();results.set(k,response.ok?d:{reason:'HTTP '+response.status});
     }catch(e){results.set(k,{reason:'公式結果取得失敗'});}
    }));
   }
   if(!active())return;
   const a=summarizeScenarioAudit(records,results);
   const validOfficial=p=>p?.ready===true&&p.method==='official_position_shrink20_log3_v1'&&Array.isArray(p.main)&&Array.isArray(p.upset)&&p.main.length===6&&p.upset.length===6&&[...p.main,...p.upset].every(x=>Array.isArray(x)&&x.length===3&&x[0]===1&&new Set(x).size===3&&x.every(b=>Number.isInteger(b)&&b>=1&&b<=6))&&new Set([...p.main,...p.upset].map(x=>x.join('-'))).size===12;
   const officialPair=summarizeScenarioAudit(records.filter(r=>validOfficial(r.officialPositionTrial)).map(r=>({...r,baseline:r.research,research:r.officialPositionTrial})),results);
   const rate=(x,n)=>n?x+'/'+n+' ('+(100*x/n).toFixed(1)+'%)':'対象なし';
   const lines=[exclusion,'端末保存記録（サーバー証明なし）・展示コースで集計','公式6艇確定 '+a.overall.n+'/'+records.length+'R、未確認 '+a.pending.length+'R（分母外）'];
   for(const [label,g] of [['全照合レース（1号艇が負けた場合も含む）',a.overall],['1号艇勝利レースのみ（条件付き分析）',a.conditional]]){
    lines.push('',label+' '+g.n+'R','従来 ／ 研究');
    for(const [name,k] of [['三連単 本命6点','main'],['三連単 全12点','total'],['2着 第1候補','secondTop'],['3着 第1候補','thirdTop'],['2着 6点内候補','secondCover'],['3着 6点内候補','thirdCover']])lines.push(name+'：'+rate(g.baseline[k],g.n)+' ／ '+rate(g.research[k],g.n));
   }
   lines.push('','1号艇勝利時の展示コース別：実入賞件数に対する候補カバー（従来／研究）');
   for(let i=1;i<6;i++){
    const b=a.conditional.baseline.course[i],r=a.conditional.research.course[i];
    lines.push((i+1)+'コース 2着 '+rate(b.secondCover,b.actual2)+' ／ '+rate(r.secondCover,r.actual2)+'、3着 '+rate(b.thirdCover,b.actual3)+' ／ '+rate(r.thirdCover,r.actual3));
   }
   lines.push('','選手別補正の独立比較（同一記録の現研究／選手別補正）');
   for(const [label,g] of [['全照合',officialPair.overall],['1号艇勝利限定',officialPair.conditional]]){
    lines.push(label+' '+g.n+'R');
    for(const [name,k] of [['本命6点','main'],['全12点','total'],['2着第1候補','secondTop'],['3着第1候補','thirdTop'],['2着6点内候補','secondCover'],['3着6点内候補','thirdCover']])lines.push(name+'：'+rate(g.baseline[k],g.n)+' ／ '+rate(g.research[k],g.n));
   }
   lines.push('','個別結果（本命／全12点）');
   const mark=x=>(x.main?'○':'×')+'/'+(x.total?'○':'×');
   for(const d of a.details)lines.push(d.venue+'場 '+d.race+'R '+d.actual.join('-')+' 従来 '+mark(d.baseline)+' 研究 '+mark(d.research)+'｜2着候補 '+(d.baseline.secondCover?'○':'×')+'/'+(d.research.secondCover?'○':'×')+' 3着候補 '+(d.baseline.thirdCover?'○':'×')+'/'+(d.research.thirdCover?'○':'×'));
   if(a.pending.length){lines.push('','未確認・非標準結果等（的中判定なし）');for(const d of a.pending)lines.push(d.venue+'場 '+d.race+'R '+d.reason);}
   auditOutput.textContent=lines.join('\n');auditStatus.textContent='照合終了 '+a.overall.n+'R／未確認 '+a.pending.length+'R';
  }catch(e){if(active())auditStatus.textContent='照合失敗：'+String(e.message||e).slice(0,100);}
  finally{if(token===auditGeneration){auditButton.disabled=false;auditController=null;}}
 });
 let generation=0,controller=null;
 const selected=()=>dateCode()+':'+venue.value+':'+race.value;
 const fixed=()=>selectors.map(x=>Array.from(x.querySelectorAll('button[aria-pressed="true"]')).map(b=>Number(b.dataset.boat)));
 const count=document.getElementById('scenarioCombinationCount');
 function toggleBoat(b,pressed){
  b.setAttribute('aria-pressed',String(pressed));
  b.style.borderColor=pressed?'#38bdf8':'#64748b';
  b.style.boxShadow=pressed?'0 0 0 1px #38bdf8':'none';
  b.querySelector('span').textContent=pressed?'✓':'□';
 }
 function refreshConditions(){
  const condition=fixed(),orders=enumerateScenarioOrders(condition);
  selectors.forEach((x,i)=>document.getElementById(x.id+'Summary').textContent=condition[i].length?condition[i].join('・')+'号艇':'指定なし');
  count.textContent='条件内 '+(orders?.length??0)+'通り'+(condition.every(x=>!x.length)?'（指定なし）':'');
  if(orders?.length===0)status.textContent='成立する組み合わせがありません。選択を変更してください。';
 }
 function invalidate(reset=false){
  generation++;if(controller)controller.abort();controller=null;button.disabled=false;
  if(reset)selectors.forEach(x=>x.querySelectorAll('button[data-boat]').forEach(b=>toggleBoat(b,false)));
  out.replaceChildren();out.style.color='';
  trialOut.textContent='1着を1号艇だけに指定して比較できます。';trialOut.style.color='';courseOut.textContent='予想実行後に表示します。';officialTrialOut.textContent='1号艇1着固定で比較できます。';officialTrialOut.style.color='';
  archiveStatus.textContent='予想実行時に自動記録します。';archiveOutput.textContent='';
  status.textContent='着順を1つ以上指定して、指定条件で予想を押してください。';
  refreshConditions();
 }
 selectors.forEach(x=>x.addEventListener('click',e=>{
  const b=e.target.closest('button[data-boat]');
  if(!b||!x.contains(b))return;
  toggleBoat(b,b.getAttribute('aria-pressed')!=='true');invalidate(false);
 }));
 [day,venue,race].forEach(x=>x.addEventListener('change',()=>invalidate(true)));
 clear.addEventListener('click',()=>invalidate(true));
 button.addEventListener('click',async()=>{
  invalidate(false);const condition=fixed();
  if(!condition.some(x=>x.length)){status.textContent='1着・2着・3着のいずれかを指定してください。';return;}
  if(!enumerateScenarioOrders(condition)?.length){status.textContent='成立する組み合わせがありません。選択を変更してください。';return;}
  if(!day.value||!venue.value||!race.value||venue.disabled||race.disabled){status.textContent='開催日・競艇場・レースを選択してください。';return;}
  const key=selected(),token=generation,date=dateCode(),v=venue.value,r=race.value;
  controller=new AbortController();const signal=controller.signal;
  const active=()=>token===generation&&!signal.aborted&&key===selected();
  button.disabled=true;status.textContent='指定レースの公式成績と直前情報を確認中…';
  try{
   const res=await fetch('/api/predict/selected-race?'+new URLSearchParams({date,venue:v,race:r,mode:'beforeinfo'}),{signal:AbortSignal.any([signal,AbortSignal.timeout(55000)])});
   const d=await res.json();
   if(!active())return;
   if(!res.ok||d.ready!==true||d.date!==date||Number(d.venue)!==Number(v)||Number(d.race)!==Number(r))throw Error('公式6艇の情報が未確認です');
   if(d.method!=='average_national_local_winrate70_motor30_unvalidated')throw Error('全国・当地勝率の6艇照合ができていません');
   const missingBefore=d.exhibitionAdjustmentApplied!==true||d.startAdjustmentApplied!==true;
   const recent=recent50SupplementForSelection();
   const scores=Array.isArray(d.rankedScores)?d.rankedScores.map(x=>({boat:x.boat,score:x.score+(recent?.find(y=>y.boat===x.boat)?.points??0)})):[];
   const picks=rankScenarioCombinations(scores,condition);
   if(!picks.ready)throw Error('6艇の評価点または指定条件が不正です');
   const label=condition.map((x,i)=>(i+1)+'着：'+(x.length?x.join('・')+'号艇':'指定なし')).join(' ／ ');
   const fmt=a=>a.length?a.map((x,i)=>(i+1)+'. '+x.join('-')).join('\n'):'該当なし';
   status.textContent=label+'（条件内 '+picks.total+'通り）';
   out.style.color=missingBefore||!recent?'#fbbf24':'';
   officialTrialOut.style.color=missingBefore?'#fbbf24':'';
   const trial=rankInnerWinnerCourseTrial(d.rankedScores,condition,d.scenarioEvidence,recent);
   const officialTrial=rankOfficialPositionTrial(d.rankedScores,condition,d.scenarioEvidence,recent);
   saveArchive(d,condition,picks,trial,scores,recent,officialTrial);
   officialTrialOut.textContent=officialTrial.ready?'【選手別補正研究】本命 '+officialTrial.main.length+'点\n'+fmt(officialTrial.main)+'\n別候補 '+officialTrial.upset.length+'点\n'+fmt(officialTrial.upset)+'\n\n2着／3着の仮補正点（通常完走数）\n'+officialTrial.adjustments.map(x=>x.boat+'号艇 '+x.second.toFixed(2)+'／'+x.third.toFixed(2)+'（'+x.n+'走）').join('\n'):officialTrial.reason;
   renderOfficialCourseStats(d.scenarioEvidence?.courseStats);
   trialOut.style.color=trial.ready&&(missingBefore||!trial.numeric||!trial.recentOK)?'#fbbf24':'';
   trialOut.textContent=trial.ready?'【研究方式 本命 '+trial.main.length+'点】\n'+fmt(trial.main)+'\n\n【別候補 '+trial.upset.length+'点】\n'+fmt(trial.upset)+'\n\n着順別コース傾向：反映（11/24・25の168R）\nまくらぼ：'+(trial.recentOK?'2着率・3着率を個別加点（全コース）':'未取得・加点なし')+'\n隣接ST：'+(trial.numeric?'数値6艇確認':'F/Lまたは数値不足・隣接補正なし')+'\n展示タイム：'+(trial.exOK?'6艇確認':'追加条件未確認')+'\n追加条件：'+(trial.signals.length?trial.signals.map(x=>x.boat+'号艇：'+x.label+'（+'+x.points+'仮点）').join('\n'):'該当なし')+'\n※展開仮説の比較試算。的中率改善は未検証。':trial.reason;
   out.textContent=(missingBefore?'【暫定予想：直前情報未確認・不足】\n':'')+'【本命 '+picks.main.length+'点】\n'+fmt(picks.main)+'\n\n【穴・条件内の別候補 '+picks.upset.length+'点】\n'+fmt(picks.upset)+'\n\n【反映状況】\n全国＋当地勝率：合算と同順位になる平均方式（当地0.00は全国で代用）\nモーター：反映\n展示タイム：'+(d.exhibitionAdjustmentApplied?'反映':'未反映')+'\n展示ST：'+(d.startAdjustmentApplied?'反映':'未反映')+'\nまくらぼ50走：'+(recent?'6艇照合済み・加点':'未取得・確認済み公式情報のみで試算')+'\n風・波・進入：未反映\n※穴は条件内の別候補で、オッズによる分類ではありません。指定条件の成立確率・的中率は未検証です。';
  }catch(e){if(active())status.textContent='予想保留：'+e.message;}
  finally{if(token===generation){button.disabled=false;controller=null;}}
 });
})();
function updateCombinedPredictionPanel(){
 renderLocalPredictions();
 const out=document.getElementById('combinedPredictionOutput');
 if(!out)return;
 const current=lastComparisonPrediction;
 if(!current||current.key!==dateCode()+':'+venue.value+':'+race.value){
  out.textContent='選択したレースの予想を実行してください。';return;
 }
 const d=current.data,recent=recent50SupplementForSelection();
 if(d.exhibitionAdjustmentApplied!==true&&d.startAdjustmentApplied!==true){
  out.textContent='保留：公式展示タイム・展示STのどちらも評価点に反映できません。';return;
 }
 if(!recent){
  const base=d.rankedScores;
  if(!Array.isArray(base)||base.length!==6||new Set(base.map(x=>Number(x.boat))).size!==6||
    !base.every(x=>Number.isInteger(Number(x.boat))&&Number(x.boat)>=1&&Number(x.boat)<=6&&Number.isFinite(x.score))){
   out.textContent='保留：公式6艇の評価点を確認できません。';return;
  }
  const picks=trialPicks(base.map(x=>({boat:Number(x.boat),score:x.score})));
  const format=arr=>arr.map((x,i)=>(i+1)+'. '+x.join('-')).join('\n');
  out.textContent='【公式直前情報のみ（まくらぼ未取得）】\n【本命】6点\n'+format(picks.main)+'\n\n【穴】6点\n'+format(picks.upset)+
   '\n\n【反映条件】\n公式展示タイム：'+(d.exhibitionAdjustmentApplied===true?'反映済み':'未反映')+
   '\n公式展示ST：'+(d.startAdjustmentApplied===true?'反映済み':'未反映')+
   '\nまくらぼ50走：未取得・加点なし\n※公式出走表の基礎点と照合済み直前補正のみ使用。風・波・進入の手入力補正は適用していません。試算・的中率未検証。';
  return;
 }
 const comparison=document.getElementById('recent50CompareOutput').textContent;
 const main=comparison.match(/【本命6点】\n反映前：[^\n]*\n反映後：([^\n]*)/);
 const upset=comparison.match(/【穴6点】\n反映前：[^\n]*\n反映後：([^\n]*)/);
 if(!main||!upset){out.textContent='保留：6艇の評価点と買い目を照合できません。';return;}
 const active=trialConditions.key===current.key?trialConditions:null;
 if(active&&(active.entry||active.wind)){
  const base=d.rankedScores;
  if(!Array.isArray(base)||base.length!==6||new Set(base.map(x=>Number(x.boat))).size!==6||
    !base.every(x=>Number.isInteger(Number(x.boat))&&Number.isFinite(x.score))){
   out.textContent='保留：進入・風の再計算に必要な公式6艇の点数がありません。';return;
  }
  const rows=base.map(x=>{
   const boat=Number(x.boat),recentPoints=recent.find(y=>y.boat===boat).points;
   const course=active.entry?active.entry.indexOf(boat)+1:boat;
   // Small, uncalibrated scenario adjustments: never label these as verified probabilities.
   const entryPoints=active.entry?(3.5-course)*.7:0;
   const windPoints=active.wind==='head'&&active.speed!==null?(course>=4?1:-1)*Math.min(active.speed,10)*.12:
     active.wind==='tail'&&active.speed!==null?(course<=3?1:-1)*Math.min(active.speed,10)*.12:0;
   return {boat,score:x.score+recentPoints+entryPoints+windPoints};
  });
  const picks=trialPicks(rows);
  const format=arr=>arr.map((x,i)=>(i+1)+'. '+x.join('-')).join('\n');
  out.textContent='【本命】6点\n'+format(picks.main)+'\n\n【穴】6点\n'+format(picks.upset)+
   '\n\n【手入力の試算条件】\n進入予測：'+(active.entry?active.entry.join('-'):'未入力')+
   '\n風：'+(active.wind?({head:'向かい風',tail:'追い風',cross:'横風',calm:'無風'}[active.wind])+' '+active.speed+'m/s':'未入力')+
   '\n展示タイム：'+(d.exhibitionAdjustmentApplied===true?'反映済み':'未反映')+' ／ 展示ST：'+(d.startAdjustmentApplied===true?'反映済み':'未反映')+'\nまくらぼ50走：6艇照合済み'+
   '\n※風・進入の加点は仮の感度設定で実測検証前です。横風は方向別の補正をしません。風・進入の手入力は公式情報ではありません。';
  return;
 }
 const lines=value=>value.split('、').map((x,i)=>(i+1)+'. '+x).join('\n');
 out.textContent='【本命】6点\n'+lines(main[1])+'\n\n【穴】6点\n'+lines(upset[1])+
  '\n\n【反映条件】\n公式展示タイム：'+(d.exhibitionAdjustmentApplied===true?'反映済み':'未反映')+'\n公式展示ST：'+(d.startAdjustmentApplied===true?'反映済み':'未反映')+'\nまくらぼ50走：6艇照合済み（最大10点加算）'+
  '\n※進入・風・波は未反映。50走のコース別成績は未確認。検証用の試算であり、的中率は未検証です。';
}
function updateRecent50Compare(){
 const out=document.getElementById('recent50CompareOutput'),current=lastComparisonPrediction;
 if(!current||current.key!==dateCode()+':'+venue.value+':'+race.value){out.textContent='選択したレースの予想を実行してください。';updateCombinedPredictionPanel();return;}
 const recent=recent50SupplementForSelection(),d=current.data;
 if(!recent){out.textContent='照合済み6艇の50走がありません。「まくらぼを自動検索」を実行してください。';updateCombinedPredictionPanel();return;}
 const base=d.rankedScores;
 if(!Array.isArray(base)||base.length!==6||new Set(base.map(x=>Number(x.boat))).size!==6||
  !base.every(x=>Number.isInteger(Number(x.boat))&&Number(x.boat)>=1&&Number(x.boat)<=6&&typeof x.score==='number'&&Number.isFinite(x.score))){
  out.textContent='公式の6艇分の基礎点数が不足しています。';updateCombinedPredictionPanel();return;
 }
 const before=base.map(x=>({boat:Number(x.boat),score:x.score}));
 const after=before.map(x=>({boat:x.boat,score:x.score+recent.find(y=>y.boat===x.boat).points}));
 const picks=rows=>{
  const scores=new Map(rows.map(x=>[x.boat,x.score])),comb=[];
  for(let a=1;a<=6;a++)for(let b=1;b<=6;b++)for(let c=1;c<=6;c++){
   if(a===b||a===c||b===c)continue;
   comb.push({boats:[a,b,c],strength:scores.get(a)*0.56+scores.get(b)*0.29+scores.get(c)*0.15});
  }
  comb.sort((a,b)=>b.strength-a.strength||a.boats.join('').localeCompare(b.boats.join('')));
  const main=comb.slice(0,6).map(x=>x.boats),used=new Set(main.map(x=>x.join('-')));
  return {main,upset:comb.filter(x=>x.boats[0]>=4&&!used.has(x.boats.join('-'))).slice(0,6).map(x=>x.boats)};
 };
 const a=picks(before),b=picks(after),fmt=arr=>arr.map(x=>x.join('-')).join('、');
 if(a.upset.length!==6||b.upset.length!==6){out.textContent='6点ずつの買い目を生成できません。';updateCombinedPredictionPanel();return;}
 out.textContent='【反映前 → 反映後】\n'+before.slice().sort((x,y)=>x.boat-y.boat).map(x=>{
  const m=recent.find(y=>y.boat===x.boat);
  return x.boat+'号艇 '+x.score.toFixed(2)+' → '+(x.score+m.points).toFixed(2)+'点（+'+m.points.toFixed(2)+'）';
 }).join('\n')+'\n\n【本命6点】\n反映前：'+fmt(a.main)+'\n反映後：'+fmt(b.main)+
 '\n\n【穴6点】\n反映前：'+fmt(a.upset)+'\n反映後：'+fmt(b.upset)+
 '\n\n※反映前は既存の直前補正を含む点数です。50走のコース別成績は未確認。最大10点の単純加算による未検証の試算で、通常予想は変更しません。';
 updateCombinedPredictionPanel();
}
function updatePositionHeatmap(){
 const out=document.getElementById('positionHeatmapOutput'),v=verifiedMakulabo,d=lastComparisonPrediction;
 const key=dateCode()+':'+venue.value+':'+race.value;
 if(!v||v.key!==key||!Array.isArray(v.rows)||v.rows.length!==6){out.textContent='照合済み6艇のデータがありません。';return;}
 if(!d||d.key!==key||!Array.isArray(d.data.rankedScores)){out.textContent='このレースの予想を実行してください。';return;}
 const rows=v.rows;
 if(new Set(rows.map(x=>Number(x.boat))).size!==6||!rows.every(x=>Number.isInteger(x.runs)&&x.runs>0&&x.runs<=50&&Array.isArray(x.counts)&&x.counts.length===6&&x.counts.every(n=>Number.isInteger(n)&&n>=0)&&x.counts.reduce((a,b)=>a+b,0)===x.runs)){out.textContent='着順回数の検証ができません。';return;}
 const scores=new Map(d.data.rankedScores.map(x=>[Number(x.boat),x.score]));
 if(scores.size!==6||![1,2,3,4,5,6].every(x=>typeof scores.get(x)==='number'&&Number.isFinite(scores.get(x)))){out.textContent='基礎点数が不足しています。';return;}
 const m=new Map(rows.map(x=>[Number(x.boat),x])),comb=[];
 for(let a=1;a<=6;a++)for(let b=1;b<=6;b++)for(let c=1;c<=6;c++){
  if(a===b||a===c||b===c)continue;
  const before=scores.get(a)*.56+scores.get(b)*.29+scores.get(c)*.15;
  const extra=10*(m.get(a).counts[0]/m.get(a).runs+m.get(b).counts[1]/m.get(b).runs+m.get(c).counts[2]/m.get(c).runs)/3;
  comb.push({label:a+'-'+b+'-'+c,first:a,before,after:before+extra});
 }
 const top=(k,filter)=>comb.filter(filter).sort((x,y)=>y[k]-x[k]||x.label.localeCompare(y.label)).slice(0,6).map(x=>x.label).join('、');
 out.textContent='【50走の着順回数】\n'+rows.slice().sort((a,b)=>a.boat-b.boat).map(x=>x.boat+'号艇 '+x.runs+'走：1着'+x.counts[0]+'／2着'+x.counts[1]+'／3着'+x.counts[2]).join('\n')+
 '\n\n【本命6点】\n反映前：'+top('before',()=>true)+'\n反映後：'+top('after',()=>true)+
 '\n\n【外枠1着・穴6点】\n反映前：'+top('before',x=>x.first>=4)+'\n反映後：'+top('after',x=>x.first>=4)+
 '\n\n※各着順の回数÷走数を着順別に最大10点加算する未検証の試算。まくらぼ画面の「優位」指数そのものではありません。通常予想は変更しません。';
}
function recent50SupplementForSelection(){
 if(!verifiedMakulabo||verifiedMakulabo.key!==dateCode()+':'+venue.value+':'+race.value)return null;
 const rows=verifiedMakulabo.rows;
 if(verifiedMakulabo.partial===true||!Array.isArray(rows)||rows.length!==6||new Set(rows.map(x=>Number(x.boat))).size!==6)return null;
 const values=rows.map(row=>{
  const counts=Array.isArray(row.counts)?row.counts.map(Number):null,runs=Number(row.runs);
  if(!Number.isInteger(Number(row.boat))||Number(row.boat)<1||Number(row.boat)>6||
     !Number.isInteger(runs)||runs<1||runs>50||!Array.isArray(counts)||counts.length!==6||
     !counts.every(n=>Number.isInteger(n)&&n>=0)||counts.reduce((a,b)=>a+b,0)!==runs)return null;
  return {boat:Number(row.boat),runs,winRate:counts[0]/runs*100,points:Math.round(counts[0]/runs*1000)/100,secondPoints:Math.round(counts[1]/runs*1000)/100,thirdPoints:Math.round(counts[2]/runs*1000)/100};
 });
 return values.every(Boolean)?values.sort((a,b)=>a.boat-b.boat):null;
}
function syncVerifiedMakulaboComparison(){
 const tbody=document.getElementById('comparisonBody');
 const key=dateCode()+':'+venue.value+':'+race.value;const automatic=verifiedMakulabo?.key===key?verifiedMakulabo.rows:[];const manual=manualMakulabo?.key===key?manualMakulabo.rows:[];
 let updated=0;
 const trs=Array.from(tbody.querySelectorAll('tr'));
 for(const tr of trs){
  const boat=Number((tr.cells[0]?.textContent||'').match(/^[1-6]/)?.[0]);
  const auto=automatic.find(x=>Number(x.boat)===boat);const input=manual.find(x=>x.boat===boat);const row=auto||(input?{runs:input.sampleSize,counts:input.finishCounts}:null);
  if(!row||tr.cells.length!==18||row.verified===false)continue;
  // The API has already checked all six official racer identities. Match by boat here;
  // presentation names can contain different spacing and glyph variants.
  if(!Number.isFinite(row.runs)||row.runs<1||!Array.isArray(row.counts)||row.counts.length!==6)continue;
  tr.cells[17].textContent=(auto?'':'手入力参考 / ')+row.runs+'走 / 1着 '+(row.counts[0]/row.runs*100).toFixed(1)+'% / 2連 '+((row.counts[0]+row.counts[1])/row.runs*100).toFixed(1)+'% / 3連 '+((row.counts[0]+row.counts[1]+row.counts[2])/row.runs*100).toFixed(1)+'%';
  updated++;
 }
 return updated;
}
document.getElementById('searchMakulaboInBoatScore').onclick=async function(){
 const date=dateCode(),v=venue.value,r=race.value;
 const status=document.getElementById('makulaboSearchStatus'),result=document.getElementById('makulaboSearchResult');
 if(!/^20[0-9]{6}$/.test(date)||!v||!r){status.textContent='日付・競艇場・レースを選択してください。';return;}
 const token=++makulaboSearchToken;this.disabled=true;result.replaceChildren();status.textContent='まくらぼ50走を取得中…（まくらぼ取得後、公式6艇の照合に時間がかかる場合があります）';
 try{
  const response=await fetch('/api/makulabo/heatmap?'+new URLSearchParams({date,venue:v,race:r}),{signal:AbortSignal.timeout(65000)});
  const data=await response.json();
  if(token!==makulaboSearchToken||date!==dateCode()||v!==venue.value||r!==race.value)return;
  if(!response.ok||data.last50Verified!==true||!Array.isArray(data.last50ByBoat)||data.last50ByBoat.length!==6){
   const diagnostic=data.last50ParseDiagnostics; const parseDetail=diagnostic?' 表の診断: 全行'+diagnostic.tableRowCount+'・有効行'+diagnostic.validRowCount+'・艇番['+(diagnostic.boatsFound||[]).join(',')+']・名前文字数['+(diagnostic.nameLengths||[]).join(',')+']・除外行['+(diagnostic.rejectedRows||[]).map(x=>x.boat+'号艇 '+x.reason+' 走数原文:'+x.rawRuns+' 平均原文:'+x.rawAverage+' 異常値:'+(x.invalidCountCells||[]).map(y=>y.finish+'着='+y.value).join('/')+' 走数:'+x.runs+' 着順合計:'+x.countSum+' 平均:'+x.average+' 計算:'+x.calculatedAverage).join('、')+']。':''; const comparison=data.last50IdentityComparison; const mismatches=Array.isArray(comparison?.mismatches)?comparison.mismatches:[]; const detail=mismatches.length?' 不一致: '+mismatches.map(x=>x.boat+'号艇 公式「'+x.officialName+'」／まくらぼ「'+(x.parsedName??'該当なし')+'」').join('、'):''; status.textContent='まくらぼ50走：6艇照合未完了。取得できた艇のみ参考表示します。未掲載の艇は未確認で、予想点には反映しません。';
   if(parseDetail||detail){
    const details=document.createElement('details'),summary=document.createElement('summary'),body=document.createElement('p');
    summary.textContent='取得エラーの詳細を表示';body.textContent='判定：'+(data.last50ParseReason||data.reason||data.last50Reason||'データ不足')+'。'+parseDetail+detail;
    body.style.cssText='overflow-wrap:anywhere;white-space:pre-wrap';details.append(summary,body);result.appendChild(details);
   }
   // Show independently verified source rows without promoting partial data to prediction inputs.
   const partial=Array.isArray(data.last50PartialRows)?data.last50PartialRows.filter(row=>row.verified===true&&Number.isInteger(row.boat)&&row.boat>=1&&row.boat<=6&&Number.isInteger(row.runs)&&row.runs>0&&Array.isArray(row.counts)&&row.counts.length===6&&row.counts.every(n=>Number.isInteger(n)&&n>=0)&&row.counts.reduce((sum,n)=>sum+n,0)===row.runs):[];
   if(partial.length){
    verifiedMakulabo={key:date+':'+v+':'+r,rows:partial,partial:true};
    const reflected=syncVerifiedMakulaboComparison();renderExperimental100PointPrediction();
    const partialStatus=document.createElement('p');partialStatus.textContent='選手比較表へ反映：'+reflected+'/'+partial.length+'艇（確認済み行のみ）。6艇照合未完了のため予想点には反映しません。';result.appendChild(partialStatus);
    const title=document.createElement('h3');title.textContent='まくらぼ取得済みの艇（部分表示・予想未反映）';result.appendChild(title);
    const note=document.createElement('p');note.textContent='公式選手名と艇番が一致した行のみ表示します。未掲載の艇は未確認です。6艇すべての照合が完了するまで、50走データは予想点に加算しません。';result.appendChild(note);
    const table=document.createElement('table'),head=document.createElement('tr');
    ['艇','選手','1着','2着','3着','4着','5着','6着','走数','平均'].forEach(label=>{const th=document.createElement('th');th.textContent=label;head.appendChild(th);});table.appendChild(head);
    const byBoat=new Map(partial.map(row=>[row.boat,row]));
    const official=Array.isArray(data.last50IdentityComparison?.official)?data.last50IdentityComparison.official:[];
    for(let boat=1;boat<=6;boat++){
     const row=byBoat.get(boat),tr=document.createElement('tr');
     const values=row?[boat,row.name,...row.counts,row.runs,row.average]:[boat,official.find(x=>x.boat===boat)?.name||'未確認',...Array(8).fill('未確認')];
     values.forEach(value=>{const td=document.createElement('td');td.textContent=String(value);tr.appendChild(td);});table.appendChild(tr);
    }
    const scroll=document.createElement('div');scroll.style.cssText='max-width:100%;overflow-x:auto;-webkit-overflow-scrolling:touch';table.style.cssText='border-collapse:collapse;font-size:13px;white-space:nowrap';for(const cell of table.querySelectorAll('th,td'))cell.style.cssText='border:1px solid #64748b;padding:5px';scroll.appendChild(table);result.appendChild(scroll);
   }
   return;
  }
  const table=document.createElement('table'),head=document.createElement('tr');
  ['艇','選手','1着','2着','3着','4着','5着','6着','走数','平均'].forEach(t=>{const th=document.createElement('th');th.textContent=t;head.appendChild(th);});table.appendChild(head);
  data.last50ByBoat.slice().sort((a,b)=>a.boat-b.boat).forEach(row=>{
   const tr=document.createElement('tr');
   [row.boat,row.name,...row.counts,row.runs,row.average].forEach(value=>{const td=document.createElement('td');td.textContent=String(value);tr.appendChild(td);});table.appendChild(tr);
  });result.appendChild(table);
  const rateTable=document.createElement('table'),rateHead=document.createElement('tr');
  ['艇','1着率','2連対率','3連対率'].forEach(label=>{const th=document.createElement('th');th.textContent=label;rateHead.appendChild(th);});rateTable.appendChild(rateHead);
  data.last50ByBoat.slice().sort((a,b)=>a.boat-b.boat).forEach(row=>{
   const tr=document.createElement('tr');
   const vals=[row.boat,(row.counts[0]/row.runs*100).toFixed(1)+'%',((row.counts[0]+row.counts[1])/row.runs*100).toFixed(1)+'%',((row.counts[0]+row.counts[1]+row.counts[2])/row.runs*100).toFixed(1)+'%'];
   vals.forEach(v=>{const td=document.createElement('td');td.textContent=String(v);tr.appendChild(td);});rateTable.appendChild(tr);
  });
  const heading=document.createElement('h3');heading.textContent='まくらぼ直近50走の入賞率';result.appendChild(heading);result.appendChild(rateTable);
  verifiedMakulabo={key:date+':'+v+':'+r,rows:data.last50ByBoat};
   updateRecent50Compare();
  updatePositionHeatmap();
  const updated=syncVerifiedMakulaboComparison();renderExperimental100PointPrediction();
  status.textContent='まくらぼ6艇の取得・照合成功。選手比較表への反映：'+updated+'/6艇。'+(lastComparisonPrediction?.key===date+':'+v+':'+r?'右側の「公式直前情報＋まくらぼ（取得時）の予想」を再計算しました。公式直前情報が不足する場合は保留を表示します。':'続けて「このレースを予想」を押すと、取得済みの公式直前情報と組み合わせて右側に試算します。')+(updated===0?'比較表の行数：'+document.getElementById('comparisonBody').querySelectorAll('tr').length+'。表示中の艇番と取得データの照合を確認してください。':'');
 }catch(e){if(token===makulaboSearchToken)status.textContent='自動検索に失敗しました：'+(e.name==='TimeoutError'?'65秒以内に取得・公式照合が完了しませんでした':'通信エラー（'+String(e.message||e).slice(0,80)+'）');}
 finally{if(token===makulaboSearchToken)this.disabled=false;}
};
for(const el of [day,venue,race])el.addEventListener('change',()=>{makulaboSearchToken++;verifiedMakulabo=null;manualMakulabo=null;document.getElementById('makulaboSearchResult').replaceChildren();document.getElementById('makulaboSearchStatus').textContent='';document.getElementById('searchMakulaboInBoatScore').disabled=false;updateCombinedPredictionPanel();});

let scheduleRequest=0,raceListRequest=0,scheduleController=null,raceListController=null;
async function refreshRunningVenues(){
 const token=++scheduleRequest,st=document.getElementById('scheduleStatus'),out=document.getElementById('scheduleOutput');
 if(scheduleController)scheduleController.abort();scheduleController=new AbortController();const controller=scheduleController;
 const selected=venue.value;st.textContent='公式開催場を照合中（競艇場の切り替えはいつでも可能）…';out.textContent='';
 const verified=new Set(),errors=[];let offset=0;
 for(let page=0;page<24;page++){
  if(token!==scheduleRequest||controller.signal.aborted)return;
  try{
   const response=await Promise.race([
    fetch('/api/official/active-venues?date='+dateCode()+'&offset='+offset,{signal:AbortSignal.any([controller.signal,AbortSignal.timeout(9000)])}),
    new Promise((_,reject)=>setTimeout(()=>reject(new Error('client_watchdog_timeout')),10500))
   ]);
   if(!response.ok)throw Error('HTTP '+response.status);
   const data=await response.json();
   if(token!==scheduleRequest)return;
   for(const v of data.verifiedVenues||[])if(Number.isInteger(v)&&v>=1&&v<=24)verified.add(v);
   for(const check of data.checks||[])if(check.status!=='race1_entry_verified')errors.push(names[check.venue-1]+': '+(check.reason||'未確認'));
   offset=data.nextOffset;
  }catch(e){if(token!==scheduleRequest||controller.signal.aborted)return;errors.push(names[offset]+': '+String(e.message||e));offset++;}
  st.textContent='公式1R照合 '+Math.min(offset??24,24)+'/24場／確認済み '+verified.size+'場（未確認 '+errors.length+'場）';
  out.textContent='確認済み：'+([...verified].sort((a,b)=>a-b).map(v=>names[v-1]).join('、')||'なし')+'\\n未確認：'+errors.slice(-6).join('／');
  if(offset==null)break;
 }

 if(token!==scheduleRequest)return;
 // Official 1R checks are not proof that every other venue is closed.
 // Highlight verified venues without removing unverified choices.
 for(const option of venue.options){if(!option.value)continue;const code=Number(option.value);option.textContent=names[code-1]+(verified.has(code)?' ✓':'');}
 st.textContent='公式1R照合済み '+verified.size+'場'+(errors.length?'／一部取得失敗':'')+'。✓は確認済み、無印は未確認（非開催とは限りません）。';
 if(!verified.size)out.textContent+='\\n開催場の一括確認はできませんでした。競艇場は手動で選択できます。';
}
let raceDataRequest=0,raceDataController=null;
// Browser-only cache of verified race cards, scoped to exact date/venue/race. Never cache missing statistics.
const previewRaceCardCache=new Map();
function getPreviewRaceCard(key){const entry=previewRaceCardCache.get(key);if(!entry)return null;const now=Date.now(),deadline=Date.parse(entry.data?.deadlineAt||'');const today=new Date(now+9*3600000).toISOString().slice(0,10).replace(/-/g,'');if(now-entry.savedAt>=120000||now<entry.savedAt||(key.split(':')[0]===today&&(!Number.isFinite(deadline)||now>=deadline-15*60000))){previewRaceCardCache.delete(key);return null;}return entry;}
function savePreviewRaceCard(key,data){if(data?.source==='morning_saved')return;if(data?.racersVerified!==true||data?.statsVerified!==true||data.racersByBoat?.length!==6||data.statsByBoat?.length!==6||new Set(data.racersByBoat.map(x=>x.boat)).size!==6||!data.statsByBoat.every(x=>data.racersByBoat.some(r=>r.boat===x.boat&&String(r.racerId)===String(x.racerId))))return;if(previewRaceCardCache.size>=24)previewRaceCardCache.delete(previewRaceCardCache.keys().next().value);previewRaceCardCache.set(key,{savedAt:Date.now(),data});}
let previewCardPending=null;
function cancelPreviewCard(){if(previewCardPending){previewCardPending.controller.abort();previewCardPending=null;}}
function requestPreviewCard(key,urlBase){const cached=getPreviewRaceCard(key);if(cached)return Promise.resolve({data:cached.data,cached:true});if(previewCardPending?.key===key)return previewCardPending.promise;cancelPreviewCard();const controller=new AbortController();const entry={key,controller,promise:null};entry.promise=(async()=>{try{const response=await fetch('/api/official/racers-only'+urlBase,{signal:AbortSignal.any([controller.signal,AbortSignal.timeout(26000)])});if(!response.ok)throw Error('公式出走表 HTTP '+response.status);const data=await response.json();if(!controller.signal.aborted)savePreviewRaceCard(key,data);return {data,cached:false};}catch(error){return {error};}finally{if(previewCardPending===entry)previewCardPending=null;}})();previewCardPending=entry;return entry.promise;}
function prefetchSelectedCard(){if(!day.value||!venue.value||!race.value||venue.disabled||race.disabled)return;const key=dateCode()+':'+venue.value+':'+race.value;const params='?'+new URLSearchParams({date:dateCode(),venue:venue.value,race:race.value});void requestPreviewCard(key,params);}
function clearRaceDisplay(){cancelPreviewCard();document.getElementById('beforeinfoStatus').textContent='直前情報：未取得。選択レースの公式情報を確認してください。';raceDataRequest++;if(raceDataController){raceDataController.abort();raceDataController=null;}document.getElementById('load').disabled=false;document.getElementById('comparisonBody').replaceChildren();document.getElementById('finishRateSummary').textContent='選択中のレースの公式データは未確認です';document.getElementById('racerPoints').textContent='レースを選んで公式データを確認してください';document.getElementById('output').textContent='';document.getElementById('status').textContent='';}
day.addEventListener('change',()=>{scheduleRequest++;if(scheduleController){scheduleController.abort();scheduleController=null;}document.getElementById('scheduleOutput').textContent='';if(venue.value)refreshVerifiedRaces();else resetRaceChoices();document.getElementById('scheduleStatus').textContent='日付を変更しました。選択日の公式レース一覧を再確認します。';});
race.addEventListener('change',()=>{clearRaceDisplay();prefetchSelectedCard();});

// Race selection is independent of the official site's availability.
// Prediction endpoints still require verified official six-racer data.
async function refreshVerifiedRaces(){
 raceListRequest++;
 if(raceListController){raceListController.abort();raceListController=null;}
 clearRaceDisplay();
 race.replaceChildren(new Option('レースを選択',''));
 if(!venue.value){race.disabled=true;return;}
 for(let n=1;n<=12;n++)race.add(new Option(n+'R',String(n)));
 race.disabled=false;
 document.getElementById('status').textContent='1〜12Rを選択できます。レース選択は開催・出走表の確認を意味しません。予想時に公式6艇の情報を照合し、未確認なら予想を保留します。';
}
function resetRaceChoices(){
 raceListRequest++;
 if(raceListController){raceListController.abort();raceListController=null;}
 clearRaceDisplay();race.replaceChildren(new Option('レースを選択',''));
 race.disabled=true;
 document.getElementById('status').textContent='';
}
venue.addEventListener('change',()=>{if(!venue.value){resetRaceChoices();return;}refreshVerifiedRaces();});
function formatVenueRanking(data){
 if(!data||!data.categories||typeof data.categories!=='object')return null;
 const labels={main:'本命候補',upset:'穴候補',chaos:'大荒れ候補'};
 const lines=['【選択場の暫定分析】','対象日: '+String(data.date||'未確認')+' / 場コード: '+String(data.venue??'未確認'),
 '照合: '+String(data.scanned??'未確認')+'R / 評価可能: '+String(data.eligible??'未確認')+'R / 保留: '+String(data.held??'未確認')+'R',
 '※暫定スコアであり、的中確率ではありません。'];
 for(const key of ['main','upset','chaos']){
  const rows=Array.isArray(data.categories[key])?data.categories[key]:[];
  lines.push('', '【'+labels[key]+'】');
  if(!rows.length){lines.push('候補なし');continue;}
  rows.slice(0,20).forEach((x,i)=>{
   const n=Number(x.race);
   const score=Number(x.score);
   lines.push((i+1)+'位  '+(Number.isInteger(n)&&n>=1&&n<=12?n+'R':'レース未確認')+
    ' / 暫定スコア '+(Number.isFinite(score)?score.toFixed(2):'未確認')+
    ' / 予想順位 '+(Array.isArray(x.predictedOrder)&&x.predictedOrder.length===6&&new Set(x.predictedOrder).size===6&&x.predictedOrder.every(b=>Number.isInteger(b)&&b>=1&&b<=6)?x.predictedOrder.join('-'):'未確認'));
  });
 }
 return lines.join('\n');
}
async function show(url,statusId,outId,button){const status=document.getElementById(statusId),out=document.getElementById(outId);button.disabled=true;status.textContent='公式情報を確認中…';out.textContent='';try{const res=await fetch(url);const data=await res.json();if(!res.ok)throw Error(data.error||'HTTP '+res.status);status.textContent='取得完了（未確認項目は推測しません）';out.textContent=outId==='screenOutput'?(formatVenueRanking(data)||JSON.stringify(data,null,2)):JSON.stringify(data,null,2)}catch(e){status.textContent='取得できませんでした: '+e.message}finally{button.disabled=false}}
const morningCacheKey=date=>'boat-score-morning-'+date;
let morningSavedController=null;
let morningViewGeneration=0;
function restoreMorningSnapshot(){const out=document.getElementById('morningOutput'),st=document.getElementById('morningStatus');try{const raw=localStorage.getItem(morningCacheKey(dateCode()));if(!raw){out.textContent='';st.textContent='この日の保存済み集計はありません';return;}const data=JSON.parse(raw);if(data.date!==dateCode()||typeof data.text!=='string')throw Error('invalid');out.textContent=data.text;st.textContent='端末保存の事前評価：'+new Date(data.savedAt).toLocaleString('ja-JP')+'（'+(data.complete?'完了':'途中')+'・最新データではありません）';}catch(e){out.textContent='';st.textContent='保存結果を読み込めません';}}
document.getElementById('day').addEventListener('change',restoreMorningSnapshot);
restoreMorningSnapshot();
document.getElementById('morningSaved').onclick=async function(){const st=document.getElementById('morningStatus'),out=document.getElementById('morningOutput');if(morningSavedController)morningSavedController.abort();if(nationalMorningController)nationalMorningController.abort();const controller=new AbortController(),requestedDate=dateCode(),generation=++morningViewGeneration;morningSavedController=controller;const active=()=>!controller.signal.aborted&&generation===morningViewGeneration&&requestedDate===dateCode();this.disabled=true;document.getElementById('morningLinks').replaceChildren();document.getElementById('morningRankingStatus').textContent='保存ランキング確認中…';st.textContent='サーバー保存結果を確認中…';try{const res=await fetch('/api/morning/snapshot?date='+requestedDate,{signal:AbortSignal.any([controller.signal,AbortSignal.timeout(12000)])});const d=await res.json();if(!active())return;if(!res.ok)throw Error(d.message||d.error||'HTTP '+res.status);if(d.date!==requestedDate)throw Error('保存日が一致しません');const lines=['朝8時のサーバー保存結果','更新: '+(d.updatedAt||'未確認'),'状態: '+d.status,'確認済み: '+d.completedVenues.length+'場 / 対象: '+d.venues.length+'場','取得済み評価レース: '+(d.eligible||0)+'R','取得失敗: '+(d.failedVenues||[]).length+'場 / 再試行上限: '+(d.exhaustedVenues||[]).length+'場','公式日程: '+(d.scheduleLastCheck==='verified'?'取得確認済み':d.scheduleLastCheck==='reused_previous_verified_schedule'?'以前の確認済み日程を使用':'未確認'),'各場の取得済みレース数: '+Object.entries(d.verifiedRacesByVenue||{}).map(([v,n])=>v+'場 '+n+'/12R').join(' / '),'予想は暫定方式（検証前）','締切前の保存証拠：'+(d.evidence?.verifiedRecords??'未確認')+'R / 証拠不足：'+(d.evidence?.unverifiedRecords??'未確認')+'R'];for(const [key,label] of [['main','本命'],['upset','穴'],['chaos','大荒れ'],['boatOne','1号艇1着期待度（仮順位）']]){const rows=key==='boatOne'?(d.boatOneRanking||[]):(d.categories?.[key]||[]);lines.push(label+' TOP '+rows.length+'：'+(rows.length?rows.map((x,i)=>(i+1)+'. '+(names[Number(x.venue)-1]||x.venue+'場')+' '+x.race+'R').join(' / '):'該当なし'));}out.textContent=lines.join('\n');const links=document.getElementById('morningLinks');links.replaceChildren();const title=document.createElement('p');title.textContent='保存日：'+String(d.date).slice(0,4)+'/'+String(d.date).slice(4,6)+'/'+String(d.date).slice(6,8)+'　各レースを押すと予想画面へ移動します。';links.appendChild(title);const evidenceNotice=document.createElement('small');evidenceNotice.textContent='締切前の保存確認：'+(d.evidence?.verifiedCandidates??'未確認')+'件 ／ 証拠不足：'+(d.evidence?.unverifiedCandidates??'未確認')+'件。証拠不足は的中率検証に使用しません。';links.appendChild(evidenceNotice);for(const [key,label] of [['main','本命が来やすい予想'],['upset','本命以外が来そうな予想'],['chaos','荒れて予想しにくいレース'],['boatOne','1号艇1着期待度ランキング（研究用）']]){const rows=key==='boatOne'?(d.boatOneRanking||[]):(d.categories?.[key]||[]);const section=document.createElement('section');section.style.cssText='margin:12px 0;padding:12px;border:1px solid #64748b;border-radius:10px';const heading=document.createElement('h3');heading.textContent=label+' TOP '+rows.length+' / 20';section.appendChild(heading);if(key==='boatOne'){const note=document.createElement('small');note.textContent='1号艇と他艇最高評価点との差で順位付け。勝率の実測・確率ではありません。締切前の保存済み6艇評価のみ。';section.appendChild(note);}if(!rows.length){const empty=document.createElement('p');empty.textContent='公式確認済みの対象レースがありません';section.appendChild(empty);}links.appendChild(section);for(const [rankIndex,item] of rows.entries()){const v=Number(item.venue),r=Number(item.race);if(!Number.isInteger(v)||v<1||v>24||!Number.isInteger(r)||r<1||r>12)continue;const b=document.createElement('button');b.type='button';b.textContent=(rankIndex+1)+'位  '+(names[v-1]||v+'場')+' '+r+'R'+(key==='boatOne'&&Number.isFinite(item.score)?' ／ 評価差 '+(item.score>=0?'+':'')+item.score.toFixed(2):'');b.style.cssText='display:block;width:100%;margin:6px 0;padding:10px;text-align:left;min-height:42px';b.onclick=async()=>{clearSelectedPrediction();const status=document.getElementById('predictStatus');day.value=String(item.date).slice(0,4)+'-'+String(item.date).slice(4,6)+'-'+String(item.date).slice(6,8);venue.value=String(v);status.textContent=b.textContent+' の公式レース一覧を確認しています…';await refreshVerifiedRaces();if(venue.value!==String(v)||dateCode()!==String(item.date))return;const choice=Array.from(race.options).find(o=>o.value===String(r));if(!choice){status.textContent=b.textContent+' は現在公式確認できないため、予想対象に選択できません。';return;}race.value=String(r);race.dispatchEvent(new Event('change'));document.querySelector('#previewTabs button[data-panel=racePanel]').click();status.textContent='選択済み：'+b.textContent+'。予想ボタンを押してください。';document.getElementById('predictSelected').scrollIntoView({behavior:'smooth',block:'center'});};section.appendChild(b);}}st.textContent=d.status==='completed'?'サーバー集計完了':'サーバー集計途中（または未確認）';document.getElementById('morningRankingStatus').textContent='保存日：'+d.date+' ／ '+(d.status==='completed'?'集計完了':'集計途中・未確認')+' ／ 対象 '+(d.eligible||0)+'R';}catch(e){if(!active())return;st.textContent='保存結果を表示できません: '+e.message;document.getElementById('morningRankingStatus').textContent='保存ランキングを取得できません：'+e.message;document.getElementById('morningLinks').replaceChildren();}finally{if(morningSavedController===controller){morningSavedController=null;this.disabled=false;}}};
// Show the server's saved morning ranking automatically; never trigger expensive recalculation on page load.
queueMicrotask(()=>document.getElementById('morningSaved').click());
day.addEventListener('change',()=>{if(morningSavedController)morningSavedController.abort();if(nationalMorningController)nationalMorningController.abort();const b=document.getElementById('morningSaved');b.disabled=false;b.click();});
let nationalMorningController=null;
document.getElementById('morningNational').onclick=async function(){
 const button=this,st=document.getElementById('morningStatus'),out=document.getElementById('morningOutput');
 if(nationalMorningController){nationalMorningController.abort();return;}
 const controller=new AbortController(),requestedDate=dateCode(),generation=++morningViewGeneration;nationalMorningController=controller;if(morningSavedController)morningSavedController.abort();const active=()=>generation===morningViewGeneration&&requestedDate===dateCode();
 button.textContent='全国集計を中止';out.textContent='';st.textContent='開催場候補を確認中…';
 const grouped={main:[],upset:[],chaos:[]},failures=[],results=[];
 const labels={main:'本命',upset:'穴',chaos:'大荒れ'};
 const render=()=>{if(!active())return;const lines=['全国事前評価（暫定・未検証）','取得成功 '+results.length+'場／取得失敗 '+failures.length+'場'];
 for(const key of ['main','upset','chaos']){const top=grouped[key].slice().sort((a,b)=>b.score-a.score||a.venue-b.venue||a.race-b.race).slice(0,20);
 lines.push(labels[key]+' TOP '+top.length+'：'+(top.length?top.map((x,j)=>(j+1)+'. '+(names[Number(x.venue)-1]||x.venue+'場')+' '+x.race+'R').join(' / '):'確認できた候補なし'));}
 if(failures.length)lines.push('未取得: '+failures.join('、'));out.textContent=lines.join('\n');try{localStorage.setItem(morningCacheKey(requestedDate),JSON.stringify({date:requestedDate,savedAt:new Date().toISOString(),complete:false,text:out.textContent}));}catch(e){} };
 try{
 const found=new Set();let offset=0,partial=false;
 do{
  const response=await fetch('/api/morning/venues?date='+requestedDate+'&offset='+offset,{signal:AbortSignal.any([controller.signal,AbortSignal.timeout(13000)])});
  const schedule=await response.json();if(!active())return;if(!response.ok)throw Error(schedule.message||'開催場候補を確認できません');
  for(const v of schedule.venues||[])found.add(v);
  partial=schedule.status==='partial_verified_race1_fallback';
  offset=partial&&schedule.nextOffset!=null?schedule.nextOffset:null;
  st.textContent='公式1R確認 '+(offset==null?24:offset)+'/24場／確認済み '+found.size+'場';
 }while(offset!=null&&!controller.signal.aborted);
 const venues=[...found];if(!venues.length)throw Error('確認できた開催場はありません。未確認の場が非開催とは限りません。');
 let next=0,done=0;
 const worker=async()=>{while(next<venues.length&&!controller.signal.aborted){
 const v=venues[next++];
 try{const res=await fetch('/api/daily/verified-venue-screen?date='+requestedDate+'&venue='+v,{signal:AbortSignal.any([controller.signal,AbortSignal.timeout(90000)])});
 const d=await res.json();if(!active())return;if(!res.ok)throw Error(d.error||'HTTP '+res.status);
 results.push(d);for(const key of ['main','upset','chaos'])for(const item of d.categories?.[key]||[])grouped[key].push(item);
 }catch(e){if(controller.signal.aborted)return;failures.push(v+'場: '+e.message);}
 if(!active())return;done++;st.textContent='全国照合 '+done+'/'+venues.length+'場（成功 '+results.length+'場）';render();
 }};
 await Promise.all(Array.from({length:Math.min(3,venues.length)},()=>worker()));
 if(!active())return;if(controller.signal.aborted){st.textContent='集計を中止しました。取得済みの結果のみ表示';}
 else st.textContent='全国候補の集計終了（端末に保存・朝8時の自動実行は未実装）';
 render();try{localStorage.setItem(morningCacheKey(requestedDate),JSON.stringify({date:requestedDate,savedAt:new Date().toISOString(),complete:!controller.signal.aborted&&failures.length===0,text:out.textContent}));}catch(e){}
 }catch(e){if(active())st.textContent=controller.signal.aborted?'集計を中止しました':'全国集計できません: '+e.message;}
 finally{if(nationalMorningController===controller){nationalMorningController=null;button.textContent='全国の開催候補を集計';}}
};
document.getElementById('morningVenue').onclick=async function(){const st=document.getElementById('morningStatus'),out=document.getElementById('morningOutput');if(!venue.value){st.textContent='先に競艇場を選択してください';return;}const requestedDate=dateCode(),requestedVenue=venue.value,generation=++morningViewGeneration;const active=()=>generation===morningViewGeneration&&requestedDate===dateCode()&&requestedVenue===venue.value;if(morningSavedController)morningSavedController.abort();if(nationalMorningController)nationalMorningController.abort();this.disabled=true;st.textContent='選択場の12レースを公式照合中（時間がかかる場合があります）…';out.textContent='';try{const res=await fetch('/api/daily/verified-venue-screen?date='+requestedDate+'&venue='+encodeURIComponent(requestedVenue),{signal:AbortSignal.timeout(110000)});const d=await res.json();if(!active())return;if(!res.ok)throw Error(d.error||'HTTP '+res.status);st.textContent='照合 '+(d.scanned||0)+'R／評価可能 '+(d.eligible||0)+'R／未確認 '+(d.held||0)+'R';const labels={main:'本命候補',upset:'穴候補',chaos:'大荒れ候補'};let lines=['事前評価（未検証の暫定方式・朝8時の保存結果ではありません）'];for(const key of ['main','upset','chaos']){const rows=d.categories?.[key]||[];lines.push(labels[key]+': '+(rows.length?rows.map(x=>x.race+'R').join('、'):'評価可能な候補なし'));}for(const rec of d.records||[]){if(!rec.ready)continue;const picks=rec.picks||{};lines.push(rec.race+'R 買い目候補（検証前） '+JSON.stringify(picks));}out.textContent=lines.join('\n');}catch(e){if(active())st.textContent='事前評価できません: '+e.message;}finally{this.disabled=false;}};
document.getElementById('morningCheck').onclick=async function(){const st=document.getElementById('morningStatus'),out=document.getElementById('morningOutput');const requestedDate=dateCode(),generation=++morningViewGeneration;const active=()=>generation===morningViewGeneration&&requestedDate===dateCode();if(morningSavedController)morningSavedController.abort();if(nationalMorningController)nationalMorningController.abort();st.textContent='公式日程を照合中…';out.textContent='';this.disabled=true;try{const res=await fetch('/api/morning/venues?date='+requestedDate,{signal:AbortSignal.timeout(15000)});const data=await res.json();if(!active())return;if(!res.ok)throw Error(data.message||data.error||'HTTP '+res.status);st.textContent='開催候補 '+data.venueCount+'場／予想は未作成';out.textContent='場コード: '+data.venues.join('、')+'\n'+data.message;}catch(e){if(active())st.textContent='開催場を確認できません: '+e.message;}finally{this.disabled=false}};
document.getElementById('schedule').onclick=refreshRunningVenues;
let selectedPredictionController=null;
let twelvePredictionController=null;
function resetPredictionPanels(){
 lastComparisonPrediction=null;
 document.getElementById('experimental100PointPrediction')?.remove();
 document.getElementById('predictOutput').textContent='';
 document.getElementById('recent50CompareOutput').textContent='選択レースの予想を実行してください。';
 document.getElementById('positionHeatmapOutput').textContent='選択レースの予想を実行してください。';
 updateCombinedPredictionPanel();
 updateCompactPredictions();
}
function clearSelectedPrediction(){
 if(twelvePredictionController){twelvePredictionController.abort();twelvePredictionController=null;}
 document.getElementById('predictTwelveMethods').disabled=false;
 document.getElementById('twelveMethodOutput').textContent='';
 document.getElementById('twelveMethodStatus').textContent='選択レースの12方式予想を実行してください。';
 resetTrialConditions();
 resetPredictionPanels();
 if(selectedPredictionController){selectedPredictionController.abort();selectedPredictionController=null;}
 const button=document.getElementById('predictSelected');
 button.disabled=false;
 document.getElementById('predictOutput').textContent='';document.getElementById('combinedPredictionOutput').textContent='予想を実行してください。まくらぼ未取得でも、照合済み公式直前情報があれば表示します。';
 document.getElementById('predictStatus').textContent='選択内容が変更されました。新しいレースで予想を実行してください。';
}
day.addEventListener('change',clearSelectedPrediction);
venue.addEventListener('change',clearSelectedPrediction);
function updateVenueTraits(){
 const out=document.getElementById('venueTraitsText'),link=document.getElementById('venueTraitsLink');
 if(!out||!link)return;
 const v=Number(venue.value);
 if(!Number.isInteger(v)||v<1||v>24){out.textContent='開催場を選択してください。';link.href='https://www.boatrace.jp/owpc/pc/extra/data/index.html';return;}
 const traits={1:'冬季は赤城おろしの強風が吹くことがある。',2:'水面幅が狭く、1コースの1着率は比較的低い。',3:'河川水面で潮位の変化の影響を受ける。',4:'まくりが効く水面として公式ガイドで紹介。',11:'まくりが効く水面として公式ガイドで紹介。',12:'インが強い傾向として公式ガイドで紹介。',22:'第1ターンマーク付近にうねりが生じることがある。',24:'インが強い傾向として公式ガイドで紹介。'};
 out.textContent=names[v-1]+'\n'+(traits[v]||'個別の水面特性は未登録。公式データでご確認ください。')+'\n※一般的な参考情報です。当日の条件や着順を示すものではありません。';
 link.href='https://www.boatrace.jp/owpc/pc/data/stadium?jcd='+String(v).padStart(2,'0');
}
venue.addEventListener('change',updateVenueTraits);
updateVenueTraits();

race.addEventListener('change',clearSelectedPrediction);
document.getElementById('predictTwelveMethods').onclick=async function(){
 const status=document.getElementById('twelveMethodStatus'),out=document.getElementById('twelveMethodOutput');
 if(!day.value||!venue.value||!race.value){status.textContent='開催日・競艇場・レースを選択してください。';return;}
 if(twelvePredictionController)twelvePredictionController.abort();const controller=new AbortController(),date=dateCode(),v=venue.value,r=race.value;twelvePredictionController=controller;const active=()=>!controller.signal.aborted&&twelvePredictionController===controller&&date===dateCode()&&v===venue.value&&r===race.value;
 this.disabled=true;status.textContent='公式成績・進入・展示情報を確認しています…';out.textContent='';
 try{const params=new URLSearchParams({date,venue:v,race:r});const response=await fetch('/api/predict/independent-methods?'+params,{signal:AbortSignal.any([controller.signal,AbortSignal.timeout(45000)])});const data=await response.json();if(!active())return;if(!response.ok)throw Error(data.error||data.reason||'HTTP '+response.status);
 if(!data.ready){status.textContent='入力不足で表示を保留しました：'+(data.reason||'公式情報未確認');return;}
 const labels={'favorite-1':'本命1 能力順','favorite-2':'本命2 平均ST順','favorite-3':'本命3 コース補正','favorite-4':'本命4 モーター順','favorite-5':'本命5 展示タイム順','favorite-6':'本命6 まくらぼ50走順','upset-1':'穴1 能力首位を2着','upset-2':'穴2 能力首位を3着','upset-3':'穴3 能力首位を外す','upset-4':'穴4 外コース1着','upset-5':'穴5 モーター逆転','upset-6':'穴6 展示タイム逆転'};
 out.textContent=Object.entries(data.methods||{}).map(([id,item])=>labels[id]+'：'+(item.status==='predicted'?item.trifecta.join('-'):'保留（'+(item.reason||'必要情報不足')+'）')).join('\n')+'\n\n方式版：'+data.version+'\n公式成績 '+(data.inputStatus.officialStats?'確認済':'未確認')+' / 進入 '+(data.inputStatus.entryCourses?'確認済':'未確認')+' / 展示 '+(data.inputStatus.exhibition?'確認済':'未確認')+' / まくらぼ50走 未取得\n'+data.note;
 status.textContent='12方法の結果を表示しました。保留方法は必要データがありません。';
 }catch(error){if(active())status.textContent='12方法を表示できませんでした：'+error.message;}finally{if(twelvePredictionController===controller){twelvePredictionController=null;this.disabled=false;}}
};
document.getElementById('predictSelected').onclick=async function(){
 const st=document.getElementById('predictStatus'),out=document.getElementById('predictOutput');
 if(!day.value||!venue.value||!race.value){st.textContent='開催日・競艇場・レースを選択してください';return;}
 if(selectedPredictionController)selectedPredictionController.abort();
 const controller=new AbortController();selectedPredictionController=controller;resetPredictionPanels();this.disabled=true;out.textContent='';st.textContent='選択レースの公式6艇・勝率・モーター成績を照合中…';
 const date=dateCode(),v=venue.value,r=race.value;
 try{const res=await fetch('/api/predict/selected-race?date='+date+'&venue='+v+'&race='+r+'&mode=beforeinfo',{signal:AbortSignal.any([controller.signal,AbortSignal.timeout(55000)])});
 const d=await res.json();if(controller.signal.aborted||date!==dateCode()||v!==venue.value||r!==race.value)return;
 if(!res.ok)throw Error(d.error||'HTTP '+res.status);
 if(!d.ready){st.textContent='データ不足のため予想を保留: '+(d.reason||'確認できません');out.textContent='未確認情報を推測で補いません。';return;}
 const validPicks=rows=>Array.isArray(rows)&&rows.length===6&&rows.every(x=>Array.isArray(x)&&x.length===3&&x.every(n=>Number.isInteger(n)&&n>=1&&n<=6)&&new Set(x).size===3)&&new Set(rows.map(x=>x.join('-'))).size===6;
 if(!validPicks(d.main)||!validPicks(d.upset)){st.textContent='買い目の形式を検証できないため表示を保留しました';out.textContent='三連単6点ずつの艇番・重複を確認できません。';return;}
 const fmt=rows=>Array.isArray(rows)?rows.map((x,i)=>(i+1)+'. '+(Array.isArray(x)?x.join('-'):'形式未確認')).join('\n'):'取得できません';
 const inputNames={local:'当地勝率',placeRates:'全国2連対率・3連対率',last50:'まくらぼ直近50走',course:'進入・コース',exhibition:'展示タイム',start:'展示ST',weather:'風・波'};
 const missing=Array.isArray(d.missingInputs)?d.missingInputs.map(x=>inputNames[x]||x):[];
 const exhibitionNote=d.exhibitionAdjustmentApplied===true?'公式6艇の展示タイムを確認し、予想点数に小幅反映しました。':'展示タイムの予想反映なし（'+(d.exhibitionVerification||'未確認')+'）。';
 const startReason={official_average_st_unverified:'展示STのF・Lに代用する公式平均STを確認できないため、ST補正は行いません。',non_numeric_start_timing:'展示STにF・Lなどが含まれるため、数値STの一括補正は行いません（本番の失格扱いではありません）。',six_verified_start_rows_required:'展示STを6艇分確認できないため補正なし。',invalid_start_course_rows:'展示ST・進入の艇番照合ができないため補正なし。',not_requested:'直前情報の取得は未実施。'};
 const startNote=d.startAdjustmentApplied===true?'公式6艇の展示STを確認し、数値STを予想点数に小幅反映しました。進入は確認のみで点数には未反映です。':(startReason[d.startVerification]||'展示STの予想反映なし（'+(d.startVerification||'未確認')+'）。');
 const stSubstitutions=Array.isArray(d.averageSTSubstitutions)?d.averageSTSubstitutions:[];
 const stSubstitutionNote=stSubstitutions.length?'\n公式平均STで代用：'+stSubstitutions.map(x=>x.boat+'号艇 '+x.original+' → '+x.averageST.toFixed(2)).join('、'):'';
 lastComparisonPrediction={key:date+':'+v+':'+r,data:d};
  updateRecent50Compare();
  updatePositionHeatmap();
  const recent50=recent50SupplementForSelection();
 const recent50Note=recent50?'【まくらぼ直近50走・参考加点（最大10点、買い目未反映）】\n'+recent50.map(x=>x.boat+'号艇 '+x.runs+'走 / 1着率 '+x.winRate.toFixed(1)+'% / '+x.points.toFixed(2)+'点').join('\n'):'【まくらぼ直近50走】\nこのレースの照合済みデータはありません。参考加点は未算出です。';
 const recent50Comparison=recent50?(()=>{
  const sorted=[...recent50].sort((a,b)=>b.points-a.points||a.boat-b.boat);
  const firstChoice=Array.isArray(d.main)&&d.main.length?String(d.main[0]).split(/[^1-6]+/).filter(Boolean)[0]:null;
  return '【従来予想と直近50走の比較（検証用・買い目変更なし）】\n'
   +'直近50走の1着率順位：'+sorted.map(x=>x.boat+'号艇('+x.winRate.toFixed(1)+'%)').join(' ＞ ')+'\n'
   +'従来本命1点目の1着艇：'+(firstChoice?firstChoice+'号艇':'未確認')+'\n'
   +(firstChoice&&Number(firstChoice)!==sorted[0].boat?'※従来予想の軸と50走の首位が異なります。要検証。':'※50走は参考指標であり、コース別成績を確認するまで自動補正しません。')
   +'\n※50走の1着率はコース別の1着率ではありません。';
 })():'【直近50走との比較】\n照合済み6艇がないため比較を保留します。';
 const base=d.basePrediction;
 const comparison=base&&validPicks(base.main)&&validPicks(base.upset)?'【同じ時点の基礎予想との比較】\n本命6点：'+(JSON.stringify(base.main)===JSON.stringify(d.main)?'変化なし':'変化あり')+'\n穴6点：'+(JSON.stringify(base.upset)===JSON.stringify(d.upset)?'変化なし':'変化あり')+'\n※朝8時保存分との比較ではありません。':'基礎予想との比較は未確認です。';
 out.textContent=names[Number(v)-1]+' '+r+'R（'+date+'）\n\n【本命 6点】\n'+fmt(d.main)+'\n\n【穴 6点】\n'+fmt(d.upset)+'\n\n【取得状況】\n展示タイム：'+(d.exhibitionAdjustmentApplied===true?'反映済み':'未反映')+' ／ 展示ST：'+(d.startAdjustmentApplied===true?'反映済み':'未反映')+'\nまくらぼ50走：'+(recent50?'6艇照合済み（右側で別試算）':'未取得')+'\n※暫定予想。未確認情報を補完していません。';
 renderExperimental100PointPrediction();
 st.textContent='選択レースの暫定予想を表示しました（的中保証なし）';
 }catch(e){if(!controller.signal.aborted)st.textContent='予想を取得できません: '+e.message;}
 finally{if(selectedPredictionController===controller){selectedPredictionController=null;this.disabled=false;}}
};
document.getElementById('load').onclick=async function(){const notice=document.getElementById('status');notice.textContent='読み込み操作を受け付けました。入力を確認中…';if(!day.value||!venue.value||venue.disabled||race.disabled||!race.value){notice.textContent='開催日・競艇場・レース番号を選択してください。';return;}if(raceDataController)raceDataController.abort();const token=++raceDataRequest,controller=new AbortController(),selectedDate=dateCode(),selectedVenue=venue.value,selectedRace=race.value;raceDataController=controller;const b=this,p=document.getElementById('racerPoints'),tbody=document.getElementById('comparisonBody'),finish=document.getElementById('finishRateSummary');p.textContent='選手・モーター情報を確認中…';finish.textContent='公式データを照合中…';tbody.textContent='';b.disabled=true;let d={};const urlBase='?date='+selectedDate+'&venue='+selectedVenue+'&race='+selectedRace;const loadStarted=performance.now();const beforeTask=fetch('/api/official/beforeinfo'+urlBase,{signal:AbortSignal.any([controller.signal,AbortSignal.timeout(32000)])}).then(response=>({response,elapsed:performance.now()-loadStarted}),error=>({error,elapsed:performance.now()-loadStarted}));try{
 const cacheKey=selectedDate+':'+selectedVenue+':'+selectedRace;const card=await requestPreviewCard(cacheKey,urlBase);if(card.error)throw card.error;const cachedCard=card.cached;d=card.data;
 if(d.racersVerified!==true)throw Error('公式出走表を確認できません：'+(d.diagnostics?.reason||'未確認'));
 if(token!==raceDataRequest||selectedDate!==dateCode()||selectedVenue!==venue.value||selectedRace!==race.value)return;document.getElementById('status').textContent='出走表取得 '+((performance.now()-loadStarted)/1000).toFixed(2)+'秒。 '+(cachedCard?'2分以内の取得済み公式出走表を再表示。直前情報は別途確認中。 ':'')+(d.racersVerified===true?(d.statsVerified===true?'公式出走表・6艇成績取得成功':'公式出走表取得成功／6艇成績は未確認'):'公式出走表を確認できません：'+(d.officialReason||d.reason||JSON.stringify(d.missingInputs||[])||'理由不明'));document.getElementById('output').textContent='【平均ST解析診断（艇番・元データ・結果）】\n'+JSON.stringify(d.diagnostics?.averageSTParseDiagnostics||d.averageSTParseDiagnostics||[],null,2)+'\n\n【公式取得結果の全体】\n'+JSON.stringify(d,null,2)}catch(err){if(token!==raceDataRequest)return;document.getElementById('status').textContent='取得できませんでした: '+err.message;d={}}finally{if(raceDataController===controller){b.disabled=false}}if(token!==raceDataRequest)return;const racers=d.racersVerified===true&&Array.isArray(d.racersByBoat)?d.racersByBoat:[],stats=d.statsVerified===true&&Array.isArray(d.statsByBoat)?d.statsByBoat:[],ex=d.exhibitionVerified===true&&Array.isArray(d.exhibitionByBoat)?d.exhibitionByBoat:[],starts=d.startVerified===true&&Array.isArray(d.startByCourse)?d.startByCourse:[];const fmt=v=>v===null||v===undefined||v===''?'未確認':String(v);for(let i=1;i<=6;i++){const x=racers.find(v=>v.boat===i),t=stats.find(v=>v.boat===i),e=ex.find(v=>v.boat===i),st=starts.find(v=>v.boat===i);const pct=v=>typeof v==='number'&&Number.isFinite(v)?v.toFixed(2)+'%':'未確認';const values=[i+'号艇',fmt(x?.name),fmt(x?.racerId),fmt(t?.nationwide?.winRate),fmt(t?.local?.winRate),pct(t?.nationwide?.secondPlaceRate),pct(t?.nationwide?.thirdPlaceRate),pct(t?.local?.secondPlaceRate),pct(t?.local?.thirdPlaceRate),fmt(t?.motor?.number),pct(t?.motor?.secondPlaceRate),pct(t?.motor?.thirdPlaceRate),typeof t?.averageST==='number'&&Number.isFinite(t.averageST)?t.averageST.toFixed(2):'未確認',fmt(e?.exhibitionTime),fmt(st?.startTiming),fmt(st?.course),fmt(e?.tilt),'未確認'];const tr=document.createElement('tr');values.forEach((v,j)=>{const td=document.createElement('td');td.textContent=v;td.style.cssText='border-bottom:1px solid #d7e0ea;padding:8px 6px;white-space:nowrap;'+(j===0?'font-weight:700;':'');if(j===4){const n=Number(t?.nationwide?.winRate),l=Number(t?.local?.winRate);const diff=Math.round((l-n)*100);td.style.color=Number.isFinite(n)&&Number.isFinite(l)&&n>0&&l>0?(diff>=100?'#22c55e':diff<=-100?'#facc15':'#ffffff'):'#ffffff';}tr.appendChild(td)});tbody.appendChild(tr)}// Refresh the official beforeinfo independently of the racer/stats fetch.
// Keep verified Makulabo cells and never turn a missing measurement into a real zero.
(async()=>{
 const status=document.getElementById('beforeinfoStatus');
 status.textContent='出走表とは別に取得中です。確認でき次第、直前情報を追加します…';
 try{
  const completeBefore=d.exhibitionVerified===true&&d.exhibitionByBoat?.length===6&&d.startVerified===true&&d.startByCourse?.length===6&&d.weatherVerified===true&&d.windDirectionVerified===true;const response=completeBefore?new Response(JSON.stringify(d),{headers:{'Content-Type':'application/json'}}):(await beforeTask).response;if(!response)throw (await beforeTask).error||Error('公式直前情報の取得に失敗');
  if(!response.ok){let detail='';try{const failure=await response.json();detail=failure.reason||failure.error||failure.diagnostics?.name||'';}catch{}throw Error('HTTP '+response.status+(detail?' / '+detail:''));}
  const fresh=await response.json();
  if(token!==raceDataRequest||selectedDate!==dateCode()||selectedVenue!==venue.value||selectedRace!==race.value)return;
  const normalizeName=name=>String(name||'').replace(/\s/g,'');
  const exRows=fresh.exhibitionVerified===true&&Array.isArray(fresh.exhibitionByBoat)&&racers.length===6&&fresh.exhibitionByBoat.length===6&&fresh.exhibitionByBoat.every(row=>racers.some(r=>r.boat===row.boat&&normalizeName(r.name)===normalizeName(row.name)))?fresh.exhibitionByBoat:[];
  const stRows=fresh.startVerified===true&&Array.isArray(fresh.startByCourse)&&racers.length===6&&fresh.startByCourse.length===6&&new Set(fresh.startByCourse.map(row=>row.course)).size===6&&fresh.startByCourse.every(row=>racers.some(r=>r.boat===row.boat))?fresh.startByCourse:[];
  const diagnostic=document.getElementById('racerPoints').querySelector('p');if(diagnostic)diagnostic.textContent='公式選手情報: '+(d.racersVerified===true?'照合済':'未確認')+' / 勝率・モーター: '+(d.statsVerified===true?'照合済':'未確認')+' / 展示: '+(exRows.length===6?'照合済':'未確認')+' / ST・進入: '+(stRows.length===6?'照合済':'未確認');
  let updated=0;
  const fmtBefore=v=>v===null||v===undefined||v===''?'未確認':String(v);
  for(let boat=1;boat<=6;boat++){
   const tr=tbody.rows[boat-1];if(!tr||tr.cells.length<18)continue;
   const ex=exRows.find(x=>Number(x.boat)===boat),st=stRows.find(x=>Number(x.boat)===boat);
   if(ex){tr.cells[13].textContent=fmtBefore(ex.exhibitionTime);tr.cells[16].textContent=fmtBefore(ex.tilt);updated++;}
   if(st){tr.cells[14].textContent=fmtBefore(st.startTiming);tr.cells[15].textContent=fmtBefore(st.course);updated++;}
  }
  const summary=['公式直前情報を再照合：展示 '+exRows.length+'/6艇、展示ST・進入 '+stRows.length+'/6艇','比較表に反映したデータ：'+updated+'項目（艇単位）','予想点への直前情報反映：未確認（比較表への表示更新は予想の再計算ではありません）','取得元：'+(fresh.source==='verified_recent_cache'?'公式照合済みキャッシュ':'BOAT RACE公式直前情報')];
  const weather=fresh.weather||{};
  const captured=fresh.capturedAt?new Date(fresh.capturedAt):null;
  summary.push('取得日時：'+(captured&&Number.isFinite(captured.getTime())?captured.toLocaleString('ja-JP',{timeZone:'Asia/Tokyo'})+' JST':'未確認'));
  summary.push('風向：'+(fresh.windDirectionVerified===true?fmtBefore(weather.windDirection):'未確認')+' / 風速：'+(fresh.weatherVerified===true&&Number.isFinite(weather.windSpeed)?weather.windSpeed+'m/s':'未確認')+' / 波高：'+(fresh.weatherVerified===true&&Number.isFinite(weather.waveHeight)?weather.waveHeight+'cm':'未確認'));
  if(exRows.length!==6||stRows.length!==6)summary.push('不足分は未確認として表示します。0は実測値として補いません。');
  if(fresh.diagnostics?.beforeinfoReason)summary.push('取得診断：'+fresh.diagnostics.beforeinfoReason);
  summary.push('直前情報の通信時間：'+((await beforeTask).elapsed/1000).toFixed(2)+'秒 / ボタン操作から表示まで：'+((performance.now()-loadStarted)/1000).toFixed(2)+'秒');
  if(token===raceDataRequest)status.textContent=summary.join('\\n');
 }catch(error){
  if(token===raceDataRequest)status.textContent='直前情報の再取得に失敗：'+String(error.message||error)+'。展示ST・展示タイム・進入の最新値は未確認です。出走表・まくらぼの表示は維持しています。予想点に直前情報が反映されたとは扱いません。';
 }finally{if(raceDataController===controller)raceDataController=null;}
})();
const makulaboUpdated=syncVerifiedMakulaboComparison();if(verifiedMakulabo&&makulaboUpdated>0)document.getElementById('makulaboSearchStatus').textContent='まくらぼ50走を選手比較表に反映：'+makulaboUpdated+'/6艇。予想点数への反映は未実装です。';if(d.statsVerified===true&&stats.length===6&&racers.length===6){const table=document.createElement('table');table.style.cssText='border-collapse:collapse;width:100%;font-size:.9rem';const head=document.createElement('tr');['艇・選手','全国2連対率','全国3連対率','当地2連対率','当地3連対率'].forEach(label=>{const th=document.createElement('th');th.textContent=label;th.style.cssText='border-bottom:1px solid #aaa;text-align:left;padding:7px';head.appendChild(th)});table.appendChild(head);for(let i=1;i<=6;i++){const t=stats.find(v=>v.boat===i),x=racers.find(v=>v.boat===i),tr=document.createElement('tr');[i+' '+(x?.name||'未確認'),t?.nationwide?.secondPlaceRate,t?.nationwide?.thirdPlaceRate,t?.local?.secondPlaceRate,t?.local?.thirdPlaceRate].forEach((v,j)=>{const td=document.createElement('td');td.textContent=j===0?v:(typeof v==='number'&&Number.isFinite(v)?v.toFixed(2)+'%':'未確認');td.style.cssText='border-bottom:1px solid #ddd;padding:7px';tr.appendChild(td)});table.appendChild(tr)}finish.replaceChildren(table)}else{finish.textContent='公式の6艇分の入賞率を照合できていません。推測値は表示しません。'}p.replaceChildren();const note=document.createElement('p');note.textContent='公式選手情報: '+(d.racersVerified===true?'照合済':'未確認')+' / 勝率・モーター: '+(d.statsVerified===true?'照合済':'未確認')+' / 展示: '+(d.exhibitionVerified===true?'照合済':'未確認')+' / ST・進入: '+(d.startVerified===true?'照合済':'未確認');p.appendChild(note);if(d.statsVerified===true&&stats.length===6&&racers.length===6){const rows=stats.map(t=>{const metric=v=>v===null||v===undefined||String(v).trim()===''?NaN:Number(v);const win=metric(t?.nationwide?.winRate),motor=metric(t?.motor?.secondPlaceRate);return {boat:t.boat,name:racers.find(x=>x.boat===t.boat)?.name||'',win,motor,valid:Number.isFinite(win)&&win>=0&&win<=10&&Number.isFinite(motor)&&motor>=0&&motor<=100};});if(rows.every(x=>x.valid)){
// Diagnostic ranking mirrors buildMorningRaceInputs: 70/30, or 50/20/30 with verified local rates.
const ranked=stats.map(t=>({boat:t.boat,win:Number(t.nationwide.winRate),motor:Number(t.motor.secondPlaceRate),local:t.local?.winRate==null?NaN:Number(t.local.winRate),top2:t.nationwide?.secondPlaceRate==null?NaN:Number(t.nationwide.secondPlaceRate),top3:t.nationwide?.thirdPlaceRate==null?NaN:Number(t.nationwide.thirdPlaceRate)}));
const localOK=ranked.every(t=>Number.isFinite(t.local)&&t.local>=0&&t.local<=10);
const placesOK=ranked.every(t=>Number.isFinite(t.top2)&&t.top2>=0&&t.top2<=100&&Number.isFinite(t.top3)&&t.top3>=t.top2&&t.top3<=100);
const rank=key=>new Map(ranked.slice().sort((a,b)=>b[key]-a[key]||a.boat-b.boat).map((t,i)=>[t.boat,6-i]));
const wr=rank('win'),mr=rank('motor'),lr=localOK?rank('local'):null,pr2=placesOK?rank('top2'):null,pr3=placesOK?rank('top3'):null;
const scores=ranked.map(t=>({boat:t.boat,score:(localOK?5*wr.get(t.boat)+2*lr.get(t.boat)+3*mr.get(t.boat):7*wr.get(t.boat)+3*mr.get(t.boat))+(placesOK?(pr2.get(t.boat)+pr3.get(t.boat))/100:0)})).sort((a,b)=>b.score-a.score||a.boat-b.boat);
const summary=document.createElement('p');summary.textContent='個別予想と同じ順位評価（暫定）：'+(localOK?'全国50%・当地20%・モーター30%':'全国70%・モーター30%（当地未確認）')+'。全国2連対率・3連対率の補助評価：'+(placesOK?'反映':'未反映')+'。点数は勝率や的中確率ではありません。';p.appendChild(summary);
const rankingTable=document.createElement('table');rankingTable.style.cssText='width:100%;border-collapse:collapse;font-size:.9rem;table-layout:fixed';
const rankingHead=document.createElement('tr');['順位','艇・選手','評価点'].forEach(label=>{const th=document.createElement('th');th.textContent=label;th.style.cssText='padding:6px;border-bottom:1px solid #aaa;overflow-wrap:anywhere';rankingHead.appendChild(th)});rankingTable.appendChild(rankingHead);
scores.forEach((t,i)=>{const tr=document.createElement('tr');[String(i+1),t.boat+' '+(racers.find(x=>x.boat===t.boat)?.name||''),t.score.toFixed(2)].forEach(v=>{const td=document.createElement('td');td.textContent=v;td.style.cssText='padding:6px;border-bottom:1px solid #666;text-align:center;overflow-wrap:anywhere';tr.appendChild(td)});rankingTable.appendChild(tr)});p.appendChild(rankingTable);
const comparison=document.createElement('table');comparison.style.cssText='width:100%;border-collapse:collapse;font-size:.85rem';
const ch=document.createElement('tr');['順位','全国・当地平均','当地勝率のみ'].forEach(v=>{const th=document.createElement('th');th.textContent=v;ch.appendChild(th)});comparison.appendChild(ch);
const validRate=v=>Number.isFinite(v)&&v>0&&v<=10;
const avgOK=ranked.every(t=>validRate(t.win)&&(validRate(t.local)||t.local===0));
const localOnlyOK=ranked.every(t=>validRate(t.win)&&(validRate(t.local)||t.local===0));
const avgOrder=avgOK?ranked.map(t=>({...t,value:(t.win+(t.local===0?t.win:t.local))/2})).sort((a,b)=>b.value-a.value||a.boat-b.boat):[];
const localOrder=localOnlyOK?ranked.map(t=>({...t,value:t.local===0?t.win:t.local,substituted:t.local===0})).sort((a,b)=>b.value-a.value||a.boat-b.boat):[];
const desc=t=>t?t.boat+' '+(racers.find(x=>x.boat===t.boat)?.name||'')+' '+t.value.toFixed(2)+(t.substituted?'（全国代用）':''):'保留';
for(let i=0;i<6;i++){const tr=document.createElement('tr');[String(i+1),desc(avgOrder[i]),desc(localOrder[i])].forEach((v,j)=>{const td=document.createElement('td');td.textContent=v;td.style.cssText='padding:5px;border-bottom:1px solid #666';if(j===1)td.style.color='#ffffff';if(j===2){const t=localOrder[i];const diff=t&&validRate(t.win)&&validRate(t.local)?Math.round((t.local-t.win)*100):null;td.style.color=diff===null?'#ffffff':diff>=100?'#22c55e':diff<=-100?'#facc15':'#ffffff';}tr.appendChild(td)});comparison.appendChild(tr)}
const comparisonNote=document.createElement('p');comparisonNote.textContent='勝率だけの比較順位（買い目とは別）。平均方式は当地0.00を全国で代用。当地のみ方式も当地0.00は全国で代用し、未取得なら保留。同値は艇番順。';p.appendChild(comparisonNote);p.appendChild(comparison);

const heading=document.createElement('p');heading.textContent='参考用の旧60/40評価（個別予想の順位計算とは別・未検証）';p.appendChild(heading);const table=document.createElement('table');table.style.cssText='width:100%;border-collapse:collapse;font-size:.9rem';const tr=document.createElement('tr');['艇・選手','勝率点 / 60','モーター点 / 40','合計 / 100'].forEach(x=>{const th=document.createElement('th');th.textContent=x;th.style.cssText='padding:6px;border-bottom:1px solid #aaa';tr.appendChild(th)});table.appendChild(tr);for(const x of rows.sort((a,b)=>a.boat-b.boat)){const winScore=Math.round(x.win*6*10)/10,motorScore=Math.round(x.motor*.4*10)/10;const tr=document.createElement('tr');[x.boat+' '+x.name,winScore.toFixed(1),motorScore.toFixed(1),(winScore+motorScore).toFixed(1)].forEach(v=>{const td=document.createElement('td');td.textContent=v;td.style.cssText='padding:7px;border-bottom:1px solid #666;text-align:center';tr.appendChild(td)});table.appendChild(tr)}p.appendChild(table);
// Compare an alternative 70-point racer/local model without overwriting the baseline.
const localRows=stats.map(t=>({boat:t.boat,name:racers.find(x=>x.boat===t.boat)?.name||'',
 national:t.nationwide?.winRate==null?NaN:Number(t.nationwide.winRate),local:t.local?.winRate==null?NaN:Number(t.local.winRate),
 motor:t.motor?.secondPlaceRate==null?NaN:Number(t.motor.secondPlaceRate)}));
if(localRows.length===6&&localRows.every(x=>Number.isFinite(x.national)&&x.national>=0&&x.national<=10&&Number.isFinite(x.local)&&x.local>=0&&x.local<=10&&Number.isFinite(x.motor)&&x.motor>=0&&x.motor<=100)){
 const heading2=document.createElement('p');heading2.textContent='比較用：選手・当地70点モデル（全国40＋当地30＋モーター30）';p.appendChild(heading2);
 const table2=document.createElement('table');table2.style.cssText='width:100%;border-collapse:collapse;font-size:.85rem';
 const head2=document.createElement('tr');['艇・選手','全国 /40','当地 /30','モーター /30','合計 /100'].forEach(v=>{const th=document.createElement('th');th.textContent=v;th.style.padding='6px';head2.appendChild(th)});table2.appendChild(head2);
 for(const x of localRows.sort((a,b)=>a.boat-b.boat)){const parts=[x.national*4,x.local*3,x.motor*.3].map(v=>Math.round(v*10)/10);
 const tr=document.createElement('tr');[x.boat+' '+x.name,...parts.map(v=>v.toFixed(1)),(parts.reduce((a,b)=>a+b,0)).toFixed(1)].forEach(v=>{const td=document.createElement('td');td.textContent=v;td.style.cssText='padding:7px;border-bottom:1px solid #666;text-align:center';tr.appendChild(td)});table2.appendChild(tr)}
 p.appendChild(table2);const msg=document.createElement('p');msg.textContent='比較用の仮配点です。全国・当地の勝率が公式確認できた場合のみ表示。モーター30点は直前情報が未取得のための暫定配分で、展示等を取得できたら再検討します。予想の買い目は従来方式のままです。';p.appendChild(msg);
}else{const msg=document.createElement('p');msg.textContent='全国40点＋当地30点の比較モデルは、公式の当地勝率など6艇分が確認できないため保留します。';p.appendChild(msg)}
const caution=document.createElement('p');caution.textContent='暫定点は全国勝率60点＋モーター2連対率40点の単純換算です。展示・ST・進入・風・まくらぼ50走は未反映。的中確率ではありません。';p.appendChild(caution)}else{const warn=document.createElement('p');warn.textContent='評価に必要な数値が不足しているため点数は表示しません。';p.appendChild(warn)}}else{const warn=document.createElement('p');warn.textContent='公式6艇の勝率・モーター情報が揃うまで評価点を保留します。';p.appendChild(warn)}}

</script></body></html>`;
  return new Response(html,{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
}

if (u.pathname === '/api/official/schedule') {
  if(request.method!=='GET')return reply(request,{error:'Method not allowed'},405);
  const date=u.searchParams.get('date')||'';
  if(!/^20[0-9]{6}$/.test(date))return reply(request,{error:'Invalid YYYYMMDD date'},400);
  const source='https://www.boatrace.jp/owpc/pc/race/index?hd='+date;
  try{
    const upstream=await fetch(source,{signal:AbortSignal.timeout(12000)});
    if(!upstream.ok)return reply(request,{date,verified:false,venues:[],reason:'Official schedule unavailable',source});
    const html=await upstream.text();
    const requestedMonth=String(Number(date.slice(4,6)));
    const requestedDay=String(Number(date.slice(6,8)));
    const headingPattern=new RegExp(requestedMonth+'月\\s*'+requestedDay+'日のレース情報');
    if(!headingPattern.test(html))return reply(request,{date,verified:false,venues:[],source,reason:'Official page date heading does not match requested date'});
    const links=[...html.matchAll(/href=["']([^"']*\/owpc\/pc\/race\/racelist[^"']*)["']/gi)];
    const codes=new Set();
    for(const match of links){try{const link=new URL(match[1].replace(/&amp;/g,'&'),'https://www.boatrace.jp');const code=Number(link.searchParams.get('jcd'));if(code>=1&&code<=24&&(!link.searchParams.get('hd')||link.searchParams.get('hd')===date))codes.add(code)}catch{}}
    const venues=[...codes].sort((a,b)=>a-b);
    return reply(request,{date,verified:false,venues,source,reason:'Venue links are diagnostic candidates only; not a verified complete schedule',linkCount:links.length});
  }catch{return reply(request,{date,verified:false,venues:[],source,reason:'Official schedule request failed'})}
}

if (u.pathname === '/api/official/verify-one-venue') {
  const date=u.searchParams.get('date')||'',venue=Number(u.searchParams.get('venue'));
  if(!/^20[0-9]{6}$/.test(date)||!Number.isInteger(venue)||venue<1||venue>24)return reply(request,{error:'Invalid date or venue'},400);
  try{
    const official=await fetchOfficialRacers(date,venue,1,{verificationOnly:true});
    return reply(request,{date,venue,verified:official.verified===true,reason:official.reason||null});
  }catch(error){return reply(request,{date,venue,verified:false,reason:String(error?.message||error).slice(0,120)});}
}
if (u.pathname === '/api/official/active-venues') {
  if(request.method!=='GET')return reply(request,{error:'Method not allowed'},405);
  const date=u.searchParams.get('date')||'';
  if(!/^20[0-9]{6}$/.test(date))return reply(request,{error:'Invalid YYYYMMDD date'},400);
  const offset=Number(u.searchParams.get('offset')||0);
  if(!Number.isInteger(offset)||offset<0||offset>=24)return reply(request,{error:'Invalid offset; use 0..23'},400);
  const venue=offset+1;
  let check;
  try{
    const official=await fetchOfficialRacers(date,venue,1,{verificationOnly:true,fastVerification:true});
    check={venue,status:official.verified===true?'race1_entry_verified':'unverified',reason:official.verified===true?null:(official.reason||'official_rows_unverified')};
  }catch(error){
    check={venue,status:'unverified',reason:error?.name==='TimeoutError'?'official_timeout':String(error?.message||'official_request_failed').slice(0,100)};
  }
  return reply(request,{date,verifiedVenues:check.status==='race1_entry_verified'?[venue]:[],checks:[check],offset,
    nextOffset:offset<23?offset+1:null,scanComplete:offset===23,completeScheduleVerified:false,
    note:'Unverified is not proof of non-operation.'});

}

if (u.pathname === '/api/official/verified-races') {
  if(request.method!=='GET')return reply(request,{error:'Method not allowed'},405);
  const date=u.searchParams.get('date')||'',venue=Number(u.searchParams.get('venue'));
  if(!/^20[0-9]{6}$/.test(date)||!Number.isInteger(venue)||venue<1||venue>24)
    return reply(request,{error:'Invalid date or venue'},400);
  const requestedRace=u.searchParams.get('race');
  if(requestedRace!==null&&(!/^(?:[1-9]|1[0-2])$/.test(requestedRace)))return reply(request,{error:'Invalid race'},400);
  const races=requestedRace!==null?[Number(requestedRace)]:Array.from({length:12},(_,i)=>i+1);
  return reply(request,await getVerifiedList('races:'+date+':'+venue+':'+(requestedRace||'all'),async()=>{const checks=await mapOfficialLimited(races,requestedRace!==null?1:3,async race=>{
    try{
      const started=Date.now();
      const official=await fetchOfficialRacers(date,venue,race,{verificationOnly:true,fastVerification:true});
      return {race,verified:official.verified===true,reason:official.verified===true?null:(official.reason||'official_rows_unverified'),elapsedMs:Date.now()-started,diagnostic:official.diagnostic||null};
    }catch(error){return {race,verified:false,reason:error?.name==='TimeoutError'?'official_timeout':String(error?.message||'official_fetch_failed').slice(0,90)};}
  });
  return {date,venue,verifiedRaces:checks.filter(x=>x.verified).map(x=>x.race),
    checks,completeScheduleVerified:false,
    note:'Only verified six-boat official entry lists are selectable. Unverified does not mean cancelled.'};}));
}

if (u.pathname === '/api/predict/independent-methods') {
  if(request.method!=='GET')return reply(request,{error:'Method not allowed'},405);
  const date=u.searchParams.get('date')||'',venue=Number(u.searchParams.get('venue')),race=Number(u.searchParams.get('race'));
  if(!/^20[0-9]{6}$/.test(date)||!Number.isInteger(venue)||venue<1||venue>24||!Number.isInteger(race)||race<1||race>12)
    return reply(request,{error:'Invalid date, venue or race'},400);
  let official;
  try{official=await fetchOfficialRacers(date,venue,race);}
  catch(error){return reply(request,{ready:false,reason:'official_fetch_failed',detail:String(error?.message||error).slice(0,100)},502);}
  if(official?.verified!==true||official?.statsVerified!==true||official.statsByBoat?.length!==6)
    return reply(request,{ready:false,reason:'official_six_boat_stats_unverified',methods:{}});
  const beforeUrl=new URL('https://www.boatrace.jp/owpc/pc/race/beforeinfo');
  beforeUrl.searchParams.set('rno',String(race));beforeUrl.searchParams.set('jcd',String(venue).padStart(2,'0'));beforeUrl.searchParams.set('hd',date);
  let start={verified:false,rows:[]},exhibition={verified:false,rows:[]};
  try{const response=await fetch(beforeUrl.toString(),{headers:{Accept:'text/html'},signal:AbortSignal.timeout(12000)});
    if(response.ok){const html=await response.text();if(html.length<=1000000){start=extractOfficialStartExhibition(html);exhibition=extractOfficialExhibition(html);}}
  }catch{}
  const starts=new Map((start.verified?start.rows:[]).map(row=>[row.boat,row]));
  const exhibitions=new Map((exhibition.verified?exhibition.rows:[]).map(row=>[row.boat,row]));
  const number=value=>value===null||value===undefined||String(value).trim()===''?NaN:Number(value);
  const racers=official.statsByBoat.map(row=>({boat:row.boat,course:starts.get(row.boat)?.course,
    nationalRate:number(row.nationwide?.winRate),localRate:number(row.local?.winRate),
    averageST:number(row.averageST),motor2Rate:number(row.motor?.secondPlaceRate),
    exhibitionTime:exhibitions.get(row.boat)?.exhibitionTime,last50CoursePodiumRate:NaN}));
  let generated;
  try{generated=generateTwelveIndependentMethods({racers});}
  catch(error){return reply(request,{ready:false,reason:'invalid_six_boat_snapshot',methods:{},detail:String(error?.message||error)});}
  const methods=Object.fromEntries(Object.entries(generated.methods).map(([id,value])=>[id,{...value,
    trifecta:value.status==='predicted'?value.trifecta:null}]));
  return reply(request,{ready:true,date,venue,race,version:generated.version,methods,
    inputStatus:{officialStats:true,entryCourses:start.verified,averageST:racers.every(x=>Number.isFinite(x.averageST)),exhibition:exhibition.verified,last50:false},
    note:'Independent research methods. Missing features abstain. No probability or hit rate is implied.'});
}

if (u.pathname === '/api/predict/selected-race') {
  if(request.method!=='GET')return reply(request,{error:'Method not allowed'},405);
  const date=u.searchParams.get('date')||'',venue=Number(u.searchParams.get('venue')),race=Number(u.searchParams.get('race'));
  if(!/^20[0-9]{6}$/.test(date)||!Number.isInteger(venue)||venue<1||venue>24||!Number.isInteger(race)||race<1||race>12)
    return reply(request,{error:'Invalid date, venue or race'},400);
  let official;
  try{official=await fetchOfficialRacers(date,venue,race);}
  catch(e){return reply(request,{date,venue,race,ready:false,main:[],upset:[],reason:'official_fetch_failed',detail:String(e?.message||e).slice(0,120)});}
  // Retry only incomplete official statistics once. The second response must
  // independently pass all six-boat and racer-ID checks before it is used.
  let officialStatsRetry='not_needed';
  if(official?.verified!==true||official?.statsVerified!==true){
    officialStatsRetry='attempted';
    try{
      const retry=await fetchOfficialRacers(date,venue,race,{fastVerification:true});
      if(retry?.verified===true&&retry?.statsVerified===true){
        official=retry;officialStatsRetry='verified';
      }else officialStatsRetry=retry?.reason||'six_boat_stats_still_unverified';
    }catch(error){officialStatsRetry='retry_fetch_failed';}
  }
  const inputs=buildMorningRaceInputs(date,venue,race,official);
  if(!inputs.ready)return reply(request,{date,venue,race,ready:false,main:[],upset:[],reason:inputs.reason||'verified_inputs_missing',
    officialStatsRetry,missingInputs:inputs.missingInputs||[],officialVerified:official?.verified===true,statsVerified:official?.statsVerified===true});
  // Morning batch remains unchanged. Only an explicitly requested selected-race
  // prediction checks beforeinfo; transport failure falls back to the base model.
  const useBeforeinfo=u.searchParams.get('mode')==='beforeinfo';
  let exhibition={verified:false,rows:[]},startExhibition={verified:false,rows:[]},beforeinfoReason='not_requested';
  if(useBeforeinfo){
    const cached=getVerifiedBeforeinfo(date,venue,race)||await readSharedVerifiedBeforeinfo(env,date,venue,race);
    if(cached){exhibition=cached.exhibition;startExhibition=cached.start;beforeinfoReason='verified_recent_cache';}
    // A partial cache must not prevent fetching the missing official component.
    if(!cached||exhibition.verified!==true||startExhibition.verified!==true){
    const url=new URL('https://www.boatrace.jp/owpc/pc/race/beforeinfo');
    url.searchParams.set('rno',String(race));
    url.searchParams.set('jcd',String(venue).padStart(2,'0'));
    url.searchParams.set('hd',date);
    // Allow slower official responses while retrying a transport timeout once,
    // but never retry invalid/partial race data or invent missing values.
    for(const timeoutMs of [9000,9000]){
      try{
        const response=await fetch(url.toString(),{headers:{Accept:'text/html'},signal:AbortSignal.timeout(timeoutMs)});
        if(response.ok){
          const html=await response.text();
          if(html.length<=1000000){
            const fetchedExhibition=extractOfficialExhibition(html);
            const fetchedStart=extractOfficialStartExhibition(html);
            if(fetchedExhibition.verified===true)exhibition=fetchedExhibition;
            if(fetchedStart.verified===true)startExhibition=fetchedStart;
            saveVerifiedBeforeinfo(date,venue,race,exhibition,startExhibition);
            await writeSharedVerifiedBeforeinfo(env,date,venue,race,exhibition,startExhibition);
            beforeinfoReason=exhibition.verified===true&&startExhibition.verified===true?'six_boats_verified':
              (exhibition.verified===true||startExhibition.verified===true?'partial_six_boats_verified':'beforeinfo_unverified');
          }else beforeinfoReason='beforeinfo_response_too_large';
        }else beforeinfoReason='beforeinfo_http_'+response.status;
        break;
      }catch(error){
        const timedOut=error?.name==='TimeoutError'||error?.name==='AbortError';
        beforeinfoReason=timedOut?'beforeinfo_timeout':'beforeinfo_fetch_failed';
        if(!timedOut)break;
      }
    }
    }
  }
  const adjustment=useBeforeinfo?applyVerifiedExhibitionAdjustment(inputs.rankedScores,exhibition):
    {applied:false,rankedScores:inputs.rankedScores};
  const startAdjustment=useBeforeinfo?applyVerifiedStartAdjustment(adjustment.rankedScores,startExhibition,official.statsVerified===true?official.statsByBoat:[]):
    {applied:false,rankedScores:adjustment.rankedScores,reason:'not_requested'};
  // Experimental 100-point model, separate from the existing production picks.
  // No guessed values: unavailable inputs receive no points and are reported.
  const experimental=(()=>{
    const stats=official.statsByBoat;
    const exMap=new Map((exhibition.verified===true?exhibition.rows:[]).map(x=>[x.boat,x]));
    const stMap=new Map((startExhibition.verified===true?startExhibition.rows:[]).map(x=>[x.boat,x]));
    const metric=(value,min,max)=>{const n=value===null||value===undefined||String(value).trim()===''?NaN:Number(value);return Number.isFinite(n)&&n>=min&&n<=max?n:null};
    const values=stats.map(x=>({boat:x.boat,win:metric(x.nationwide?.winRate,0,10),local:metric(x.local?.winRate,0,10),avgST:metric(x.averageST,0,0.5),motor:metric(x.motor?.secondPlaceRate,0,100),top2:metric(x.nationwide?.secondPlaceRate,0,100),top3:metric(x.nationwide?.thirdPlaceRate,0,100),course:stMap.get(x.boat)?.course,exTime:exMap.get(x.boat)?.exhibitionTime,exST:stMap.get(x.boat)?.startTiming}));
    const rank=(key,ascending=false)=>{const rows=values.filter(x=>typeof x[key]==='number'&&Number.isFinite(x[key])).sort((a,b)=>(ascending?a[key]-b[key]:b[key]-a[key])||a.boat-b.boat);return rows.length===6?new Map(rows.map((x,i)=>[x.boat,(6-i)/6])):null};
    const win=rank('win'),motor=rank('motor'),avgST=rank('avgST',true),exTime=rank('exTime',true),exST=rank('exST',true);
    const courses=startExhibition.verified===true&&new Set(values.map(x=>x.course)).size===6&&values.every(x=>Number.isInteger(x.course)&&x.course>=1&&x.course<=6);
    const courseWeights=[1,.72,.52,.39,.27,.18]; // heuristic, not calibrated probabilities
    const rows=values.map(x=>{
      const winBase=x.win===null?0:25*(win?.get(x.boat)||0);
      const localBonus=x.local===null||x.local===0?0:Math.min(2.5,x.local/10*2.5);
      const ability=Math.min(25,winBase+localBonus);
      const course=courses?25*courseWeights[x.course-1]:0;
      const st=avgST?20*avgST.get(x.boat):0;
      const motorScore=motor?15*motor.get(x.boat):0;
      const exhibition=(exTime?7*exTime.get(x.boat):0)+(exST?3*exST.get(x.boat):0);
      const score=ability+course+st+motorScore+exhibition;
      return {boat:x.boat,score:Number(score.toFixed(3)),top2:x.top2,top3:x.top3,components:{ability:Number(ability.toFixed(2)),course:Number(course.toFixed(2)),averageST:Number(st.toFixed(2)),motor:Number(motorScore.toFixed(2)),exhibition:Number(exhibition.toFixed(2)),last50:0}};
    });
    const map=new Map(rows.map(x=>[x.boat,x]));
    const combinations=[];
    for(let a=1;a<=6;a++)for(let b=1;b<=6;b++)for(let d=1;d<=6;d++){
      if(a===b||a===d||b===d)continue;
      const first=map.get(a),second=map.get(b),third=map.get(d);
      const strength=first.score*.54+second.score*.28+third.score*.18+
        (second.top2===null?0:second.top2*.035)+(third.top3===null?0:third.top3*.025);
      combinations.push({boats:[a,b,d],strength});
    }
    combinations.sort((a,b)=>b.strength-a.strength||a.boats.join('').localeCompare(b.boats.join('')));
    const main=combinations.slice(0,6).map(x=>x.boats);
    const used=new Set(main.map(x=>x.join('-')));
    const upset=combinations.filter(x=>x.boats[0]>=4&&!used.has(x.boats.join('-'))).slice(0,6).map(x=>x.boats);
    const missing=[...(!courses?['course']:[]),...(!avgST?['averageST']:[]),...(!exTime?['exhibitionTime']:[]),...(!exST?['exhibitionST']:[]),'last50','currentMeet','wind'];
    return {ready:true,main,upset,rows,courses:courses?values.map(x=>({boat:x.boat,course:x.course})):[],missingInputs:missing,model:'experimental_100_point_v2_position_suitability_unvalidated',note:'仮配点。コース別選手実績・今節成績・風・50走は未反映。欠損項目は0点であり能力0を意味しません。的中率未検証。'};
  })();
  // Independent local-win-rate model; do not mutate official data or existing picks.
  const localPrediction=(()=>{
    const rate=v=>v===null||v===undefined||String(v).trim()===''?NaN:Number(v);
    const rates=official.statsByBoat.map(x=>({boat:x.boat,national:rate(x.nationwide?.winRate),local:rate(x.local?.winRate)}));
    if(!rates.every(x=>Number.isFinite(x.national)&&x.national>=0&&x.national<=10&&Number.isFinite(x.local)&&x.local>=0&&x.local<=10))
      return {ready:false,reason:'local_win_rates_unverified'};
    const values=rates.map(x=>({...x,value:x.local===0?x.national:x.local,substituted:x.local===0}));
    const byBoat=new Map(values.map(x=>[x.boat,x.value]));
    const localOfficial={...official,statsByBoat:official.statsByBoat.map(x=>({...x,nationwide:{...x.nationwide,winRate:byBoat.get(x.boat)},local:{...x.local,winRate:byBoat.get(x.boat)}}))};
    const base=buildMorningRaceInputs(date,venue,race,localOfficial);
    if(!base.ready)return {ready:false,reason:base.reason};
    const ex=useBeforeinfo?applyVerifiedExhibitionAdjustment(base.rankedScores,exhibition):{applied:false,rankedScores:base.rankedScores};
    const st=useBeforeinfo?applyVerifiedStartAdjustment(ex.rankedScores,startExhibition,official.statsVerified===true?official.statsByBoat:[]):{applied:false,rankedScores:ex.rankedScores};
    return {ready:true,rates:values,baseScores:base.rankedScores,basePicks:rankTrifectaCandidates(base.rankedScores),adjustedScores:st.rankedScores,exhibitionApplied:ex.applied,startApplied:st.applied,method:'local_winrate70_motor30_unvalidated'};
  })();
  const basePicks=rankTrifectaCandidates(inputs.rankedScores);
  const picks=rankTrifectaCandidates(startAdjustment.rankedScores);
  const missingInputs=inputs.missingInputs.filter(x=>
    !(x==='exhibition'&&adjustment.applied)&&!(x==='start'&&startAdjustment.applied));
  return reply(request,{date,venue,race,ready:picks.ready,main:picks.main,upset:picks.upset,
    rankedScores:startAdjustment.rankedScores,experimental,localPrediction,
    scenarioEvidence:{generatedAt:new Date().toISOString(),deadlineAt:inputs.deadlineAt||null,courseStats:matchOfficialCourseStats(officialCourseData,date,official,startExhibition),start:startExhibition.verified===true?startExhibition.rows.map(x=>({boat:x.boat,course:x.course,st:x.startTiming})):[],exhibition:exhibition.verified===true?exhibition.rows.map(x=>({boat:x.boat,time:x.exhibitionTime})):[]},
    method:inputs.method,combinationMethod:picks.method,officialStatsRetry,
    basePrediction:{main:basePicks.main,upset:basePicks.upset},
    predictionChanged:JSON.stringify(basePicks.main)!==JSON.stringify(picks.main)||JSON.stringify(basePicks.upset)!==JSON.stringify(picks.upset),
    predictionMode:startAdjustment.applied?'verified_start_adjusted':(adjustment.applied?'verified_exhibition_adjusted':'base_stats_only'),
    startAdjustmentApplied:startAdjustment.applied,startVerification:startAdjustment.reason||'six_numeric_start_rows_verified',
    averageSTSubstitutions:startAdjustment.averageSTSubstitutions||[],
    startCoursesVerified:startExhibition.verified===true,
    exhibitionAdjustmentApplied:adjustment.applied,exhibitionVerification:beforeinfoReason,
    placeRateTieBreakVerified:inputs.placeRateTieBreakVerified===true,missingInputs,
    verified:'official_six_boat_entries_and_available_verified_metrics_only',
    note:'Provisional base statistics model. Verified exhibition time and numeric start-exhibition timing receive small unvalidated adjustments only when all six rows are confirmed. Course is observed but not scored; wind and last50 are excluded. Not a calibrated probability.'});
}

if (u.pathname === '/api/daily/verified-venue-screen') {
  if(request.method!=='GET')return reply(request,{error:'Method not allowed'},405);
  const date=u.searchParams.get('date')||'';
  const venue=Number(u.searchParams.get('venue'));
  if(!/^20[0-9]{6}$/.test(date)||!Number.isInteger(venue)||venue<1||venue>24)
    return reply(request,{error:'Invalid YYYYMMDD date or venue 1-24'},400);
  const first=await fetchOfficialRacers(date,venue,1);
  if(first.verified!==true)return reply(request,{date,venue,verified:false,eligible:0,
    categories:{main:[],upset:[],chaos:[]},records:[],
    reason:'official_race1_unverified',scheduleVerified:false});
  const records=await scanVenueMorning(date,venue,first);
  const eligible=records.filter(x=>x.ready===true);
  const categories=classifyDailyRaceCandidates(eligible);
  return reply(request,{date,venue,verified:true,verification:'official_1R_six_boat_entry',
    scanned:12,eligible:eligible.length,held:12-eligible.length,categories,
    records:records.map((x,i)=>({race:i+1,ready:x.ready,
      reason:x.reason||null,missingInputs:x.missingInputs||[],
      picks:x.ready?rankTrifectaCandidates(x.rankedScores):null})),
    scheduleVerified:false,asOf:'request_time_not_0800_snapshot',
    note:'One venue only. Provisional heuristic; missing data is not fabricated. No scheduled run or historical validation.'});
}

if (u.pathname === '/api/daily/national-screen') {
  if(request.method!=='GET')return reply(request,{error:'Method not allowed'},405);
  const date=u.searchParams.get('date')||'';
  if(!/^20[0-9]{6}$/.test(date))return reply(request,{error:'Invalid YYYYMMDD date'},400);
  // Never infer an official nationwide schedule from incomplete venue links.
  // Explicit venue selection makes the scope auditable and avoids labeling absent data as closed.
  const raw=u.searchParams.get('venues')||'';
  const tokens=raw.split(',').map(x=>x.trim());
  if(tokens.some(x=>!/^([1-9]|1[0-9]|2[0-4])$/.test(x)))
    return reply(request,{error:'Invalid venue codes; use comma-separated integers 1-24'},400);
  const venues=[...new Set(tokens.map(Number))];
  if(!venues.length||venues.length>24||venues.some(v=>!Number.isInteger(v)||v<1||v>24))
    return reply(request,{error:'Provide verified venue codes as comma-separated venues=1,2,... (1-24)'},400);
  const records=[];
  for(const venue of venues) records.push(...await scanVenueMorning(date,venue));
  const eligible=records.filter(x=>x.ready===true);
  const categories=classifyDailyRaceCandidates(eligible);
  const picksByRace=eligible.map(x=>({venue:x.venue,race:x.race,
    picks:rankTrifectaCandidates(x.rankedScores)}));
  return reply(request,{date,venuesRequested:venues,scanned:records.length,
    eligible:eligible.length,held:records.length-eligible.length,categories,
    picksByRace,officialScheduleVerified:false,nationwideComplete:false,
    asOf:'request_time_not_0800_snapshot',
    notice:'On-demand screening of explicitly supplied venues only. Not an automatic 08:00 nationwide run. Rankings and trifectas are unvalidated heuristic candidates; missing last50, course, exhibition, start and weather.'});
}

if (u.pathname === '/api/daily/venue-screen') {
  if(request.method!=='GET')return reply(request,{error:'Method not allowed'},405);
  const date=u.searchParams.get('date')||'',venue=Number(u.searchParams.get('venue'));
  if(!/^20[0-9]{6}$/.test(date)||!Number.isInteger(venue)||venue<1||venue>24)
    return reply(request,{error:'Invalid date or venue'},400);
  const records=await scanVenueMorning(date,venue);
  const eligible=records.filter(x=>x.ready===true);
  const classification=classifyDailyRaceCandidates(eligible);
  return reply(request,{date,venue,scanned:12,eligible:eligible.length,held:12-eligible.length,
    categories:classification,records:records.map((x,i)=>{const picks=x.ready?rankTrifectaCandidates(x.rankedScores):null;return {race:i+1,ready:x.ready,reason:x.reason||null,officialVerified:x.officialVerified===true,missingInputs:x.missingInputs||[],picks:picks?.ready?{main:picks.main,upset:picks.upset,method:picks.method}:null};}),
    asOf:'request_time_not_0800_snapshot',officialScheduleVerified:false,
    notice:'This is an on-demand venue screening, not an 08:00 nationwide snapshot. No result is a validated probability.'});
}

if (u.pathname === '/api/backtest/retrospective') {
 if(request.method!=='GET')return reply(request,{error:'Method not allowed'},405);
 const date=u.searchParams.get('date')||'',venue=Number(u.searchParams.get('venue')),race=Number(u.searchParams.get('race'));
 if(!/^20\d{6}$/.test(date)||!Number.isInteger(venue)||venue<1||venue>24||!Number.isInteger(race)||race<1||race>12)
  return reply(request,{error:'Invalid parameters'},400);
 const resultUrl='https://www.boatrace.jp/owpc/pc/race/raceresult?rno='+race+'&jcd='+String(venue).padStart(2,'0')+'&hd='+date;
 // Historical official metrics may have changed since race time. Never label these as an archived 08:00 forecast.
 const [official,resultResponse]=await Promise.all([
  fetchOfficialRacers(date,venue,race),
  fetch(resultUrl,{signal:AbortSignal.timeout(12000)}).catch(()=>null)
 ]);
 const model=buildMorningRaceInputs(date,venue,race,official);
 const result=resultResponse?.ok?parseOfficialFinishOrder(await resultResponse.text()):{verified:false,reason:'result_fetch_failed',finishOrder:[]};
 if(model.ready!==true||result.verified!==true)
  return reply(request,{date,venue,race,status:'held',modelReady:model.ready===true,modelReason:model.reason||null,resultVerified:result.verified===true,resultReason:result.reason||null,method:'retrospective_non_point_in_time',notMorningSnapshot:true});
 const ranked=model.rankedScores.slice().sort((a,b)=>b.score-a.score||a.boat-b.boat);
 const combinations=[];
 const byBoat=new Map(ranked.map(x=>[x.boat,x.score]));
 for(let a=1;a<=6;a++)for(let b=1;b<=6;b++)for(let c=1;c<=6;c++){
  if(a===b||a===c||b===c)continue;
  combinations.push({pick:a+'-'+b+'-'+c,score:byBoat.get(a)*.56+byBoat.get(b)*.29+byBoat.get(c)*.15,first:a});
 }
 combinations.sort((a,b)=>b.score-a.score||a.pick.localeCompare(b.pick));
 const main=combinations.slice(0,6).map(x=>x.pick);
 const upset=combinations.filter(x=>x.first>=4).slice(0,6).map(x=>x.pick);
 const actual=result.finishOrder.slice(0,3).join('-');
 return reply(request,{date,venue,race,status:'compared',method:'retrospective_non_point_in_time',notMorningSnapshot:true,
  warning:'Official stats may not represent the pre-race historical snapshot. No Makulabo or exhibition input is used. This is a diagnostic reconstruction, not a validated hit rate.',
  modelVersion:model.method,actual,main,upset,mainHit:main.includes(actual),upsetHit:upset.includes(actual),rankedScores:ranked,resultVerified:true});
}

if (u.pathname === '/api/official/result') {
  if(request.method!=='GET')return reply(request,{error:'Method not allowed'},405);
  const date=u.searchParams.get('date')||'',venue=u.searchParams.get('venue')||'',race=u.searchParams.get('race')||'';
  if(!/^20[0-9]{6}$/.test(date)||!/^[0-9]{1,2}$/.test(venue)||!/^[0-9]{1,2}$/.test(race)||Number(venue)<1||Number(venue)>24||Number(race)<1||Number(race)>12)return reply(request,{error:'Invalid parameters'},400);
  const source='https://www.boatrace.jp/owpc/pc/race/raceresult?rno='+Number(race)+'&jcd='+venue.padStart(2,'0')+'&hd='+date;
  try{
    const upstream=await fetch(source,{signal:AbortSignal.timeout(12000)});
    if(!upstream.ok)return reply(request,{verified:false,finishOrder:[],reason:'official_result_http_error',source,upstreamStatus:upstream.status});
    const html=await upstream.text();
    const parsed=parseOfficialFinishOrder(html);
    return reply(request,{...parsed,date,venue:Number(venue),race:Number(race),source,diagnostics:{upstreamStatus:upstream.status,htmlBytes:html.length,tableCount:(html.match(/<table\b/gi)||[]).length,hasResultHeading:/着順|レース結果|着/.test(html)},dataReadyForPrediction:false});
  }catch{return reply(request,{verified:false,finishOrder:[],reason:'official_result_fetch_failed',source})}
}

if (u.pathname === '/api/racers/test') {
  return reply(request, {
    status: 'ok',
    racers: extractRacerData('')
  });
}

if (u.pathname === '/tools/makulabo-screenshot') {
  if(request.method!=='GET')return reply(request,{error:'Method not allowed'},405);
  const html=String.raw`<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Boat Score 2 | 画像確認</title><style>body{font-family:system-ui,sans-serif;max-width:650px;margin:20px auto;padding:0 14px;color:#172033}label{display:block;margin:12px 0}input{font-size:16px;max-width:100%;padding:8px}input[type=number]{width:68px}img{max-width:100%;max-height:55vh;object-fit:contain}table{border-collapse:collapse;width:100%}td,th{border-bottom:1px solid #ddd;padding:5px}button{font-size:16px;padding:10px;margin:8px 4px 8px 0;max-width:100%;white-space:normal;overflow-wrap:anywhere}input,select{box-sizing:border-box;max-width:100%}pre{font-size:13px;line-height:1.55}small{color:#555}</style></head>
<body><h1>Boat Score 2：まくらぼ画像確認</h1>
<p>画像はこの端末内で表示します。自動OCRは未実装です。画像はサーバーへ送信しません。</p>
<label>スクリーンショットを選択 <input id="photo" type="file" accept="image/*"></label>
<div><button id="zoomOut" type="button">縮小 −</button><button id="zoomIn" type="button">拡大 ＋</button><button id="zoomReset" type="button">元に戻す</button></div><div id="imageViewport" style="overflow:auto;max-height:60vh;touch-action:pan-x pan-y"><img id="zoomPreview" alt="拡大画像" hidden style="max-width:none;width:100%;height:auto"></div>
<p style="font-size:14px;color:#475569">① 日付・競艇場・レース番号を選択 → ② CSV取得 → ③ 公式照合・50走比較。未確認データは予想点に反映しません。</p><label>日付（YYYYMMDD） <input id="date" inputmode="numeric" maxlength="8" placeholder="20261114"></label>
<label>競艇場 <select id="venue" style="font-size:16px;padding:10px;max-width:100%"><option value="">競艇場を選択</option><option value="1">桐生</option><option value="2">戸田</option><option value="3">江戸川</option><option value="4">平和島</option><option value="5">多摩川</option><option value="6">浜名湖</option><option value="7">蒲郡</option><option value="8">常滑</option><option value="9">津</option><option value="10">三国</option><option value="11">びわこ</option><option value="12">住之江</option><option value="13">尼崎</option><option value="14">鳴門</option><option value="15">丸亀</option><option value="16">児島</option><option value="17">宮島</option><option value="18">徳山</option><option value="19">下関</option><option value="20">若松</option><option value="21">芦屋</option><option value="22">福岡</option><option value="23">唐津</option><option value="24">大村</option></select></label>
<label>レース番号（1〜12） <input id="race" type="number" min="1" max="12"></label>
<button id="checkSchedule" type="button">公式開催一覧の候補を確認</button><p id="scheduleStatus" role="status">開催一覧は未照合です</p><button id="checkAllVenues" type="button">全国24場の公式1R出走表を確認</button><label style="display:block"><input id="showConfirmedOnly" type="checkbox"> 公式1R確認済みの場だけ表示（未確認の場は非開催とは限りません）</label><p id="allVenuesStatus" role="status">未確認</p><button id="checkVenue" type="button">選択した競艇場の開催情報を確認</button><p id="venueStatus" role="status">未確認（開催・非開催は未判定）</p><button id="checkRaceData" type="button">選択レースの公式データ充足状況を確認</button><p id="raceDataStatus" role="status">未確認</p><div id="last50Comparison" aria-live="polite"></div><button id="fillRacers" type="button">公式出走表から登録番号を入力</button><p id="fillStatus" role="status"></p><p>画像を見ながら走数・1〜6着回数を入力してください。6艇すべて必要です。</p><button id="set50" type="button">6艇の走数を50にする</button><p id="countStatus" role="status"></p>
<a id="officialRaceLink" href="https://www.boatrace.jp/owpc/pc/race/racelist" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:10px 0">公式出走表を直接開く</a><div><button id="loadCsvCard" type="button">7.7方式：出走表CSVを取得・比較</button></div><button id="fillCsvRacerIds" type="button" disabled>照合済み登録番号を6艇に入力</button><p id="csvFillStatus" role="status">CSV取得・公式照合後に利用できます。</p><pre id="csvCardResult" style="white-space:pre-wrap;overflow-wrap:anywhere" role="status">CSV未取得（非公式データ）</pre><div id="csvComparison" aria-label="6艇の事前比較" style="overflow-x:auto"></div><button id="loadBeforeInfo" type="button">公式直前情報を取得</button><pre id="beforeInfoResult" style="white-space:pre-wrap;overflow-wrap:anywhere" role="status">直前情報は未取得です。</pre><div id="beforeInfoTable" style="overflow-x:auto"></div><div id="dataCoverageSummary" role="status" style="font-size:13px;line-height:1.7;padding:8px 0">事前CSV：未取得 / 直前情報：未取得</div><pre id="evaluationChange" style="white-space:pre-wrap;overflow-wrap:anywhere;font-size:13px">事前CSVと公式直前情報を両方取得すると、項目別の変化を確認できます。</pre><div id="evidenceMatrix" style="overflow-x:auto"></div><section id="historicalReview" style="margin:14px 0;padding:10px;border:1px solid #cbd5e1;border-radius:8px"><strong>過去レース検証（手動着順入力）</strong><p style="font-size:13px">公式結果を確認してから1〜3着の艇番を入力してください。結果の自動取得や統計的有意性の検証は未実装です。</p><div style="display:flex;gap:8px;flex-wrap:wrap"><input id="finish1" type="number" min="1" max="6" placeholder="1着艇番" style="width:85px"><input id="finish2" type="number" min="1" max="6" placeholder="2着艇番" style="width:85px"><input id="finish3" type="number" min="1" max="6" placeholder="3着艇番" style="width:85px"><button id="reviewResult" type="button">条件と着順を照合</button></div><pre id="reviewOutput" style="white-space:pre-wrap;font-size:13px">結果未入力</pre><button id="fetchOfficialFinish" type="button">公式確定着順を取得</button><span id="finishFetchStatus" role="status" style="font-size:13px">未取得</span><button id="scanOfficialResults" type="button">選択日の同場12Rを取得診断</button><pre id="scanOfficialOutput" style="white-space:pre-wrap;font-size:12px">一括診断は未実行です。</pre><label>確認できたレースを選択 <select id="verifiedRaceChoice"><option value="">診断後に選択できます</option></select></label><button id="openVerifiedRace" type="button" disabled>選択レースの詳細を確認</button><button id="loadSelectedRaceEvidence" type="button">選択レースの3種類のデータをまとめて取得</button><button id="reviewSelectedEvidence" type="button">取得済みデータで条件と着順を照合</button><pre id="loadSelectedRaceEvidenceStatus" style="white-space:pre-wrap;font-size:12px">事前CSV・公式直前情報・公式結果を個別に取得することもできます。</pre><details><summary>公式結果の取得診断</summary><pre id="finishDiagnostics" style="white-space:pre-wrap;font-size:12px">未実行</pre></details><button id="saveReview" type="button" disabled>この検証を一時集計に追加</button><button id="exportReviews" type="button">公式照合済み検証をCSV保存</button><label style="font-size:13px">保存したCSVを読み込んで参考集計 <input id="importReviews" type="file" accept=".csv,text/csv"></label><pre id="importReviewStatus" style="white-space:pre-wrap;font-size:12px">CSV未読込。インポート内容は公式再照合されません。</pre><button id="clearReviews" type="button">一時集計を消去</button><pre id="reviewAggregate" style="white-space:pre-wrap;font-size:13px">集計0レース（この画面を閉じると消えます）</pre></section><div id="rows" style="display:grid;gap:14px"></div>
<button id="check" type="button">公式出走表と照合する</button><pre id="result" style="white-space:pre-wrap;overflow-wrap:anywhere"></pre>
<small>選手番号が一致しても画像内の数字自体は未検証です。直近50走の取得成功や予想可能を意味しません。</small>
<details id="dailyRanking" style="margin:24px 0;padding:12px;border:1px solid #cbd5e1;border-radius:12px" aria-label="朝8時の全国レース分析"><summary style="font-weight:700;cursor:pointer;padding:8px">朝8:00 全国レース分析（未実装・開く）</summary>
<h2>朝8:00 全国レース分析ランキング</h2>
<p>本命寄り・穴候補・本命崩れの大荒れ候補を各最大20R表示する予定です。未確認のレースを順位に入れません。</p>
<p id="dailyRankingDate" role="status">対象日：確認中</p>
<div style="display:flex;gap:8px;flex-wrap:wrap">
<button type="button" data-ranking="main">本命 最大20R</button>
<button type="button" data-ranking="upset">穴 最大20R</button>
<button type="button" data-ranking="chaos">大荒れ 最大20R</button>
</div>
<p id="dailyRankingStatus" role="status">朝8時の全国一括分析は未実装です。検証済みのランキングはありません。</p>
<ol id="dailyRankingList"></ol>
<small>朝の事前評価と締切10分前の直前評価は別に保存する予定です。的中確率や回収率は未検証です。</small>
</details>
<script>
const rows=document.getElementById('rows');
// Preselect the exact race from Boat Score 2; do not claim Makulabo data was imported.
const selectedFromMain=new URLSearchParams(location.search);
const selectedDate=selectedFromMain.get('date')||'',selectedVenue=selectedFromMain.get('venue')||'',selectedRace=selectedFromMain.get('race')||'';
if(/^20[0-9]{6}$/.test(selectedDate))document.getElementById('date').value=selectedDate;
if(/^(?:[1-9]|1[0-9]|2[0-4])$/.test(selectedVenue))document.getElementById('venue').value=selectedVenue;
if(/^(?:[1-9]|1[0-2])$/.test(selectedRace))document.getElementById('race').value=selectedRace;

function updateOfficialRaceLink(){
 const date=document.getElementById('date').value.trim(),venue=Number(document.getElementById('venue').value),race=Number(document.getElementById('race').value),link=document.getElementById('officialRaceLink');
 const valid=/^20[0-9]{6}$/.test(date)&&Number.isInteger(venue)&&venue>=1&&venue<=24&&Number.isInteger(race)&&race>=1&&race<=12;
 link.hidden=!valid;
 if(valid)link.href='https://www.boatrace.jp/owpc/pc/race/racelist?hd='+date+'&jcd='+String(venue).padStart(2,'0')+'&rno='+race;
}
for(const id of ['date','venue','race'])document.getElementById(id).addEventListener('input',updateOfficialRaceLink);
updateOfficialRaceLink();
let coverageCsv=null,coverageBefore=null;
let priorSnapshot=null,officialSnapshot=null;
let priorSnapshotKey=null,officialSnapshotKey=null;
function invalidatePendingReview(){pendingReview=null;const save=document.getElementById('saveReview');if(save)save.disabled=true}
function currentDataKey(){return document.getElementById('date').value.trim()+'-'+document.getElementById('venue').value+'-'+document.getElementById('race').value}
let scanVersion=0;
function resetResultScan(){scanVersion++;document.getElementById('scanOfficialResults').disabled=false;document.getElementById('scanOfficialOutput').textContent='レース・日付・場の変更により診断をリセットしました。';document.getElementById('verifiedRaceChoice').replaceChildren(new Option('診断後に選択できます',''));document.getElementById('openVerifiedRace').disabled=true}
for(const id of ['date','venue','race'])document.getElementById(id).addEventListener('input',resetResultScan);
document.getElementById('openVerifiedRace').addEventListener('click',()=>{const choice=document.getElementById('verifiedRaceChoice'),race=choice.value;if(!/^(?:[1-9]|1[0-2])$/.test(race))return;const select=document.getElementById('race');select.value=race;select.dispatchEvent(new Event('input',{bubbles:true}));document.getElementById('scanOfficialOutput').textContent='選択した'+race+'Rに切り替えました。事前CSV・直前情報・公式結果は再取得してください。'});
let evidenceLoadVersion=0;
for(const id of ['date','venue','race'])document.getElementById(id).addEventListener('input',()=>{evidenceLoadVersion++;document.getElementById('loadSelectedRaceEvidence').disabled=false;document.getElementById('loadSelectedRaceEvidenceStatus').textContent='条件が変更されました。まとめて取得を再実行してください。'});
document.getElementById('loadSelectedRaceEvidence').addEventListener('click',async()=>{
 const button=document.getElementById('loadSelectedRaceEvidence'),out=document.getElementById('loadSelectedRaceEvidenceStatus');
 const date=document.getElementById('date').value.trim(),venue=Number(document.getElementById('venue').value),race=Number(document.getElementById('race').value);
 if(!/^20[0-9]{6}$/.test(date)||!Number.isInteger(venue)||venue<1||venue>24||!Number.isInteger(race)||race<1||race>12){out.textContent='日付・競艇場・レース番号を確認してください。';return}
 const version=++evidenceLoadVersion;button.disabled=true;
 const jobs=[['事前CSV','loadCsvCard','csvCardResult'],['公式直前情報','loadBeforeInfo','beforeInfoResult'],['公式確定着順','fetchOfficialFinish','finishFetchStatus']];
 out.textContent='3種類の取得を開始しました。公式サイトの応答に時間がかかる場合があります。';
 try{
  for(let i=0;i<jobs.length;i++){
   if(version!==evidenceLoadVersion)return;
   const [name,id,statusId]=jobs[i];document.getElementById(id).click();
   const start=Date.now();let last='';
   while(Date.now()-start<45000){
    if(version!==evidenceLoadVersion)return;
    await new Promise(resolve=>setTimeout(resolve,400));
    last=document.getElementById(statusId).textContent||'';
    if(id==='loadCsvCard'&&(/取得項目|照合できませんでした|取得失敗|エラー|失敗/.test(last)))break;
    if(id==='loadBeforeInfo'&&(/取得失敗|未取得|確認済|取得でき|エラー|失敗|展示|風/.test(last)&&!/確認中/.test(last)))break;
    if(id==='fetchOfficialFinish'&&(/確認済|未確認|取得失敗|エラー|失敗/.test(last)&&!/取得中/.test(last)))break;
   }
   out.textContent=(i+1)+'/3 '+name+'の取得を実行しました。\\n'+(last||'応答待ち・取得状況は各欄を確認してください。')+'\n※データが揃わない場合は分析を保留します。';
  }
  if(version===evidenceLoadVersion){const key=currentDataKey(),csvOk=priorSnapshotKey===key&&priorSnapshot?.officialVerified===true,exOk=officialSnapshotKey===key&&officialSnapshot?.exhibitionVerified===true,stOk=officialSnapshotKey===key&&officialSnapshot?.startVerified===true,resultOk=verifiedFinish?.key===key&&Array.isArray(verifiedFinish.places)&&verifiedFinish.places.length===3;const complete=csvOk&&exOk&&stOk&&resultOk;out.textContent+='\\n【取得後の照合判定】\\nCSV登録番号：'+(csvOk?'公式6艇一致':'未確認')+'\\n展示6艇：'+(exOk?'確認済':'未確認')+'\\n進入6艇：'+(stOk?'確認済':'未確認')+'\\n公式確定着順：'+(resultOk?'確認済':'未確認')+'\n'+(complete?'4条件が揃いました。「条件と着順を照合」を押して検証を進めてください。':'不足データがあるため、検証登録は保留してください。')+'\n※まくらぼ直近50走は別途未確認です。';}
 }finally{if(version===evidenceLoadVersion)button.disabled=false}
});
document.getElementById('reviewSelectedEvidence').addEventListener('click',()=>{
 const key=currentDataKey(),out=document.getElementById('loadSelectedRaceEvidenceStatus');
 if(priorSnapshotKey!==key||officialSnapshotKey!==key||priorSnapshot?.officialVerified!==true||officialSnapshot?.exhibitionVerified!==true||officialSnapshot?.startVerified!==true||verifiedFinish?.key!==key){out.textContent='検証保留：同一レースの公式登録番号6艇、展示6艇、進入6艇、公式確定着順を確認してください。';return}
 document.getElementById('reviewResult').click();
 const ready=pendingReview?.key===key&&pendingReview.officialResultVerified===true;
 out.textContent=ready?'条件別の照合が成立しました。下の検証結果を確認し、問題なければ「この検証を一時集計に追加」を押してください。':'条件別の照合を実行しましたが、検証は未成立です。下の検証結果に表示された不足・不整合を確認してください。';
});
document.getElementById('scanOfficialResults').addEventListener('click',async()=>{
 const version=++scanVersion,button=document.getElementById('scanOfficialResults'),out=document.getElementById('scanOfficialOutput');
 const date=document.getElementById('date').value.trim(),venue=Number(document.getElementById('venue').value);
 if(!/^20[0-9]{6}$/.test(date)||!Number.isInteger(venue)||venue<1||venue>24){out.textContent='日付・競艇場を確認してください。';return}
 button.disabled=true;const rows=[],reasons={},confirmed=[];const choice=document.getElementById('verifiedRaceChoice'),open=document.getElementById('openVerifiedRace');choice.replaceChildren(new Option('診断中…',''));open.disabled=true;let verified=0,failed=0;out.textContent='公式結果の取得診断中（0/12）';
 try{
  for(let race=1;race<=12;race++){
   if(version!==scanVersion)return;
   try{
    const response=await fetch('/api/official/result?date='+date+'&venue='+venue+'&race='+race);
    const data=await response.json();if(version!==scanVersion)return;
    const order=Array.isArray(data.finishOrder)?data.finishOrder.map(Number):[];
    const valid=response.ok&&data.verified===true&&order.length===6&&new Set(order).size===6&&order.every(n=>Number.isInteger(n)&&n>=1&&n<=6);
    if(valid){verified++;confirmed.push({race,order:order.slice(0,3)});rows.push(race+'R：確認済 '+order.slice(0,3).join('-'))}
    else{failed++;const reason=String(data.reason||'HTTP '+response.status);reasons[reason]=(reasons[reason]||0)+1;rows.push(race+'R：未確認 '+reason)}
   }catch(err){if(version!==scanVersion)return;failed++;reasons.fetch_or_parse_error=(reasons.fetch_or_parse_error||0)+1;rows.push(race+'R：取得失敗 '+String(err.message||err))}
   out.textContent='選択日・同場の結果取得診断 '+race+'/12\\n確認済：'+verified+' / 未確認：'+failed+'\n'+rows.join('\\n');
  }
  if(version===scanVersion){choice.replaceChildren(new Option(confirmed.length?'確認済みレースを選択':'確認済みレースなし',''));for(const item of confirmed)choice.add(new Option(item.race+'R：'+item.order.join('-'),String(item.race)));open.disabled=confirmed.length===0;}
  if(version===scanVersion)out.textContent+='\\n【診断集計】\\n確認済：'+verified+'/12\\n未確認：'+failed+'/12\\n失敗理由：'+(Object.entries(reasons).map(([k,v])=>k+' '+v+'件').join('、')||'なし')+'\n※取得状況の診断です。予想データとの照合や的中率の検証ではありません。';
 }finally{if(version===scanVersion)button.disabled=false}
});
let finishFetchVersion=0;let verifiedFinish=null;
function currentReviewKey(){return document.getElementById('date').value.trim()+'-'+document.getElementById('venue').value+'-'+document.getElementById('race').value}
for(const id of ['finish1','finish2','finish3'])document.getElementById(id).addEventListener('input',()=>{verifiedFinish=null;pendingReview=null;document.getElementById('saveReview').disabled=true;document.getElementById('finishFetchStatus').textContent='着順が編集されたため公式照合状態を解除しました。'});
function resetFinishFetch(){verifiedFinish=null;finishFetchVersion++;document.getElementById('finishFetchStatus').textContent='未取得';document.getElementById('finishDiagnostics').textContent='レース変更により診断をリセットしました。'}
for(const id of ['date','venue','race'])document.getElementById(id).addEventListener('input',resetFinishFetch);
document.getElementById('fetchOfficialFinish').addEventListener('click',async()=>{
 verifiedFinish=null;pendingReview=null;document.getElementById('saveReview').disabled=true;
 const version=++finishFetchVersion,status=document.getElementById('finishFetchStatus'),diagnostics=document.getElementById('finishDiagnostics');diagnostics.textContent='取得中…';
 const date=document.getElementById('date').value.trim(),venue=Number(document.getElementById('venue').value),race=Number(document.getElementById('race').value);
 if(!/^20[0-9]{6}$/.test(date)||!Number.isInteger(venue)||venue<1||venue>24||!Number.isInteger(race)||race<1||race>12){status.textContent='日付・場・レース番号を確認してください';return}
 status.textContent='公式結果を確認中…';
 try{
  const res=await fetch('/api/official/result?date='+date+'&venue='+venue+'&race='+race);
  const d=await res.json();if(version!==finishFetchVersion)return;
  diagnostics.textContent='API応答：HTTP '+res.status+'\\n照合：'+(d.verified===true?'成功':'未確認')+'\\n理由：'+String(d.reason||'なし')+'\\n公式ページHTTP：'+String(d.diagnostics?.upstreamStatus??d.upstreamStatus??'不明')+'\\nHTML文字数：'+String(d.diagnostics?.htmlBytes??'不明')+'\\nテーブル数：'+String(d.diagnostics?.tableCount??'不明')+'\\n結果見出し検出：'+String(d.diagnostics?.hasResultHeading??'不明')+'\\n候補テーブル：'+String(d.parserDiagnostics?.candidateTables??'不明')+' / 読取行数：'+String(d.parserDiagnostics?.parsedRows??'不明')+' / 数字以外の着順：'+String(d.parserDiagnostics?.nonNumericRanks??'不明')+'\n※公式ページの構造変更・未公開・通信失敗を区別するための診断です。';
  const order=Array.isArray(d.finishOrder)?d.finishOrder.map(x=>Number(x)):[];
  if(!res.ok||d.verified!==true||order.length!==6||order.some(x=>!Number.isInteger(x)||x<1||x>6)||new Set(order).size!==6){status.textContent='公式確定着順を照合できません：'+String(d.reason||'未確認');return}
  ['finish1','finish2','finish3'].forEach((id,i)=>{document.getElementById(id).value=String(order[i])});
  verifiedFinish={key:currentReviewKey(),places:order.slice(0,3)};
  pendingReview=null;document.getElementById('saveReview').disabled=true;
  status.textContent='公式結果の着順 '+order.slice(0,3).join('-')+' を入力しました。「条件と着順を照合」で確認してください。';
 }catch(e){if(version===finishFetchVersion){status.textContent='公式結果の取得失敗：'+String(e.message||e);diagnostics.textContent='通信・JSON解析エラー：'+String(e.message||e)}}
});
const reviewRecords=new Map();let pendingReview=null;
function updateReviewAggregate(){
 const out=document.getElementById('reviewAggregate'),records=[...reviewRecords.values()].filter(r=>r.officialResultVerified===true);
 if(!records.length){out.textContent='公式結果照合済みの集計0レース（この画面を閉じると消えます）';return}
 const groups=[['事前3指標の最高値が2項目以上',x=>x.leaderCount>=2],['展示タイム最短',x=>x.fastest],['展示進入変動',x=>x.courseChange]];
 const lines=groups.map(([label,test])=>{let total=0,top3=0,first=0,raceCount=0,raceFirst=0,raceTop3=0;for(const r of records){const eligible=r.observations.filter(test);if(eligible.length){raceCount++;if(eligible.some(x=>r.places[0]===x.boat))raceFirst++;if(eligible.some(x=>r.places.includes(x.boat)))raceTop3++}for(const x of eligible){total++;if(r.places.includes(x.boat))top3++;if(r.places[0]===x.boat)first++}}return label+'：該当 '+raceCount+'レース / 1着該当 '+raceFirst+'レース / 3着以内該当 '+raceTop3+'レース（艇別：'+total+'艇、1着'+first+'艇、3着以内'+top3+'艇）'});
 out.textContent='公式確定着順を取得済みの一時集計：'+records.length+'レース / 30レース目標まで残り '+Math.max(0,30-records.length)+'レース（重複レースは上書き）\\n'+lines.join('\\n')+'\n※公式結果APIで照合した着順のみ集計。該当艇の件数であり的中率・予測精度ではありません。';
}
document.getElementById('saveReview').addEventListener('click',()=>{
 if(!pendingReview||pendingReview.officialResultVerified!==true)return;
 reviewRecords.set(pendingReview.key,pendingReview);pendingReview=null;document.getElementById('saveReview').disabled=true;updateReviewAggregate();
});
document.getElementById('exportReviews').addEventListener('click',()=>{
 const records=[...reviewRecords.values()].filter(r=>r.officialResultVerified===true);
 if(!records.length){document.getElementById('reviewAggregate').textContent='保存できる公式照合済みの検証はありません。';return}
 const quote=v=>'"'+String(v??'').replace(/"/g,'""')+'"';
 const rows=[['race_key','finish_1','finish_2','finish_3','boat','pre_leader_count','fastest_exhibition','exhibition_course_change','official_finish_verified']];
 for(const r of records)for(const x of r.observations)rows.push([r.key,...r.places,x.boat,x.leaderCount,x.fastest?'1':'0',x.courseChange?'1':'0','1']);
 const csv='\\uFEFF'+rows.map(row=>row.map(quote).join(',')).join('\\r\\n');
 const blob=new Blob([csv],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');
 a.href=url;a.download='boat-score-2-verified-review.csv';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);
});
document.getElementById('importReviews').addEventListener('change',async()=>{
 const input=document.getElementById('importReviews'),out=document.getElementById('importReviewStatus'),file=input.files?.[0];
 if(!file)return;
 if(file.size>1024*1024){out.textContent='1MBを超えるCSVは読み込めません。';input.value='';return}
 try{
  const raw=(await file.text()).replace(/^\\uFEFF/,'');
  const parseLine=line=>{const cells=[];let field='',quoted=false;for(let i=0;i<line.length;i++){const c=line[i];if(c==='"'){if(quoted&&line[i+1]==='"'){field+='"';i++}else quoted=!quoted}else if(c===','&&!quoted){cells.push(field);field=''}else field+=c}if(quoted)throw Error('引用符が閉じていません');cells.push(field);return cells};
  const lines=raw.split(/\\r?\\n/).filter(x=>x.trim());if(lines.length<2||lines.length>3001)throw Error('行数が不正です');
  const expected=['race_key','finish_1','finish_2','finish_3','boat','pre_leader_count','fastest_exhibition','exhibition_course_change','official_finish_verified'];
  if(parseLine(lines[0]).join('|')!==expected.join('|'))throw Error('Boat Score 2のCSV列構成と一致しません');
  const records=new Map();
  for(const line of lines.slice(1)){
   const c=parseLine(line);if(c.length!==9)throw Error('列数が一致しません');
   const [key,f1,f2,f3,boat,count,fast,change,verified]=c;
   if(!/^20[0-9]{6}-(?:[1-9]|1[0-9]|2[0-4])-(?:[1-9]|1[0-2])$/.test(key))throw Error('レース識別子が不正です');
   const places=[f1,f2,f3].map(Number),b=Number(boat),n=Number(count);
   if(places.some(x=>!Number.isInteger(x)||x<1||x>6)||new Set(places).size!==3||!Number.isInteger(b)||b<1||b>6||!Number.isInteger(n)||n<0||n>3||!['0','1'].includes(fast)||!['0','1'].includes(change)||verified!=='1')throw Error('値が不正です');
   if(!records.has(key))records.set(key,{places,observations:[]});const rec=records.get(key);
   if(rec.places.join('-')!==places.join('-')||rec.observations.some(x=>x.boat===b))throw Error('重複・不整合データがあります');
   rec.observations.push({boat:b,leaderCount:n,fastest:fast==='1',courseChange:change==='1'});
  }
  if([...records.values()].some(r=>r.observations.length!==6||new Set(r.observations.map(x=>x.boat)).size!==6))throw Error('6艇分揃っていないレースがあります');
  const groups=[['事前3項目で2項目以上最高',x=>x.leaderCount>=2],['展示最短',x=>x.fastest],['展示進入変動',x=>x.courseChange]];
  const linesOut=groups.map(([label,test])=>{let hits=0,first=0,top3=0,raceCount=0,raceFirst=0,raceTop3=0;for(const r of records.values()){const eligible=r.observations.filter(test);if(eligible.length){raceCount++;if(eligible.some(x=>r.places[0]===x.boat))raceFirst++;if(eligible.some(x=>r.places.includes(x.boat)))raceTop3++}for(const x of eligible){hits++;if(r.places[0]===x.boat)first++;if(r.places.includes(x.boat))top3++}}return label+'：該当 '+raceCount+'レース / 1着該当 '+raceFirst+'レース / 3着以内該当 '+raceTop3+'レース（艇別 '+hits+'艇）'});
  out.textContent='CSV参考集計：'+records.size+'レース / 30レース目標まで残り '+Math.max(0,30-records.size)+'レース\\n'+linesOut.join('\\n')+'\n※CSV内の公式照合済みフラグは自己申告値です。今回の読み込みで公式サイトへの再照合は行っていません。現行の公式確認済み集計には混ぜません。';
 }catch(e){out.textContent='CSV読込失敗：'+String(e.message||e)}finally{input.value=''}
});
document.getElementById('clearReviews').addEventListener('click',()=>{reviewRecords.clear();pendingReview=null;document.getElementById('saveReview').disabled=true;updateReviewAggregate()});
function resetHistoricalReview(){pendingReview=null;document.getElementById('saveReview').disabled=true;for(const id of ['finish1','finish2','finish3'])document.getElementById(id).value='';document.getElementById('reviewOutput').textContent='レース変更・データ更新のため照合結果を消去しました。'}
for(const id of ['date','venue','race'])document.getElementById(id).addEventListener('input',resetHistoricalReview);
document.getElementById('reviewResult').addEventListener('click',()=>{
 pendingReview=null;document.getElementById('saveReview').disabled=true;
 const out=document.getElementById('reviewOutput');const places=['finish1','finish2','finish3'].map(id=>{const v=document.getElementById(id).value.trim();return v===''?NaN:Number(v)});
 if(places.some(n=>!Number.isInteger(n)||n<1||n>6)||new Set(places).size!==3){out.textContent='1〜3着に異なる艇番（1〜6）を入力してください。';return}
 if(!priorSnapshot||!officialSnapshot||priorSnapshotKey!==currentDataKey()||officialSnapshotKey!==currentDataKey()||priorSnapshot.officialVerified!==true||officialSnapshot.exhibitionVerified!==true||officialSnapshot.startVerified!==true){out.textContent='同一レースの事前CSV登録番号照合と公式展示・進入の6艇確認が必要です。';return}
 if(!verifiedFinish||verifiedFinish.key!==currentReviewKey()||!verifiedFinish.places.every((x,i)=>x===places[i])){out.textContent='公式結果の着順を取得・照合してください。手入力結果は一時集計に追加できません。';return}
 const boats=priorSnapshot.boats,ex=officialSnapshot.exhibitionByBoat,starts=officialSnapshot.startByCourse,keys=['nationalWinRate','localWinRate','motorPlaceRate'];
 const num=v=>v===null||v===undefined||String(v).trim()===''?null:Number(v);
 if(boats.length!==6||ex.length!==6||starts.length!==6||!boats.every(b=>keys.every(k=>num(b[k])!==null&&Number.isFinite(num(b[k]))))){out.textContent='比較指標が不足しています。';return}
 const boatNumbers=boats.map(b=>Number(b.boat)),exNumbers=ex.map(e=>Number(e.boat)),startNumbers=starts.map(t=>Number(t.boat)),courses=starts.map(t=>Number(t.course)),times=ex.map(e=>Number(e.exhibitionTime));
 const six=[1,2,3,4,5,6];
 if(![boatNumbers,exNumbers,startNumbers,courses].every(a=>a.length===6&&new Set(a).size===6&&six.every(n=>a.includes(n)))||!times.every(t=>Number.isFinite(t)&&t>0)){out.textContent='6艇の艇番・展示進入コース・展示タイムが完全に照合できないため、検証を保留します。';return}
 const max=keys.map(k=>Math.max(...boats.map(b=>num(b[k]))));const min=Math.min(...times);
 const observations=boats.map(b=>{const e=ex.find(x=>Number(x.boat)===Number(b.boat)),t=starts.find(x=>Number(x.boat)===Number(b.boat));return {boat:Number(b.boat),leaderCount:keys.filter((k,i)=>num(b[k])===max[i]).length,fastest:e?Number(e.exhibitionTime)===min:false,courseChange:t?Number(t.course)!==Number(b.boat):false}});
 const key=currentReviewKey();const officialResultVerified=verifiedFinish?.key===key&&verifiedFinish.places.every((x,i)=>x===places[i]);
 pendingReview={key,places,observations,officialResultVerified};document.getElementById('saveReview').disabled=!officialResultVerified;
 out.textContent=(officialResultVerified?'公式結果取得済みの着順：':'手入力の着順（公式未照合・集計不可）：')+places.join('-')+'\n'+observations.map(x=>x.boat+'号艇：'+(places.includes(x.boat)?places.indexOf(x.boat)+1+'着':'3着以内なし')+' / 事前最高値 '+x.leaderCount+'/3 / 展示最短 '+(x.fastest?'該当':'非該当')+' / 進入変動 '+(x.courseChange?'該当':'非該当')).join('\\n')+'\n※単一レースの観察です。予測精度や的中率を示すものではありません。';
});
function renderEvidenceMatrix(){
 const host=document.getElementById('evidenceMatrix');if(!host)return;host.replaceChildren();
 if(!priorSnapshot||!officialSnapshot||priorSnapshotKey!==currentDataKey()||officialSnapshotKey!==currentDataKey()||priorSnapshot.officialVerified!==true||officialSnapshot.exhibitionVerified!==true||officialSnapshot.startVerified!==true)return;
 const boats=priorSnapshot.boats,ex=officialSnapshot.exhibitionByBoat,starts=officialSnapshot.startByCourse;
 if(!Array.isArray(boats)||boats.length!==6||!Array.isArray(ex)||ex.length!==6||!Array.isArray(starts)||starts.length!==6)return;
 const keys=['nationalWinRate','localWinRate','motorPlaceRate'];
 const numeric=v=>v===null||v===undefined||String(v).trim()===''?null:Number(v);
 if(!boats.every(b=>keys.every(k=>numeric(b[k])!==null&&Number.isFinite(numeric(b[k])))))return;
 const maxima=keys.map(k=>Math.max(...boats.map(b=>numeric(b[k]))));
 const times=ex.map(e=>Number(e.exhibitionTime));if(!times.every(t=>Number.isFinite(t)&&t>0))return;
 const shortest=Math.min(...times);
 const title=document.createElement('p');title.textContent='6艇の条件照合表（参考情報・予想判定ではありません）';host.appendChild(title);
 const table=document.createElement('table');table.style.cssText='border-collapse:collapse;min-width:410px;width:100%;font-size:12px';
 const header=document.createElement('tr');['艇','事前3項目の最高値','展示最短','展示進入変動'].forEach(label=>{const th=document.createElement('th');th.textContent=label;th.style.cssText='border-bottom:1px solid #94a3b8;padding:8px 4px;text-align:center';header.appendChild(th)});table.appendChild(header);
 for(const b of boats){const e=ex.find(x=>Number(x.boat)===Number(b.boat)),t=starts.find(x=>Number(x.boat)===Number(b.boat));if(!e||!t)continue;
  const count=keys.filter((k,i)=>numeric(b[k])===maxima[i]).length;
  const tr=document.createElement('tr');[b.boat+'号艇',count+'/3',Number(e.exhibitionTime)===shortest?'該当':'—',Number(t.course)!==Number(b.boat)?'該当':'—'].forEach(v=>{const td=document.createElement('td');td.textContent=String(v);td.style.cssText='padding:8px 4px;text-align:center;border-bottom:1px solid #e2e8f0';tr.appendChild(td)});table.appendChild(tr)
 }host.appendChild(table);
 const note=document.createElement('p');note.style.fontSize='12px';note.textContent='事前CSV数値は非公式で、最高値の項目数は予想スコアではありません。まくらぼ50走・オッズ・本番進入は未反映。';host.appendChild(note);
}
function updateRaceChange(){
 renderEvidenceMatrix();
 const box=document.getElementById('evaluationChange');if(!box)return;
 if(!priorSnapshot||!officialSnapshot||priorSnapshotKey!==currentDataKey()||officialSnapshotKey!==currentDataKey()){box.textContent='同じ日付・競艇場・レースの事前CSVと公式直前情報を両方取得してください。';return}
 if(priorSnapshot.officialVerified!==true){box.textContent='CSVの6艇登録番号が公式と一致していないため、事前数値と直前情報の艇別照合を保留します。';return}
 const ex=officialSnapshot.exhibitionVerified?officialSnapshot.exhibitionByBoat:[];
 const st=officialSnapshot.startVerified?officialSnapshot.startByCourse:[];
 if(ex.length!==6||st.length!==6){box.textContent='公式直前情報の6艇照合が未完了のため、比較を保留します。';return}
 const parts=priorSnapshot.boats.map(b=>{
  const e=ex.find(x=>Number(x.boat)===Number(b.boat));const t=st.find(x=>Number(x.boat)===Number(b.boat));
  return b.boat+'号艇：全国勝率 '+(b.nationalWinRate||'未取得')+' / 当地勝率 '+(b.localWinRate||'未取得')+' / モーター2連対率 '+(b.motorPlaceRate||'未取得')+' → 展示 '+(e?.exhibitionTime??'未確認')+' / 進入 '+(t?.course??'未確認')+' / ST '+(t?.startTiming??'未確認');
 });
 const observations=[];
 if(ex.length===6){
  const valid=ex.every(x=>Number.isFinite(Number(x.exhibitionTime))&&Number(x.exhibitionTime)>0);
  if(valid){const min=Math.min(...ex.map(x=>Number(x.exhibitionTime)));observations.push('展示タイム最短：'+ex.filter(x=>Number(x.exhibitionTime)===min).map(x=>x.boat+'号艇').join('・')+'（'+min+'秒）。最短でも1着を保証しません。')}
 }
 if(st.length===6){
  const changes=st.filter(x=>Number(x.boat)!==Number(x.course));
  observations.push(changes.length?'枠番と展示進入コースが異なる艇：'+changes.map(x=>x.boat+'号艇→'+x.course+'コース').join('、'):'展示進入は全艇が枠番と同じです。');
  observations.push('展示STは本番のSTとは異なります。');
 }

 const evidence=[];
 if(priorSnapshot.officialVerified===true&&ex.length===6&&st.length===6){
  const keys=['nationalWinRate','localWinRate','motorPlaceRate'];
  const number=v=>v===null||v===undefined||String(v).trim()===''?null:Number(v);
  if(priorSnapshot.boats.every(b=>keys.every(k=>number(b[k])!==null&&Number.isFinite(number(b[k]))))){
   const maxima=keys.map(k=>Math.max(...priorSnapshot.boats.map(b=>number(b[k]))));
   const shortest=Math.min(...ex.map(e=>Number(e.exhibitionTime)));
   for(const b of priorSnapshot.boats){
    const e=ex.find(x=>Number(x.boat)===Number(b.boat)),t=st.find(x=>Number(x.boat)===Number(b.boat));if(!e||!t)continue;
    const count=keys.filter((k,i)=>number(b[k])===maxima[i]).length,flags=[];
    if(count>=2)flags.push('事前3指標のうち'+count+'項目で最高値');
    if(Number(e.exhibitionTime)===shortest)flags.push('展示最短');
    if(Number(t.course)!==Number(b.boat))flags.push('展示進入変動');
    if(flags.length)evidence.push(b.boat+'号艇：'+flags.join('、'));
   }
  }else evidence.push('事前指標不足：比較保留');
 }else evidence.push('公式登録番号・展示・進入の照合不足：比較保留');
 box.textContent='事前→直前の項目別照合（優劣や買い目は未判定）\\n'+parts.join('\\n')+'\\n【直前の観察】\\n'+(observations.length?observations.join('\\n'):'照合できた観察項目なし')+'\n※事前CSV数値は非公式。展示進入は本番進入の確定情報ではありません。まくらぼ50走・オッズは未反映。';
 box.textContent+='\\n【候補検討材料（未採点）】\\n'+(evidence.length?evidence.join('、'):'該当なし')+'\\n本命・逆転・穴の判定は保留。';
}

function updateCoverageSummary(){
 const csv=coverageCsv?('CSV '+coverageCsv.populatedFields+'/'+coverageCsv.totalFields+'項目・登録番号'+(coverageCsv.officialVerified?'公式6艇一致':'未照合')):'未取得';
 const before=coverageBefore?('展示'+(coverageBefore.exhibitionVerified?'確認':'不足')+' / ST・進入'+(coverageBefore.startVerified?'確認':'不足')+' / 気象'+(coverageBefore.weatherVerified?'確認':'不足')):'未取得';
 document.getElementById('dataCoverageSummary').textContent='事前データ：'+csv+' / 直前データ：'+before+'。直近50走は別途確認が必要です。';
}
let beforeInfoVersion=0;
function resetBeforeInfo(){invalidatePendingReview();officialSnapshotKey=null;officialSnapshot=null;updateRaceChange();coverageBefore=null;updateCoverageSummary();beforeInfoVersion++;document.getElementById('beforeInfoTable').replaceChildren();document.getElementById('beforeInfoResult').textContent='レース変更後は直前情報を再取得してください。'}
for(const id of ['date','venue','race'])document.getElementById(id).addEventListener('input',resetBeforeInfo);
document.getElementById('loadBeforeInfo').addEventListener('click',async()=>{
 const version=++beforeInfoVersion,out=document.getElementById('beforeInfoResult');
 invalidatePendingReview();officialSnapshotKey=null;officialSnapshot=null;coverageBefore=null;updateRaceChange();updateCoverageSummary();document.getElementById('beforeInfoTable').replaceChildren();
 const date=document.getElementById('date').value.trim(),venue=Number(document.getElementById('venue').value),race=Number(document.getElementById('race').value);
 if(!/^20[0-9]{6}$/.test(date)||venue<1||venue>24||race<1||race>12){out.textContent='日付・競艇場・レース番号を指定してください';return}
 out.textContent='公式直前情報を確認中…（公式サイトが遅い場合があります）';
 try{
  const res=await fetch('/api/official/race-data?date='+date+'&venue='+venue+'&race='+race);
  const d=await res.json();if(version!==beforeInfoVersion)return;
  if(!res.ok){out.textContent='取得失敗：'+String(d.error||res.status);return}
  officialSnapshot=d;officialSnapshotKey=currentDataKey();updateRaceChange();
  coverageBefore={exhibitionVerified:d.exhibitionVerified===true,startVerified:d.startVerified===true,weatherVerified:d.weatherVerified===true};updateCoverageSummary();
  const holder=document.getElementById('beforeInfoTable');holder.replaceChildren();
  const exhibition=d.exhibitionVerified&&Array.isArray(d.exhibitionByBoat)?d.exhibitionByBoat:[];
  const starts=d.startVerified&&Array.isArray(d.startByCourse)?d.startByCourse:[];
  if(exhibition.length===6||starts.length===6){
   const table=document.createElement('table');table.style.cssText='border-collapse:collapse;width:100%;min-width:350px;font-size:13px';
   const header=document.createElement('tr');['艇','展示タイム','チルト','進入コース','展示ST'].forEach(label=>{const th=document.createElement('th');th.textContent=label;th.style.cssText='padding:7px 4px;border-bottom:1px solid #94a3b8';header.appendChild(th)});table.appendChild(header);
   for(let boat=1;boat<=6;boat++){
    const ex=exhibition.find(x=>x.boat===boat),st=starts.find(x=>x.boat===boat),tr=document.createElement('tr');
    [boat,ex?.exhibitionTime??'未確認',ex?.tilt??'未確認',st?.course??'未確認',st?.startTiming??'未確認'].forEach(v=>{const td=document.createElement('td');td.textContent=String(v);td.style.cssText='padding:7px 4px;border-bottom:1px solid #e2e8f0;text-align:center';tr.appendChild(td)});table.appendChild(tr)
   }
   holder.appendChild(table);
  }
  if(d.weatherVerified&&d.weather){const p=document.createElement('p');p.style.fontSize='13px';p.textContent='公式水面気象：風速 '+(d.weather.windSpeed??'未確認')+'m / 風向 '+(d.windDirectionVerified?d.weather.windDirection:'未確認')+' / 波高 '+(d.weather.waveHeight??'未確認')+'cm';holder.appendChild(p)}
  if(!holder.children.length){const p=document.createElement('p');p.textContent='表示可能な公式直前データはありません。未確認値を補完しません。';holder.appendChild(p)}
  const missing=Array.isArray(d.missingInputs)?d.missingInputs.join('、'):'詳細不明';
  out.textContent='公式直前情報の取得状況\n'+
   '出走表：'+(d.racersVerified?'確認済み':'未確認')+'\n'+
   '展示・ST・気象など：'+(d.dataReadyForPrediction?'全条件確認済み':'不足あり')+'\n'+
   '不足項目：'+missing+'\n'+
   '公式照合が完了しない項目は評価に採用しません。'+'\n'+
   '診断：直前HTML='+String(d.diagnostics?.beforeinfoResponseLength??'未取得')+'文字 / 展示候補='+String(d.diagnostics?.exhibitionCandidateCount??0)+'艇 / ST候補='+String(d.diagnostics?.startCandidateCount??0)+'艇 / 取得理由='+String(d.diagnostics?.beforeinfoReason??'不明')+' / 気象='+String(d.diagnostics?.weatherParserReason??'未特定');
 }catch(e){if(version===beforeInfoVersion)out.textContent='公式直前情報の取得失敗：'+String(e.message||e)}
});
let csvCardVersion=0;
let verifiedCsvIds=null;
document.getElementById('fillCsvRacerIds').addEventListener('click',()=>{
 if(!verifiedCsvIds||verifiedCsvIds.version!==csvCardVersion)return;
 const targets=Array.from({length:6},(_,i)=>document.querySelector('#rows input[data-boat="'+(i+1)+'"][data-index="0"]'));
 if(targets.some(x=>!x)){document.getElementById('csvFillStatus').textContent='入力欄が見つかりません';return}
 if(targets.some((x,i)=>x.value.trim()&&x.value.trim()!==verifiedCsvIds.ids[i])){document.getElementById('csvFillStatus').textContent='既存の登録番号と異なります。上書きしません。';return}
 targets.forEach((x,i)=>{x.value=verifiedCsvIds.ids[i];x.dispatchEvent(new Event('input',{bubbles:true}))});
 document.getElementById('csvFillStatus').textContent='公式と一致した登録番号6艇分を入力しました。50走の着順回数は未入力です。';
});
function clearCsvCard(){invalidatePendingReview();priorSnapshotKey=null;priorSnapshot=null;updateRaceChange();coverageCsv=null;updateCoverageSummary();document.getElementById('csvComparison').replaceChildren();csvCardVersion++;verifiedCsvIds=null;document.getElementById('fillCsvRacerIds').disabled=true;document.getElementById('csvFillStatus').textContent='レース変更後は再照合が必要です。';document.getElementById('csvCardResult').textContent='レース条件が変わりました。CSVを再取得してください。'}
for(const id of ['date','venue','race'])document.getElementById(id).addEventListener('input',clearCsvCard);
document.getElementById('loadCsvCard').addEventListener('click',async()=>{
 invalidatePendingReview();priorSnapshotKey=null;priorSnapshot=null;updateRaceChange();
 const version=++csvCardVersion,out=document.getElementById('csvCardResult');
 const date=document.getElementById('date').value.trim(),venue=Number(document.getElementById('venue').value),race=Number(document.getElementById('race').value);
 if(!/^20[0-9]{6}$/.test(date)||!Number.isInteger(venue)||venue<1||venue>24||!Number.isInteger(race)||race<1||race>12){out.textContent='日付・競艇場・レース番号を選択してください';return}
 out.textContent='非公式CSVを取得中…';
 try{
  const response=await fetch('/api/csv/race-card?date='+encodeURIComponent(date)+'&venue='+venue+'&race='+race);
  const data=await response.json();if(version!==csvCardVersion)return;
  if(!response.ok||!data.verified||!Array.isArray(data.boats)||data.boats.length!==6){out.textContent='CSV照合できませんでした：'+String(data.reason||data.error||response.status);return}
  verifiedCsvIds=null;document.getElementById('fillCsvRacerIds').disabled=true;
  const ids=data.boats.map(b=>String(b.racerId||'').trim());
  if(data.officialVerified===true&&ids.every(x=>/^[0-9]{4}$/.test(x))&&new Set(ids).size===6){verifiedCsvIds={ids,version};document.getElementById('fillCsvRacerIds').disabled=false;document.getElementById('csvFillStatus').textContent='公式と一致した登録番号を入力できます。'}
  else document.getElementById('csvFillStatus').textContent='公式照合が未完了のため登録番号は自動入力しません。';
  priorSnapshot=data;priorSnapshotKey=currentDataKey();updateRaceChange();
  coverageCsv={populatedFields:data.populatedFields,totalFields:data.totalFields,officialVerified:data.officialVerified===true};updateCoverageSummary();
  const comparison=document.getElementById('csvComparison');comparison.replaceChildren();
  const validNumber=x=>{const n=Number(x);return String(x??'').trim()!==''&&Number.isFinite(n)?n:null};
  const metrics=[['全国勝率','nationalWinRate'],['当地勝率','localWinRate'],['モーター2連対率','motorPlaceRate']];
  const table=document.createElement('table');table.style.cssText='border-collapse:collapse;width:100%;min-width:360px;font-size:13px';
  const head=document.createElement('tr');['艇','選手名',...metrics.map(x=>x[0])].forEach(label=>{const th=document.createElement('th');th.textContent=label;th.style.cssText='border-bottom:1px solid #94a3b8;padding:8px 4px;text-align:left';head.appendChild(th)});table.appendChild(head);
  for(const b of data.boats){const tr=document.createElement('tr');const cells=[b.boat,b.name||'未取得',...metrics.map(x=>b[x[1]]||'—')];cells.forEach((value,i)=>{const td=document.createElement('td');td.textContent=String(value);td.style.cssText='border-bottom:1px solid #e2e8f0;padding:8px 4px';if(i>=2){const nums=data.boats.map(row=>validNumber(row[metrics[i-2][1]])).filter(x=>x!==null);if(nums.length===6&&validNumber(value)===Math.max(...nums))td.style.fontWeight='bold'}tr.appendChild(td)});table.appendChild(tr)}
  const status=document.createElement('p');status.style.cssText='font-size:13px;line-height:1.6';
  const coverage=metrics.map(([label,key])=>label+' '+data.boats.filter(b=>validNumber(b[key])!==null).length+'/6艇').join(' / ');
  status.textContent='データ確認：'+(data.officialVerified?'選手登録番号6艇一致':'選手登録番号の公式照合未完了')+'。取得状況：'+coverage+'。不足：展示タイム、展示ST、進入、風向・風速、波高、まくらぼ直近50走。CSV数値は公式未照合。';
  const provisional=document.createElement('section');provisional.style.cssText='border-top:1px solid #cbd5e1;padding:10px 0';
  const title=document.createElement('strong');title.textContent='事前評価（試作・判定保留）';provisional.appendChild(title);
  const info=document.createElement('p');info.style.cssText='font-size:13px;line-height:1.6';
  const rates=data.boats.map(b=>({boat:b.boat,rate:validNumber(b.nationalWinRate)}));
  if(rates.every(b=>b.rate!==null)&&rates.length===6){
   const sorted=rates.slice().sort((a,b)=>b.rate-a.rate);
   info.textContent='全国勝率の単純順位：'+sorted.map(x=>x.boat+'号艇 '+x.rate.toFixed(2)).join(' / ')+'。本命・逆転・穴の判定は保留。枠順、進入、展示、直近50走、オッズの確認が必要です。';
  }else info.textContent='全国勝率の不足により参考順位も表示できません。';
  provisional.appendChild(info);
  const multi=document.createElement('p');multi.style.cssText='font-size:13px;line-height:1.6';
  const keys=[['全国勝率','nationalWinRate'],['当地勝率','localWinRate'],['モーター2連対率','motorPlaceRate']];
  const ranks=keys.map(([label,key])=>{
   const values=data.boats.map(b=>({boat:b.boat,value:validNumber(b[key])}));
   if(values.length!==6||values.some(x=>x.value===null))return label+'：未評価（不足）';
   const max=Math.max(...values.map(x=>x.value));
   return label+'の上位：'+values.filter(x=>x.value===max).map(x=>x.boat+'号艇').join('・')+'（'+max+'）';
  });
  multi.textContent='項目別比較（重み付けなし）：'+ranks.join(' / ')+'。異なる指標を合算して順位を決めることはしません。';
  provisional.appendChild(multi);

  const note=document.createElement('p');note.textContent='太字は各項目の最大値（同率を含む）。非公式CSVの単純比較であり、本命・穴の判定や的中確率ではありません。展示・ST・風・直近50走は未反映。';note.style.cssText='font-size:13px;color:#475569';comparison.append(status,table,provisional,note);
  const headings=['艇','選手名','全国勝率','当地勝率','モーター2連対率'];
  out.textContent='非公式CSV（予想点に未反映）\n'+
   '取得項目：'+data.populatedFields+'/'+data.totalFields+'（空欄は未取得）\n'+
   '公式登録番号照合：'+(data.officialVerified?'6艇一致':data.verificationStatus==='csv_racer_ids_missing'?'CSVに登録番号が不足':data.verificationStatus==='official_unavailable'?'公式情報を取得できません':data.verificationStatus==='racer_ids_mismatch'?'登録番号が一致しません':'未確認')+'\n'+
   (data.officialFailureReason?'公式照合失敗理由：'+data.officialFailureReason+'\n':'')+headings.join(' / ')+'\n'+data.boats.map(b=>[b.boat,b.name||'未取得',b.nationalWinRate||'未取得',b.localWinRate||'未取得',b.motorPlaceRate||'未取得'].join(' / ')).join('\n');
 }catch(e){if(version===csvCardVersion)out.textContent='CSV取得エラー：'+String(e.message||e)}
});
const japanDateParts=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Tokyo',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date()).filter(part=>part.type!=='literal').map(part=>[part.type,part.value]));
const japanToday=japanDateParts.year+japanDateParts.month+japanDateParts.day;
document.getElementById('date').value=japanToday;
updateOfficialRaceLink();
document.getElementById('dailyRankingDate').textContent='対象日：'+japanToday+'（日本時間）';
document.querySelectorAll('[data-ranking]').forEach(button=>button.addEventListener('click',()=>{
 const names={main:'本命寄り',upset:'穴候補',chaos:'本命崩れ・大荒れ候補'};
 document.getElementById('dailyRankingList').replaceChildren();
 document.getElementById('dailyRankingStatus').textContent=names[button.dataset.ranking]+'：検証済みの朝8時分析データはまだありません。架空の順位は表示しません。';
}));

for(let boat=1;boat<=6;boat++){const card=document.createElement('fieldset');card.style.cssText='border:1px solid #cbd5e1;border-radius:12px;padding:12px;min-width:0';const heading=document.createElement('legend');heading.textContent=boat+'号艇';heading.style.fontWeight='bold';card.appendChild(heading);const grid=document.createElement('div');grid.style.cssText='display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px';for(let i=0;i<8;i++){const label=document.createElement('label');label.style.cssText='margin:0;min-width:0';const name=i===0?'登録番号':i===1?'走数':(i-1)+'着';label.textContent=name+' ';const input=document.createElement('input');input.setAttribute('aria-label',boat+'号艇 '+name);input.dataset.boat=String(boat);input.dataset.index=String(i);input.type=i===0?'text':'number';input.inputMode='numeric';input.required=true;input.style.cssText='box-sizing:border-box;width:100%;min-width:0';if(i===0)input.maxLength=4;else{input.min='0';input.max='50'}label.appendChild(input);grid.appendChild(label)}card.appendChild(grid);rows.appendChild(card)}
const venueSelector=document.getElementById('venue');
function filterConfirmedVenues(){
 const only=document.getElementById('showConfirmedOnly').checked;
 for(const option of venueSelector.options){if(!option.value)continue;const hide=only&&!option.textContent.includes('（公式1R確認済）');option.hidden=hide;option.disabled=hide}
 if(only&&venueSelector.selectedOptions[0]?.disabled){venueSelector.value='';clearOfficialRacerAutofill()}
}
document.getElementById('showConfirmedOnly').addEventListener('change',filterConfirmedVenues);
let venueCheckVersion=0;
let racerFillVersion=0;
let raceDataCheckVersion=0;
function clearOfficialRacerAutofill(){
 raceDataCheckVersion++;
 document.getElementById('raceDataStatus').textContent='レース条件が変わりました。再確認してください';
 document.getElementById('last50Comparison').replaceChildren();
 // Never carry prior race's manually entered finish counts into another race.
 for(const input of rows.querySelectorAll('input[data-index]:not([data-index="0"])'))input.value='';
 document.getElementById('countStatus').textContent='レース条件が変わったため、前レースの走数・着順回数を消去しました。';
 document.getElementById('result').textContent='前レースの照合結果は無効です。新しいレースで再照合してください。';
 racerFillVersion++;
 for(let boat=1;boat<=6;boat++){
  const input=rows.querySelector('input[data-boat="'+boat+'"][data-index="0"]');
  if(input&&input.dataset.officialAutofilled==='true'){input.value='';delete input.dataset.officialAutofilled}
 }
 document.getElementById('fillStatus').textContent='レース条件が変わりました。公式登録番号を再取得してください';
}
for(const id of ['date','venue','race'])document.getElementById(id).addEventListener('change',clearOfficialRacerAutofill);
rows.addEventListener('input',event=>{const input=event.target;if(input.matches('input[data-index="0"]')){racerFillVersion++;delete input.dataset.officialAutofilled}});
document.getElementById('date').addEventListener('input',()=>{
 raceDataCheckVersion++;
 document.getElementById('raceDataStatus').textContent='日付が変更されました。再確認してください';
 document.getElementById('last50Comparison').replaceChildren();
 venueCheckVersion++;
 const selector=document.getElementById('venue');
 for(const option of selector.options){option.textContent=option.textContent.replace(/ （公式1R確認済）$/,'')}
 document.getElementById('allVenuesStatus').textContent='日付が変更されました。24場を再確認してください';
 document.getElementById('scheduleStatus').textContent='日付が変更されました。開催一覧の候補を再確認してください';
 document.getElementById('venueStatus').textContent='日付が変更されました。開催情報は未確認です';
 document.getElementById('fillStatus').textContent='';
 filterConfirmedVenues();
});
document.getElementById('checkAllVenues').addEventListener('click',async()=>{
 const status=document.getElementById('allVenuesStatus');
 const date=document.getElementById('date').value.trim();
 if(!/^20[0-9]{6}$/.test(date)){status.textContent='日付を確認してください';return}
 const selector=document.getElementById('venue');
 const options=[...selector.options].filter(o=>o.value);
 options.forEach(o=>{o.disabled=false;o.textContent=o.textContent.replace(/ （公式1R確認済）$/,'')});
 filterConfirmedVenues();
 const button=document.getElementById('checkAllVenues');button.disabled=true;
 const currentCheck=++venueCheckVersion;
 try{
 status.textContent='24場の公式1Rを照合中…（未確認の場は選択可能のまま）';
 let confirmed=0,unknown=0;
 for(let offset=0;offset<options.length;offset+=4){
  const batch=options.slice(offset,offset+4);
  const results=await Promise.all(batch.map(async option=>{
   try{const response=await fetch('/api/official/racers?'+new URLSearchParams({date,venue:option.value,race:'1'}),{signal:AbortSignal.timeout(12000)});
    const data=await response.json();return response.ok&&data.racersByBoatVerified===true}catch{return false}
  }));
  if(currentCheck!==venueCheckVersion)return;
  results.forEach((verified,i)=>{if(verified){confirmed++;batch[i].textContent+=' （公式1R確認済）'}else unknown++});
  filterConfirmedVenues();
  status.textContent='確認中：'+Math.min(offset+4,24)+'/24場、公式1R確認済 '+confirmed+'場、未確認 '+unknown+'場';
 }
 status.textContent='公式1R確認済 '+confirmed+'場／未確認 '+unknown+'場。未確認は非開催を意味しません。';
 }catch{status.textContent='一括確認で予期しないエラーが発生しました。開催状況は未確定です。'}finally{button.disabled=false}
});
document.getElementById('checkSchedule').addEventListener('click',async()=>{
 const status=document.getElementById('scheduleStatus');
 const date=document.getElementById('date').value.trim();
 if(!/^20[0-9]{6}$/.test(date)){status.textContent='日付を確認してください';return}
 const button=document.getElementById('checkSchedule');button.disabled=true;
 try{
  status.textContent='公式開催一覧を確認中…';
  const response=await fetch('/api/official/schedule?'+new URLSearchParams({date}),{signal:AbortSignal.timeout(12000)});
  const data=await response.json();
  if(date!==document.getElementById('date').value.trim())return;
  if(!response.ok){status.textContent='開催一覧の取得に失敗しました';return}
  const codes=Array.isArray(data.venues)?data.venues:[];
  const names=codes.map(code=>[...document.getElementById('venue').options].find(o=>o.value===String(code))?.textContent).filter(Boolean);
  status.textContent='公式リンクから抽出した候補 '+names.length+'場：'+(names.join('、')||'なし')+'。未検証のため、開催確定や選択制限には使用しません';
 }catch{if(date===document.getElementById('date').value.trim())status.textContent='開催一覧の通信エラーです。開催・非開催は未判定です'}finally{button.disabled=false}
});
document.getElementById('checkVenue').addEventListener('click',async()=>{
 const status=document.getElementById('venueStatus');
 const date=document.getElementById('date').value.trim(),venue=document.getElementById('venue').value.trim();
 if(!/^20[0-9]{6}$/.test(date)||!/^([1-9]|1[0-9]|2[0-4])$/.test(venue)){status.textContent='日付と競艇場を選択してください';return}
 status.textContent='公式1R出走表を確認中…';
 const checkVersion=venueCheckVersion;
 try{
  const response=await fetch('/api/official/racers?'+new URLSearchParams({date,venue,race:'1'}),{signal:AbortSignal.timeout(12000)});
  const data=await response.json();
  if(checkVersion!==venueCheckVersion||date!==document.getElementById('date').value.trim()||venue!==document.getElementById('venue').value.trim())return;
  status.textContent=response.ok&&data.racersByBoatVerified===true?'公式1R出走表を確認できました（開催確認の参考情報）':'公式1R出走表を確認できません。非開催とは断定できません';
 }catch{if(checkVersion===venueCheckVersion&&date===document.getElementById('date').value.trim()&&venue===document.getElementById('venue').value.trim())status.textContent='通信エラー：開催・非開催は未判定です'}
});
document.getElementById('checkRaceData').addEventListener('click',async()=>{
 const status=document.getElementById('raceDataStatus');
 const date=document.getElementById('date').value.trim(),venue=document.getElementById('venue').value.trim(),race=document.getElementById('race').value.trim();
 if(!/^20[0-9]{6}$/.test(date)||!/^([1-9]|1[0-9]|2[0-4])$/.test(venue)||!/^([1-9]|1[0-2])$/.test(race)){status.textContent='日付・競艇場・レース番号を確認してください';return}
 const checkVersion=++raceDataCheckVersion;
 const button=document.getElementById('checkRaceData');button.disabled=true;
 document.getElementById('last50Comparison').replaceChildren();
 status.textContent='公式出走表・展示・スタート・気象を照合中…';
 try{
  const params=new URLSearchParams({date,venue,race});
  const [response,makulaboResponse]=await Promise.all([
   fetch('/api/official/race-data?'+params,{signal:AbortSignal.timeout(20000)}),
   fetch('/api/makulabo/heatmap?'+params,{signal:AbortSignal.timeout(12000)}).catch(()=>null)
  ]);
  const data=await response.json();
  const makulabo=makulaboResponse?.ok?await makulaboResponse.json():null;
  if(checkVersion!==raceDataCheckVersion||date!==document.getElementById('date').value.trim()||venue!==document.getElementById('venue').value.trim()||race!==document.getElementById('race').value.trim())return;
  if(!response.ok){status.textContent='公式データの取得に失敗しました';return}
  const checks=[['選手',data.racersVerified],['勝率・モーター',data.statsVerified],['展示',data.exhibitionVerified],['ST・進入',data.startVerified],['風速・波',data.weatherVerified],['風向',data.windDirectionVerified],['まくらぼ50走',makulabo?.last50Verified],['まくらぼヒートマップ',makulabo?.heatmapReadyForAnalysis]];
  status.textContent=checks.map(([name,ok])=>name+'：'+(ok===true?'確認済':'未確認')).join(' ／ ')+'。'+(data.dataReadyForPrediction===true&&makulabo?.last50Verified===true?'データ準備完了':'不足項目があるため予想は保留');
  const comparison=document.getElementById('last50Comparison');comparison.replaceChildren();
  const missingLabels={racers:'選手情報',stats:'勝率・モーター',exhibition:'展示情報',start:'進入・展示ST',weather:'風速・波高',windDirection:'風向'};
  const missing=Array.isArray(data.missingInputs)?data.missingInputs.filter(key=>Object.hasOwn(missingLabels,key)):[];
  const missingLine=document.createElement('p');
  missingLine.textContent='公式データの不足項目：'+(missing.length?missing.map(key=>missingLabels[key]).join('、'):'なし（取得項目の照合結果）');
  comparison.appendChild(missingLine);
  const makulaboLine=document.createElement('p');
  const makulaboIssues=[];
  if(!makulaboResponse?.ok)makulaboIssues.push('取得できませんでした（通信または取得先の制限）');
  else if(makulabo?.status==='unavailable'){
   const reasons={access_restricted_or_login_required:'ログイン・会員登録が必要な可能性',heatmap_requires_client_side_rendering:'ページ内で追加読み込みが必要',heatmap_not_present_in_response:'取得ページにヒートマップが見つかりません'};
   makulaboIssues.push(reasons[makulabo.reason]||'取得ページを確認できません');
  }
  else if(makulabo?.status!=='unavailable'){
   if(makulabo?.last50Verified!==true)makulaboIssues.push('直近50走の確認ができません');
   if(makulabo?.heatmapReadyForAnalysis!==true)makulaboIssues.push('ヒートマップの確認ができません');
  }
  makulaboLine.textContent='まくらぼの不足項目：'+(makulaboIssues.length?makulaboIssues.join('、'):'なし（取得項目の照合結果）');
  comparison.appendChild(makulaboLine);
  const weatherHeading=document.createElement('h3');weatherHeading.textContent='水面気象・確認状況';comparison.appendChild(weatherHeading);
  const weatherLine=document.createElement('p');
  const w=data.weatherVerified===true?data.weather:null;
  weatherLine.textContent='風速：'+(w&&Number.isFinite(w.windSpeed)?w.windSpeed+'m/s':'未確認')+' ／ 波高：'+(w&&Number.isFinite(w.waveHeight)?w.waveHeight+'cm':'未確認')+' ／ 風向：'+(data.windDirectionVerified===true&&w?.windDirection?w.windDirection:'未確認');
  comparison.appendChild(weatherLine);
  const weatherCaution=document.createElement('p');
  const weatherAlerts=[];
  if(w&&Number.isFinite(w.windSpeed)&&w.windSpeed>=5)weatherAlerts.push('風速5m/s以上');
  if(w&&Number.isFinite(w.waveHeight)&&w.waveHeight>=5)weatherAlerts.push('波高5cm以上');
  if(weatherAlerts.length)weatherCaution.textContent='水面状況の注意：'+weatherAlerts.join('・')+'。これは確認済み数値に基づく表示で、艇ごとの有利不利や着順を推定するものではありません。';
  else if(!w)weatherCaution.textContent='水面状況は未確認です。風や波の条件を推測で補いません。';
  else weatherCaution.textContent='風速・波高の確認値を表示しています。水面条件だけで着順を推定しません。';
  comparison.appendChild(weatherCaution);
  const weatherNote=document.createElement('p');weatherNote.textContent='風・波は現在の5指標比較点に加点していません。風向は公式データから確認できるまで未確認と表示します。';comparison.appendChild(weatherNote);
  if(data.racersVerified===true&&Array.isArray(data.racersByBoat)&&data.racersByBoat.length===6){
   const heading=document.createElement('h3');heading.textContent='公式データ・6艇比較';comparison.appendChild(heading);
   const wrap=document.createElement('div');wrap.style.cssText='max-width:100%;overflow-x:auto';
   const table=document.createElement('table');table.style.cssText='border-collapse:collapse;font-size:13px;white-space:nowrap';
   const header=document.createElement('tr');['艇','選手','全国勝率','当地勝率','モーター2連率','展示タイム','チルト','進入','展示ST'].forEach(label=>{const th=document.createElement('th');th.textContent=label;th.style.cssText='border:1px solid #cbd5e1;padding:5px';header.appendChild(th)});table.appendChild(header);
   const statMap=new Map((data.statsVerified===true?data.statsByBoat:[]).map(x=>[x.boat,x]));
   const exhibitionMap=new Map((data.exhibitionVerified===true?data.exhibitionByBoat:[]).map(x=>[x.boat,x]));
   const startMap=new Map((data.startVerified===true?data.startByCourse:[]).map(x=>[x.boat,x]));
   const show=value=>value===null||value===undefined?'未確認':String(value);
   data.racersByBoat.slice().sort((a,b)=>a.boat-b.boat).forEach(racer=>{
    const stat=statMap.get(racer.boat),exhibition=exhibitionMap.get(racer.boat),start=startMap.get(racer.boat);
    const values=[racer.boat,racer.name,stat?.nationwide?.winRate,stat?.local?.winRate,stat?.motor?.secondPlaceRate===undefined?null:stat.motor.secondPlaceRate+'%',exhibition?.exhibitionTime,exhibition?.tilt,start?.course,start?.startTiming];
    const tr=document.createElement('tr');values.forEach(value=>{const td=document.createElement('td');td.textContent=show(value);td.style.cssText='border:1px solid #cbd5e1;padding:5px;text-align:center';tr.appendChild(td)});table.appendChild(tr);
   });
   wrap.appendChild(table);comparison.appendChild(wrap);
   const note=document.createElement('p');note.textContent='確認済みの公式データのみ表示。展示STは本番のSTではありません。未確認項目は予想に利用しません。';comparison.appendChild(note);
  }
  if(makulabo?.last50Verified!==true){
   const partial=Array.isArray(makulabo?.last50PartialRows)?makulabo.last50PartialRows.filter(row=>row.verified===true&&Number.isInteger(row.boat)&&row.boat>=1&&row.boat<=6&&Number.isInteger(row.runs)&&row.runs>0&&Array.isArray(row.counts)&&row.counts.length===6&&row.counts.every(n=>Number.isInteger(n)&&n>=0)&&row.counts.reduce((sum,n)=>sum+n,0)===row.runs):[];
   const warning=document.createElement('p');warning.textContent=partial.length?'まくらぼ50走：'+partial.length+'艇の公式選手名照合済みデータを参考比較として表示します。未掲載の艇は未確認。6艇照合未完了のため30点評価・予想点には反映しません。':'まくらぼ直近50走が未確認のため、50走比較と30点評価は表示できません。';comparison.appendChild(warning);
   if(partial.length){
    const heading=document.createElement('h3');heading.textContent='まくらぼ直近50走・取得済み艇の参考比較';comparison.appendChild(heading);
    const wrap=document.createElement('div');wrap.style.cssText='max-width:100%;overflow-x:auto';
    const table=document.createElement('table');table.style.cssText='border-collapse:collapse;font-size:13px;white-space:nowrap';
    const head=document.createElement('tr');['艇','選手','走数','1着率','3連対率','平均着順','確認'].forEach(label=>{const th=document.createElement('th');th.textContent=label;th.style.cssText='border:1px solid #cbd5e1;padding:5px';head.appendChild(th)});table.appendChild(head);
    const byBoat=new Map(partial.map(row=>[row.boat,row]));
    const official=Array.isArray(makulabo?.last50IdentityComparison?.official)?makulabo.last50IdentityComparison.official:[];
    for(let boat=1;boat<=6;boat++){
     const row=byBoat.get(boat),tr=document.createElement('tr');
     const values=row?[boat,row.name,row.runs,(100*row.counts[0]/row.runs).toFixed(1)+'%',(100*(row.counts[0]+row.counts[1]+row.counts[2])/row.runs).toFixed(1)+'%',Number.isFinite(row.average)?row.average.toFixed(2):'未確認','公式名照合済']: [boat,official.find(r=>r.boat===boat)?.name||'未確認','未確認','未確認','未確認','未確認','未掲載'];
     values.forEach(value=>{const td=document.createElement('td');td.style.cssText='border:1px solid #cbd5e1;padding:5px';td.textContent=String(value);tr.appendChild(td)});table.appendChild(tr);
    }
    wrap.appendChild(table);comparison.appendChild(wrap);
   }
  }
  if(makulabo?.last50Verified===true&&!(makulabo?.last50Verified===true&&Array.isArray(makulabo.last50ByBoat)&&makulabo.last50ByBoat.length===6&&makulabo.last50ByBoat.every(row=>Number.isInteger(row.boat)&&row.boat>=1&&row.boat<=6&&Number.isInteger(row.runs)&&row.runs>0&&Array.isArray(row.counts)&&row.counts.length===6&&row.counts.every(n=>Number.isInteger(n)&&n>=0)&&row.counts.reduce((sum,n)=>sum+n,0)===row.runs)&&new Set(makulabo.last50ByBoat.map(row=>row.boat)).size===6)){const warning=document.createElement('p');warning.textContent='まくらぼ直近50走の集計が不整合です。艇番・走数・着順合計を再確認してください。比較点は表示しません。';comparison.appendChild(warning)}
  if(makulabo?.last50Verified===true&&Array.isArray(makulabo.last50ByBoat)&&makulabo.last50ByBoat.length===6&&makulabo.last50ByBoat.every(row=>Number.isInteger(row.boat)&&row.boat>=1&&row.boat<=6&&Number.isInteger(row.runs)&&row.runs>0&&Array.isArray(row.counts)&&row.counts.length===6&&row.counts.every(n=>Number.isInteger(n)&&n>=0)&&row.counts.reduce((sum,n)=>sum+n,0)===row.runs)&&new Set(makulabo.last50ByBoat.map(row=>row.boat)).size===6){
   const heading=document.createElement('h3');heading.textContent='まくらぼ直近50走・枠別比較';comparison.appendChild(heading);
   const note=document.createElement('p');note.textContent='公式選手名と照合済みの集計値です。1着率と3連対率は直近走数を分母に計算した参考値です。予想評価点にはまだ変換していません。';comparison.appendChild(note);
   const scroll=document.createElement('div');scroll.style.cssText='max-width:100%;overflow-x:auto';
   const table=document.createElement('table');table.style.cssText='border-collapse:collapse;font-size:13px;white-space:nowrap';
   const header=document.createElement('tr');['艇','選手','1着','2着','3着','4着','5着','6着','走数','平均','1着率','3連対率'].forEach(label=>{const th=document.createElement('th');th.textContent=label;th.style.cssText='border:1px solid #cbd5e1;padding:4px';header.appendChild(th)});table.appendChild(header);
   const summary=document.createElement('p');
   const sortedByFirst=makulabo.last50ByBoat.slice().sort((a,b)=>(b.counts[0]/b.runs)-(a.counts[0]/a.runs)||a.boat-b.boat);
   const sortedByTop3=makulabo.last50ByBoat.slice().sort((a,b)=>((b.counts[0]+b.counts[1]+b.counts[2])/b.runs)-((a.counts[0]+a.counts[1]+a.counts[2])/a.runs)||a.boat-b.boat);
   summary.textContent='参考比較（直近走数ベース）：1着率トップ '+sortedByFirst[0].boat+'号艇 ／ 3連対率トップ '+sortedByTop3[0].boat+'号艇。枠・相手関係・展示・風などを反映した予想順位ではありません。';
   comparison.appendChild(summary);
   const officialReady=data.racersVerified===true&&data.statsVerified===true&&data.exhibitionVerified===true&&data.startVerified===true&&Array.isArray(data.statsByBoat)&&data.statsByBoat.length===6&&Array.isArray(data.exhibitionByBoat)&&data.exhibitionByBoat.length===6&&Array.isArray(data.startByCourse)&&data.startByCourse.length===6;
   if(!officialReady){const warning=document.createElement('p');warning.textContent='5指標比較は未表示：公式の出走表・勝率とモーター・展示・進入/STのいずれかが未確認です。';comparison.appendChild(warning)}
   const uniqueSix=rows=>Array.isArray(rows)&&rows.length===6&&new Set(rows.map(x=>x.boat)).size===6&&rows.every(x=>Number.isInteger(x.boat)&&x.boat>=1&&x.boat<=6);
   const racerMatch=officialReady&&uniqueSix(data.racersByBoat)&&uniqueSix(data.statsByBoat)&&uniqueSix(data.exhibitionByBoat)&&uniqueSix(data.startByCourse)&&data.racersByBoat.every(racer=>data.statsByBoat.some(stat=>stat.boat===racer.boat&&String(stat.racerId)===String(racer.racerId)))&&new Set(data.startByCourse.map(row=>row.course)).size===6&&data.startByCourse.every(row=>Number.isInteger(row.course)&&row.course>=1&&row.course<=6);
   if(officialReady&&!racerMatch){const warning=document.createElement('p');warning.textContent='5指標比較は未表示：公式データの艇番・選手ID・進入の対応を確認できません。';comparison.appendChild(warning)}
   if(racerMatch){
    const stats=new Map(data.statsByBoat.map(x=>[x.boat,x]));
    const exhibitions=new Map(data.exhibitionByBoat.map(x=>[x.boat,x]));
    const starts=new Map(data.startByCourse.map(x=>[x.boat,x]));
    const complete=makulabo.last50ByBoat.every(row=>{
     const stat=stats.get(row.boat),ex=exhibitions.get(row.boat),st=starts.get(row.boat);
     return stat&&ex&&st&&Number.isFinite(stat.nationwide?.winRate)&&stat.nationwide.winRate>=0&&stat.nationwide.winRate<=10&&Number.isFinite(stat.motor?.secondPlaceRate)&&stat.motor.secondPlaceRate>=0&&stat.motor.secondPlaceRate<=100&&Number.isFinite(ex.exhibitionTime)&&ex.exhibitionTime>=5&&ex.exhibitionTime<=9&&Number.isInteger(st.course)&&typeof st.startTiming==='number'&&Number.isFinite(st.startTiming)&&st.startTiming>=0&&st.startTiming<=1;
    });
    if(!complete){const warning=document.createElement('p');warning.textContent='5指標比較は未表示：公式データの数値・進入・展示STが6艇分そろっていません。未確認値を0点扱いしません。';comparison.appendChild(warning)}
    if(complete){
     const rows=makulabo.last50ByBoat.map(row=>({
      boat:row.boat,
      course:starts.get(row.boat).course,
      sampleRuns:row.runs,
      win:stats.get(row.boat).nationwide.winRate,
      motor:stats.get(row.boat).motor.secondPlaceRate,
      time:exhibitions.get(row.boat).exhibitionTime,
      st:starts.get(row.boat).startTiming,
      top3:(row.counts[0]+row.counts[1]+row.counts[2])/row.runs*100
     }));
     const rank=(key,ascending=false)=>{
      const ordered=rows.slice().sort((a,b)=>(ascending?a[key]-b[key]:b[key]-a[key])||a.boat-b.boat);
      const points=new Map();
      for(let i=0;i<ordered.length;){
       let end=i+1;
       while(end<ordered.length&&ordered[end][key]===ordered[i][key])end++;
       const averagePoints=( (6-i)+(6-(end-1)) )/2;
       for(let j=i;j<end;j++)points.set(ordered[j].boat,averagePoints);
       i=end;
      }
      return points;
     };
     const factors=[['win',false],['motor',false],['time',true],['st',true],['top3',false]].map(([key,ascending])=>rank(key,ascending));
     const totals=rows.map(row=>({boat:row.boat,total:factors.reduce((sum,map)=>sum+map.get(row.boat),0)})).sort((a,b)=>b.total-a.total||a.boat-b.boat);
     const rankingLine=document.createElement('p');
     rankingLine.textContent='暫定比較順位：'+totals.map(row=>String(1+totals.filter(other=>other.total>row.total).length)+'位 '+String(row.boat)+'号艇 '+String(row.total)+'点').join(' ／ ');
     comparison.appendChild(rankingLine);
     const movedCourses=rows.filter(row=>row.boat!==row.course).sort((a,b)=>a.boat-b.boat);
     const courseNotice=document.createElement('p');
     courseNotice.textContent=movedCourses.length?'展示進入の枠なり変更：'+movedCourses.map(row=>String(row.boat)+'号艇→'+String(row.course)+'コース').join('、')+'。展示進入と本番進入は異なる可能性があります。':'展示進入は枠なり（1〜6コース）。本番進入は未確認です。';
     comparison.appendChild(courseNotice);
     const sampleNotice=document.createElement('p');
     const shortSamples=rows.filter(row=>row.sampleRuns<50).sort((a,b)=>a.boat-b.boat);
     sampleNotice.textContent=shortSamples.length?'直近50走に満たない艇：'+shortSamples.map(row=>String(row.boat)+'号艇 '+String(row.sampleRuns)+'走').join('、')+'。走数が少ない成績の解釈には注意が必要です。':'直近走数：全艇50走を確認。';
     comparison.appendChild(sampleNotice);
     const scenario=document.createElement('p');
     const reliableSamples=rows.every(row=>row.sampleRuns>=30);
     const stableCourses=rows.every(row=>row.boat===row.course);
     const weatherKnown=data.weatherVerified===true&&data.windDirectionVerified===true;
     if(!reliableSamples||!stableCourses||!weatherKnown){
      const reasons=[];
      if(!reliableSamples)reasons.push('直近走数30走未満の艇あり');
      if(!stableCourses)reasons.push('展示進入変更あり');
      if(!weatherKnown)reasons.push('風向・風速・波高の確認不足');
      scenario.textContent='本命・逆転・穴の候補判定：保留（'+reasons.join('、')+'）。5指標順位は参考表示のみです。';
     }else{
      const top=totals.filter(row=>row.total===totals[0].total);
      const outer=totals.filter(row=>row.boat>=4);
      const strongestOuter=outer.length?outer[0]:null;
      scenario.textContent='仮説の検討対象：5指標首位 '+top.map(row=>String(row.boat)+'号艇').join('・')+' ／ 外枠比較首位 '+(strongestOuter?String(strongestOuter.boat)+'号艇':'該当なし')+'。本命・逆転・穴の着順予測ではありません。';
     }
     comparison.appendChild(scenario);
     const candidatesLine=document.createElement('p');
     const candidateGate=officialReady&&makulabo.last50Verified===true&&reliableSamples&&stableCourses&&weatherKnown;
     const candidateScores=totals.map(row=>({boat:row.boat,score:row.total}));
     const candidates=candidateGate?rankTrifectaCandidates(candidateScores):{ready:false};
     candidatesLine.textContent=candidates.ready?
      '試験的な三連単候補（未検証の5指標順位モデル）：本命6点 '+candidates.main.map(x=>x.join('-')).join('、')+' ／ 外枠1着の穴6点 '+candidates.upset.map(x=>x.join('-')).join('、')+'。的中確率や期待回収率は算出していません。':
      '三連単の本命6点・穴6点：保留（公式6艇情報、まくらぼ直近50走、展示・進入・風の検証が必要）。';
     comparison.appendChild(candidatesLine);
     const audit=document.createElement('p');
     const orderedBoats=totals.map(row=>String(row.boat)+'号艇='+String(row.total)+'点').join('、');
     audit.textContent='過去レース照合用記録：日付 '+date+'／場コード '+venue+'／'+race+'R／5指標 '+orderedBoats+'／候補 '+scenario.textContent+'／確定着順 未照合';
     comparison.appendChild(audit);
     const auditNote=document.createElement('p');
     auditNote.textContent='この記録は画面表示のみで保存されません。下のボタンで確定着順を事後照合できますが、分析データの取得時刻・オッズ・締切前時点の保存がないため、過去予想の的中率として集計できません。';
     comparison.appendChild(auditNote);
     const snapshotButton=document.createElement('button');
     snapshotButton.type='button';
     snapshotButton.textContent='分析時点を端末に記録';
     const snapshotStatus=document.createElement('p');
     snapshotStatus.textContent='未保存（保存時刻は端末時計に依存します）';
     snapshotButton.addEventListener('click',()=>{
      const record={schema:1,recordedAt:new Date().toISOString(),date,venue,race,rankedScores:totals.map(row=>({boat:row.boat,score:row.total})),scenario:scenario.textContent,officialVerified:officialReady,makulaboVerified:makulabo.last50Verified===true,weatherVerified:data.weatherVerified===true};
      try{
       const key='boatScore2:snapshot:'+date+':'+venue+':'+race;
       if(localStorage.getItem(key)){snapshotStatus.textContent='既存の記録があります。上書きを避けるため保存しませんでした。';return}
       localStorage.setItem(key,JSON.stringify(record));
       snapshotStatus.textContent='端末内に記録：'+record.recordedAt+'（UTC）。端末時計の時刻であり、締切前を第三者が証明する記録ではありません。';
      }catch{snapshotStatus.textContent='保存できませんでした。ブラウザーの保存設定・容量を確認してください。'}
     });
     comparison.appendChild(snapshotButton);
     comparison.appendChild(snapshotStatus);
     const listButton=document.createElement('button');
     listButton.type='button';
     listButton.textContent='端末に保存した分析記録を一覧表示';
     const listStatus=document.createElement('p');
     listStatus.textContent='未表示';
     listButton.addEventListener('click',()=>{
      try{
       const records=[];
       for(let i=0;i<localStorage.length;i++){
        const key=localStorage.key(i);
        if(!key||!key.startsWith('boatScore2:snapshot:'))continue;
        try{
         const row=JSON.parse(localStorage.getItem(key));
         if(row&&row.schema===1&&/^20[0-9]{6}$/.test(String(row.date))&&Number(row.venue)>=1&&Number(row.venue)<=24&&Number(row.race)>=1&&Number(row.race)<=12&&Array.isArray(row.rankedScores)&&row.rankedScores.length===6)records.push(row);
        }catch{}
       }
       records.sort((a,b)=>String(b.recordedAt||'').localeCompare(String(a.recordedAt||'')));
       listStatus.textContent=records.length?'保存済み '+records.length+'件（直近30件を表示）：'+records.slice(0,30).map(row=>String(row.date)+'／場'+String(row.venue)+'／'+String(row.race)+'R／保存 '+String(row.recordedAt||'時刻不明')).join(' ｜ '):'保存済みの有効な分析記録はありません。';
      }catch{listStatus.textContent='端末の保存記録を読み取れませんでした。'}
     });
     comparison.appendChild(listButton);
     comparison.appendChild(listStatus);
     const batchButton=document.createElement('button');
     batchButton.type='button';
     batchButton.textContent='保存済み最大30レースを公式結果と参考照合';
     const batchStatus=document.createElement('p');
     batchStatus.textContent='未照合（通信が発生します）';
     batchButton.addEventListener('click',async()=>{
      batchButton.disabled=true;
      let checked=0,matched=0,unmatched=0,held=0,outerChecked=0,outerMatched=0,tiedChecked=0,tiedMatched=0;
      const detailRows=[];
      try{
       const records=[];
       for(let i=0;i<localStorage.length;i++){
        const key=localStorage.key(i);
        if(!key||!key.startsWith('boatScore2:snapshot:'))continue;
        try{
         const row=JSON.parse(localStorage.getItem(key));
         if(row&&row.schema===1&&/^20[0-9]{6}$/.test(String(row.date))&&Number.isInteger(Number(row.venue))&&Number(row.venue)>=1&&Number(row.venue)<=24&&Number.isInteger(Number(row.race))&&Number(row.race)>=1&&Number(row.race)<=12)records.push(row);
        }catch{}
       }
       records.sort((a,b)=>String(b.recordedAt||'').localeCompare(String(a.recordedAt||'')));
       const selected=records.slice(0,30);
       if(!selected.length){batchStatus.textContent='保存済み記録がありません。先に分析時点を端末に記録してください。';return}
       for(const row of selected){
        batchStatus.textContent='参考照合中：'+String(checked+held+1)+'／'+selected.length+'件';
        const scores=row.rankedScores;
        if(!Array.isArray(scores)||scores.length!==6||new Set(scores.map(x=>x.boat)).size!==6||!scores.every(x=>Number.isInteger(x.boat)&&x.boat>=1&&x.boat<=6&&Number.isFinite(x.score))){held++;detailRows.push(String(row.date)+' 場'+String(row.venue)+' '+String(row.race)+'R：保留（保存点数が不正）');continue}
        try{
         const response=await fetch('/api/official/result?'+new URLSearchParams({date:row.date,venue:row.venue,race:row.race}),{signal:AbortSignal.timeout(12000)});
         if(!response.ok){held++;detailRows.push(String(row.date)+' 場'+String(row.venue)+' '+String(row.race)+'R：保留（公式取得失敗）');continue}
         const result=await response.json();
         if(result.podiumVerified!==true||!Array.isArray(result.podium)||result.podium.length!==3||new Set(result.podium).size!==3||!result.podium.every(x=>Number.isInteger(x)&&x>=1&&x<=6)){held++;detailRows.push(String(row.date)+' 場'+String(row.venue)+' '+String(row.race)+'R：保留（公式着順未確認）');continue}
         const best=Math.max(...scores.map(x=>x.score));
         const leaders=scores.filter(x=>x.score===best).map(x=>x.boat);
         const hit=leaders.includes(result.podium[0]);
         checked++;
         if(hit)matched++;else unmatched++;
         if(leaders.length>1){tiedChecked++;if(hit)tiedMatched++}
         detailRows.push(String(row.date)+' 場'+String(row.venue)+' '+String(row.race)+'R：'+(hit?'一致':'不一致')+'／首位'+leaders.join(',')+'号艇／確定'+result.podium.join('-'));
         if(leaders.length===1&&leaders[0]>=4){outerChecked++;if(hit)outerMatched++}
        }catch{held++;detailRows.push(String(row.date)+' 場'+String(row.venue)+' '+String(row.race)+'R：保留（通信エラー）')}
       }
       batchStatus.textContent='参考照合：対象'+selected.length+'件／判定'+checked+'件／一致'+matched+'件／不一致'+unmatched+'件／保留'+held+'件。首位艇1着一致率 '+(checked?(matched/checked*100).toFixed(1)+'%':'算出不可')+'（同点首位を含む）。同点首位 '+tiedChecked+'件／一致'+tiedMatched+'件。外枠単独首位 '+outerChecked+'件／一致'+outerMatched+'件'+(outerChecked?'／'+(outerMatched/outerChecked*100).toFixed(1)+'%':'')+'。端末時計・保存時刻は第三者未検証のため、正式な事前予想的中率ではありません。 レース別結果：'+(detailRows.length?detailRows.join(' ｜ '):'なし');
      }catch{batchStatus.textContent='端末の保存記録を読み取れませんでした。'}
      finally{batchButton.disabled=false}
     });
     comparison.appendChild(batchButton);
     comparison.appendChild(batchStatus);
     const resultButton=document.createElement('button');
     resultButton.type='button';
     resultButton.textContent='このレースの公式確定着順と照合';
     const resultStatus=document.createElement('p');
     resultStatus.textContent='未照合（ボタンを押すまで確定着順は取得しません）';
     resultButton.addEventListener('click',async()=>{
      resultButton.disabled=true;
      resultStatus.textContent='公式確定着順を取得中…';
      try{
       const response=await fetch('/api/official/result?'+new URLSearchParams({date,venue,race}),{signal:AbortSignal.timeout(12000)});
       const result=await response.json();
       if(!response.ok||result.podiumVerified!==true||!Array.isArray(result.podium)||result.podium.length!==3||new Set(result.podium).size!==3||!result.podium.every(x=>Number.isInteger(x)&&x>=1&&x<=6)){
        resultStatus.textContent='確定着順を照合できません：'+String(result.reason||result.error||'取得失敗')+'。未確認結果を採用しません。';
        return;
       }
       const winner=result.podium[0];
       let saved=null;
       try{
        const raw=localStorage.getItem('boatScore2:snapshot:'+date+':'+venue+':'+race);
        if(raw)saved=JSON.parse(raw);
       }catch{}
       const validSnapshot=saved&&saved.schema===1&&saved.date===date&&String(saved.venue)===String(venue)&&String(saved.race)===String(race)&&Array.isArray(saved.rankedScores)&&saved.rankedScores.length===6&&new Set(saved.rankedScores.map(row=>row.boat)).size===6&&saved.rankedScores.every(row=>Number.isInteger(row.boat)&&row.boat>=1&&row.boat<=6&&Number.isFinite(row.score));
       if(!validSnapshot){
        resultStatus.textContent='公式確定着順：'+result.podium.join('-')+' ／ 保存済み分析がないため一致判定は保留。現在の再計算値を過去の予想として扱いません。';
        return;
       }
       const topScore=Math.max(...saved.rankedScores.map(row=>row.score));
       const topBoats=saved.rankedScores.filter(row=>row.score===topScore).map(row=>row.boat);
       const matched=topBoats.includes(winner);
       resultStatus.textContent='公式確定着順：'+result.podium.join('-')+' ／ 保存時点の5指標首位艇の1着一致：'+(matched?'一致':'不一致')+'（首位同点 '+topBoats.length+'艇、端末保存 '+String(saved.recordedAt||'時刻不明')+'）。端末時計と保存内容は第三者検証されておらず、事前予想の的中率としては未検証です。';
      }catch{resultStatus.textContent='通信エラー：確定着順は未照合です。'}
      finally{resultButton.disabled=false}
     });
     comparison.appendChild(resultButton);
     comparison.appendChild(resultStatus);
     const heading=document.createElement('h3');heading.textContent='実験的な5指標比較（予想ではありません）';comparison.appendChild(heading);
     const note=document.createElement('p');note.textContent='暫定比較順位は同点なら同順位です（表示順のみ艇番順）。着順予測・買い目ではありません。全国勝率・モーター2連率・展示タイム・展示ST・直近3連対率を各6〜1点の順位点で合計（最大30点）。同値は同点順位の平均点を付与。展示進入と直近走数は参考表示のみで加点しません。枠有利、進入変動、風、波、オッズ、相手関係は未反映。的中率や回収率の検証前につき買い目には使わないでください。';comparison.appendChild(note);
     const scoreScroll=document.createElement('div');scoreScroll.style.cssText='max-width:100%;overflow-x:auto';
     const table=document.createElement('table');table.style.cssText='border-collapse:collapse;font-size:13px;white-space:nowrap';
     const header=document.createElement('tr');['艇','展示進入','直近走数','全国勝率点','モーター点','展示点','展示ST点','直近3連対点','合計（30点満点）'].forEach(label=>{const th=document.createElement('th');th.textContent=label;th.style.cssText='border:1px solid #cbd5e1;padding:5px';header.appendChild(th)});table.appendChild(header);
     rows.slice().sort((a,b)=>a.boat-b.boat).forEach(row=>{
      const tr=document.createElement('tr');[row.boat,row.course,row.sampleRuns,...factors.map(map=>map.get(row.boat)),factors.reduce((sum,map)=>sum+map.get(row.boat),0)].forEach(value=>{const td=document.createElement('td');td.textContent=String(value);td.style.cssText='border:1px solid #cbd5e1;padding:5px;text-align:center';tr.appendChild(td)});table.appendChild(tr);
     });scoreScroll.appendChild(table);comparison.appendChild(scoreScroll);
    }
   }
   makulabo.last50ByBoat.slice().sort((a,b)=>a.boat-b.boat).forEach(row=>{const tr=document.createElement('tr');[row.boat,row.name,...row.counts,row.runs,row.average,(row.counts[0]/row.runs*100).toFixed(1)+'%',((row.counts[0]+row.counts[1]+row.counts[2])/row.runs*100).toFixed(1)+'%'].forEach(value=>{const td=document.createElement('td');td.textContent=String(value);td.style.cssText='border:1px solid #cbd5e1;padding:4px;text-align:center';tr.appendChild(td)});table.appendChild(tr)});scroll.appendChild(table);comparison.appendChild(scroll);
  }
 }catch{if(checkVersion===raceDataCheckVersion&&date===document.getElementById('date').value.trim()&&venue===document.getElementById('venue').value.trim()&&race===document.getElementById('race').value.trim())status.textContent='通信エラー：データの充足状況は未確認です'}finally{button.disabled=false}
});
document.getElementById('fillRacers').addEventListener('click',async()=>{
 const status=document.getElementById('fillStatus');
 status.textContent='公式出走表を確認中…';
 const date=document.getElementById('date').value.trim(),venue=document.getElementById('venue').value.trim(),race=document.getElementById('race').value.trim();
 const fillVersion=++racerFillVersion;
 if(!/^20[0-9]{6}$/.test(date)||!/^([1-9]|1[0-9]|2[0-4])$/.test(venue)||!/^([1-9]|1[0-2])$/.test(race)){status.textContent='日付・競艇場・レース番号を確認してください';return}
 try{
  const params=new URLSearchParams({date,venue,race});
  const response=await fetch('/api/official/racers?'+params,{signal:AbortSignal.timeout(12000)});
  const payload=await response.json();
  if(fillVersion!==racerFillVersion||date!==document.getElementById('date').value.trim()||venue!==document.getElementById('venue').value.trim()||race!==document.getElementById('race').value.trim())return;
  const racers=payload.racersByBoat;
  if(!response.ok||payload.racersByBoatVerified!==true||!Array.isArray(racers)||racers.length!==6||
    racers.some((r,i)=>r.boat!==i+1||!/^[0-9]{4}$/.test(r.racerId))){
    status.textContent='公式選手番号を確認できませんでした。手入力で確認してください';return
  }
  racers.forEach((r,i)=>{const input=rows.querySelector('input[data-boat="'+(i+1)+'"][data-index="0"]');input.value=r.racerId;input.dataset.officialAutofilled='true'});
  status.textContent='公式の6艇分の登録番号を入力しました。画像と照合してください';
 }catch{if(fillVersion===racerFillVersion)status.textContent='通信に失敗しました。後で再試行してください'}
});
document.getElementById('set50').addEventListener('click',()=>{
 for(let boat=1;boat<=6;boat++){rows.querySelector('input[data-boat="'+boat+'"][data-index="1"]').value='50'}
 document.getElementById('countStatus').textContent='走数を50に設定しました。画像の対象期間が50走であることを確認してください';
});
rows.addEventListener('input',event=>{
 const input=event.target;if(!input.matches('input[data-boat]'))return;
 const boat=input.getAttribute('data-boat'),fields=[...rows.querySelectorAll('input[data-boat="'+boat+'"]')];
 const status=document.getElementById('countStatus');
 if(fields.slice(1).some(x=>x.value.trim()==='')){status.textContent=boat+'号艇：着順回数を入力中';return}
 const count=fields.slice(2).reduce((sum,x)=>sum+Number(x.value),0);
 const total=Number(fields[1].value);
 status.textContent=boat+'号艇：着順合計 '+count+' / '+total+'走'+(count===total?'（一致）':'（不一致）');
});
let zoom=1;
const zoomPreview=document.getElementById('zoomPreview');
const viewport=document.getElementById('imageViewport');
function applyZoom(){zoomPreview.style.width=(zoom*100)+'%'}
document.getElementById('zoomIn').addEventListener('click',()=>{zoom=Math.min(4,Math.round((zoom+0.25)*100)/100);applyZoom()});
document.getElementById('zoomOut').addEventListener('click',()=>{zoom=Math.max(1,Math.round((zoom-0.25)*100)/100);applyZoom()});
document.getElementById('zoomReset').addEventListener('click',()=>{zoom=1;applyZoom();viewport.scrollTo(0,0)});
let objectUrl;
document.getElementById('photo').addEventListener('change',e=>{if(objectUrl)URL.revokeObjectURL(objectUrl);const file=e.target.files?.[0];if(file&&file.type.startsWith('image/')){objectUrl=URL.createObjectURL(file);zoomPreview.src=objectUrl;zoomPreview.hidden=false;zoom=1;applyZoom()}else{zoomPreview.hidden=true;zoomPreview.removeAttribute('src')}});
let screenshotReviewVersion=0;
for(const id of ['date','venue','race'])document.getElementById(id).addEventListener('input',()=>{screenshotReviewVersion++;});
rows.addEventListener('input',()=>{screenshotReviewVersion++;document.getElementById('result').textContent='入力値が変更されました。再照合してください。';});
document.getElementById('photo').addEventListener('change',()=>{screenshotReviewVersion++;document.getElementById('result').textContent='画像が変更されました。入力値を確認して再照合してください。';});
document.getElementById('check').addEventListener('click',async()=>{
 const currentReview=++screenshotReviewVersion;
 const out=document.getElementById('result');out.textContent='照合中…';
 try{
 const date=document.getElementById('date').value.trim(),venue=Number(document.getElementById('venue').value),race=Number(document.getElementById('race').value);
 const data=Array.from({length:6},(_,i)=>{const fields=[...rows.querySelectorAll('input[data-boat="'+(i+1)+'"]')];return {boat:i+1,racerId:fields[0].value.trim(),sampleSize:Number(fields[1].value),finishCounts:fields.slice(2).map(x=>Number(x.value))}});
 if(!/^20[0-9]{6}$/.test(date)||!Number.isInteger(venue)||venue<1||venue>24||!Number.isInteger(race)||race<1||race>12)throw Error('日付・競艇場・レース番号を確認してください');
 if(data.some(r=>!/^[0-9]{4}$/.test(r.racerId))||[...rows.querySelectorAll('input')].some(x=>!x.value.trim()))throw Error('入力漏れがあります');
 if(new Set(data.map(r=>r.racerId)).size!==6)throw Error('選手登録番号が重複しています。6艇を確認してください');
 if(data.some(r=>r.sampleSize<1||r.sampleSize>50||r.finishCounts.some(n=>!Number.isInteger(n)||n<0||n>50)||r.finishCounts.reduce((a,b)=>a+b,0)!==r.sampleSize))throw Error('着順回数の合計と走数が一致しません。各艇の入力を確認してください');
 const response=await fetch('/api/makulabo/screenshot-review',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({date,venue,race,rows:data})});
 const result=await response.json();
 if(currentReview!==screenshotReviewVersion||date!==document.getElementById('date').value.trim()||venue!==Number(document.getElementById('venue').value)||race!==Number(document.getElementById('race').value))return;
 if(result.identityVerified===true&&Array.isArray(result.rows)&&result.rows.length===6){
  if(window.parent!==window)window.parent.postMessage({type:'boat-score-manual-review',key:date+':'+venue+':'+race,rows:result.rows},location.origin);
  const complete50=result.rows.filter(row=>row.sampleSize===50).length;
  const firstOrder=result.rows.slice().sort((a,b)=>(b.finishCounts[0]/b.sampleSize)-(a.finishCounts[0]/a.sampleSize)).map(row=>row.boat+'号艇').join(' → ');
  const rates=result.rows.map(row=>row.finishCounts[0]/row.sampleSize*100);
  const spread=(Math.max(...rates)-Math.min(...rates)).toFixed(1);
  out.textContent='対象：'+date+' / '+venue+'場 / '+race+'R\n'+
    '公式選手番号：6艇一致。画像を見て手入力した未検証の集計です。予想点には反映しません。\n'+
    '50走分入力：'+complete50+'/6艇（50走未満はその走数を分母に計算）\n'+
    '参考・1着率順：'+firstOrder+'（サンプル数が異なる場合は単純比較に注意）\n'+
    '参考・1着率の最大差：'+spread+'ポイント（的中確率や予想優位性を示す値ではありません）\n'+
    '艇  走数  1着  2着  3着  4着  5着  6着  1着率  3連対率\n'+
    result.rows.map(row=>{
      const first=(row.finishCounts[0]/row.sampleSize*100).toFixed(1)+'%';
      const top3=(row.finishCounts.slice(0,3).reduce((a,b)=>a+b,0)/row.sampleSize*100).toFixed(1)+'%';
      return [row.boat+'号艇',row.sampleSize,...row.finishCounts,first,top3].join('  ');
    }).join('\n');
 }else out.textContent=result.error||'公式選手番号との一致を確認できませんでした。データは採用されません。';
 }catch(error){if(currentReview===screenshotReviewVersion)out.textContent=String(error.message||error)}
});
</script></body></html>`;
  return new Response(html,{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; img-src blob:; style-src 'unsafe-inline'; script-src 'unsafe-inline'; connect-src 'self'"}});
}
if (u.pathname === '/api/csv/race-card') {
  if(request.method!=='GET')return reply(request,{error:'Method not allowed'},405);
  const date=u.searchParams.get('date')||'',venue=Number(u.searchParams.get('venue')),race=Number(u.searchParams.get('race'));
  if(!/^20\d{6}$/.test(date)||!Number.isInteger(venue)||venue<1||venue>24||!Number.isInteger(race)||race<1||race>12)return reply(request,{error:'Invalid race selection'},400);
  const source='https://boatracecsv.github.io/data/programs/race_cards/'+date.slice(0,4)+'/'+date.slice(4,6)+'/'+date.slice(6,8)+'.csv';
  try{
    const response=await fetch(source,{signal:AbortSignal.timeout(12000)});
    if(!response.ok)return reply(request,{verified:false,sourceType:'unofficial_csv',reason:'csv_http_'+response.status},502);
    const raw=(await response.text()).replace(/^\uFEFF/,'');if(raw.length>2500000)return reply(request,{verified:false,reason:'csv_too_large'},502);
    const lines=[];let row=[],cell='',quoted=false;
    for(let i=0;i<raw.length;i++){const c=raw[i];if(c==='"'){if(quoted&&raw[i+1]==='"'){cell+='"';i++}else quoted=!quoted}else if(c===','&&!quoted){row.push(cell);cell=''}else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&raw[i+1]==='\n')i++;row.push(cell);if(row.some(v=>v!==''))lines.push(row);row=[];cell=''}else cell+=c}
    if(cell||row.length){row.push(cell);lines.push(row)}
    const headers=(lines.shift()||[]).map(x=>x.trim());
    const pick=(obj,keys)=>{for(const k of keys)if(obj[k]!==undefined&&String(obj[k]).trim()!=='')return String(obj[k]).trim();return ''};
    const digits=x=>String(x).replace(/[^0-9]/g,'');
    const record=lines.slice(0,3000).map(values=>Object.fromEntries(headers.map((h,i)=>[h,values[i]||'']))).find(obj=>{
      const day=digits(pick(obj,['レース日','開催日','日付','年月日','date','race_date']));
      const place=digits(pick(obj,['レース場コード','レース場','場コード','場','venue']));
      const round=digits(pick(obj,['レース回','レース番号','race','rno']));
      return (day===date||(day.length===6&&'20'+day===date))&&Number(place)===venue&&Number(round)===race;
    });
    if(!record)return reply(request,{verified:false,sourceType:'unofficial_csv',source,reason:'race_not_matched',dataReadyForPrediction:false});
    const boats=Array.from({length:6},(_,i)=>{const n=i+1;const field=names=>pick(record,names.flatMap(k=>['艇'+n+'_'+k,n+'号艇_'+k,'艇'+n+k]));return {boat:n,racerId:field(['登録番号','選手登録番号','登番']),name:field(['選手名','氏名']),nationalWinRate:field(['全国勝率']),localWinRate:field(['当地勝率']),motorPlaceRate:field(['モーター2連対率','モーター２連対率'])}});

    const csvIdsComplete=boats.every(b=>/^\d{4}$/.test(b.racerId))&&new Set(boats.map(b=>b.racerId)).size===6;
    const official=csvIdsComplete?await fetchOfficialRacers(date,venue,race,{verificationOnly:true}):{verified:false,racers:[]};
    const officialVerified=csvIdsComplete&&official.verified===true&&boats.every((b,i)=>Number(b.boat)===Number(official.racers[i]?.boat)&&b.racerId===official.racers[i]?.racerId);
    const verificationStatus=!csvIdsComplete?'csv_racer_ids_missing':!official.verified?'official_unavailable':officialVerified?'racer_ids_matched':'racer_ids_mismatch';
    const officialFailureReason=!official.verified&&csvIdsComplete?String(official.reason||'official_parse_unverified').slice(0,80):null;
    const populatedFields=boats.reduce((sum,b)=>sum+['name','nationalWinRate','localWinRate','motorPlaceRate'].filter(k=>String(b[k]||'').trim()!=='').length,0);
    return reply(request,{verified:true,sourceType:'unofficial_csv',officialVerified,verificationStatus,officialFailureReason,dataReadyForPrediction:false,date,venue,race,source,boats,populatedFields,totalFields:24,missingFields:24-populatedFields});
  }catch(error){return reply(request,{verified:false,sourceType:'unofficial_csv',reason:'csv_fetch_error',detail:String(error?.message||error).slice(0,120)},502)}
}
if (u.pathname === '/api/makulabo/screenshot-review') {
  if(request.method!=='POST')return reply(request,{error:'Method not allowed'},405);
  const type=request.headers.get('content-type')||'';
  if(!type.toLowerCase().startsWith('application/json'))return reply(request,{error:'JSON required'},415);
  let input;
  try{
    const raw=await request.text();
    if(raw.length>16000)return reply(request,{error:'Payload too large'},413);
    input=JSON.parse(raw);
  }catch{return reply(request,{error:'Invalid JSON'},400)}
  const date=input?.date,venue=input?.venue,race=input?.race,rows=input?.rows;
  if(typeof date!=='string'||!/^20\d{6}$/.test(date)||
    !Number.isInteger(venue)||venue<1||venue>24||
    !Number.isInteger(race)||race<1||race>12||
    !Array.isArray(rows)||rows.length!==6)
    return reply(request,{error:'Expected date, venue, race and exactly six reviewed rows'},400);
  const valid=rows.every(row=>row&&Number.isInteger(row.boat)&&row.boat>=1&&row.boat<=6&&
    typeof row.racerId==='string'&&/^\d{4}$/.test(row.racerId)&&
    Number.isInteger(row.sampleSize)&&row.sampleSize>=1&&row.sampleSize<=50&&
    Array.isArray(row.finishCounts)&&row.finishCounts.length===6&&
    row.finishCounts.every(n=>Number.isInteger(n)&&n>=0&&n<=50)&&
    row.finishCounts.reduce((a,b)=>a+b,0)===row.sampleSize);
  if(!valid||new Set(rows.map(r=>r.boat)).size!==6||
    new Set(rows.map(r=>r.racerId)).size!==6)
    return reply(request,{error:'Invalid boat/racer IDs or finish counts'},400);
  const normalized=rows.map(row=>({
    boat:row.boat,racerId:row.racerId,sampleSize:row.sampleSize,
    finishCounts:[...row.finishCounts]
  })).sort((a,b)=>a.boat-b.boat);
  const official=await fetchOfficialRacers(date,venue,race);
  const identityVerified=official.verified===true&&normalized.every((row,i)=>
    row.boat===official.racers[i].boat&&row.racerId===official.racers[i].racerId);
  return reply(request,{
    status:identityVerified?'official_identity_matched':'awaiting_official_identity_match',
    source:'manually_reviewed_screenshot',date,venue,race,
    rows:identityVerified?normalized:[],
    identityVerified,makulaboLast50Verified:false,dataReadyForPrediction:false,
    note:identityVerified
      ?'Official racer IDs matched; screenshot values remain manually transcribed and unverified'
      :'Official racer IDs unavailable or mismatched; screenshot values withheld'
  });
}
if (u.pathname === '/api/official/racers-only') {
 const date=u.searchParams.get('date')||'',venue=Number(u.searchParams.get('venue')),race=Number(u.searchParams.get('race'));
 if(!/^20\d{6}$/.test(date)||!Number.isInteger(venue)||venue<1||venue>24||!Number.isInteger(race)||race<1||race>12)return reply(request,{error:'Invalid parameters'},400);
 let result=null,source='official_live';
 if(env?.MORNING_KV&&date===jstDateFromUtc(new Date())&&u.searchParams.get('refresh')!=='1'){
  try{const state=JSON.parse(await env.MORNING_KV.get('morning:'+date)||'null');const row=state?.records?.find(x=>x.date===date&&x.venue===venue&&x.race===race&&x.ready===true);const c=row?.raceCard,deadline=Date.parse(row?.deadlineAt||''),capture=Date.parse(row?.capturedAt||'');
   if(Number.isFinite(deadline)&&Number.isFinite(capture)&&capture<deadline&&Date.now()<deadline-15*60000&&c?.racers?.length===6&&c?.statsByBoat?.length===6&&new Set(c.racers.map(x=>x.boat)).size===6&&c.racers.every(x=>Number.isInteger(x.boat)&&x.boat>=1&&x.boat<=6&&x.racerId)&&c.statsByBoat.every(x=>c.racers.some(y=>y.boat===x.boat&&String(y.racerId)===String(x.racerId)))&&new Set(c.statsByBoat.map(x=>x.boat)).size===6){result={verified:true,statsVerified:true,racers:c.racers,statsByBoat:c.statsByBoat,deadlineAt:row.deadlineAt};source='morning_saved';}
  }catch{}
 }
 if(!result)result=await fetchOfficialRacers(date,venue,race,{interactive:true,forceRefresh:true});
 return reply(request,{date,venue,race,source,deadlineAt:result.deadlineAt||null,racersVerified:result.verified===true,statsVerified:result.statsVerified===true,racersByBoat:result.verified?result.racers:[],statsByBoat:result.statsVerified?result.statsByBoat:[],diagnostics:{reason:result.reason||null,htmlLength:result.htmlLength||null,averageSTParseDiagnostics:result.averageSTParseDiagnostics||[]}});
}
if (u.pathname === '/api/official/race-data') {
  if(request.method!=='GET')return reply(request,{error:'Method not allowed'},405);
  const date=u.searchParams.get('date')||'',venue=u.searchParams.get('venue')||'',race=u.searchParams.get('race')||'';
  if(!/^20\d{6}$/.test(date)||!/^\d{1,2}$/.test(venue)||!/^\d{1,2}$/.test(race)||
    Number(venue)<1||Number(venue)>24||Number(race)<1||Number(race)>12)
    return reply(request,{error:'Invalid parameters'},400);
  const beforeUrl=new URL('https://www.boatrace.jp/owpc/pc/race/beforeinfo');
  beforeUrl.searchParams.set('rno',String(Number(race)));
  beforeUrl.searchParams.set('jcd',String(venue).padStart(2,'0'));
  beforeUrl.searchParams.set('hd',date);
  let beforeFailureReason=null;
  const [official,before]=await Promise.all([
    fetchOfficialRacers(date,venue,race).catch(e=>({verified:false,statsVerified:false,racers:[],statsByBoat:[],reason:'official_fetch_error:'+String(e?.message||e).slice(0,100)})),
    (async()=>{
      for(let attempt=1;attempt<=2;attempt++){
        try{
          const res=await fetch(beforeUrl.toString(),{headers:{Accept:'text/html'},signal:AbortSignal.timeout(attempt===1?10000:15000)});
          if(!res.ok){beforeFailureReason='official_beforeinfo_http_'+res.status;return null;}
          const contentType=res.headers.get('content-type')||'';
          if(contentType&&!/text\/html|application\/xhtml\+xml/i.test(contentType)){beforeFailureReason='official_beforeinfo_content_type';return null;}
          const html=await res.text();
          if(html.length>1000000){beforeFailureReason='official_beforeinfo_too_large';return null;}
          beforeFailureReason=null;
          return html;
        }catch(e){
          const timeout=e?.name==='TimeoutError'||e?.name==='AbortError';
          beforeFailureReason=(timeout?'official_beforeinfo_timeout':'official_beforeinfo_fetch_failed')+'_attempt_'+attempt;
          if(!timeout||attempt===2)return null;
        }
      }
      return null;
    })()
  ]);
  const exhibition=before?extractOfficialExhibition(before):{verified:false,rows:[]};
  const start=before?extractOfficialStartExhibition(before):{verified:false,rows:[]};
  const weather=before?extractOfficialWeather(before):{verified:false,reason:'beforeinfo_unavailable'};
  const normalize=name=>String(name||'').replace(/\s/g,'');
  const exhibitionMatches=official.verified&&exhibition.verified&&
    exhibition.rows.every((row,i)=>row.boat===official.racers[i].boat&&normalize(row.name)===normalize(official.racers[i].name));
  const startMatches=official.verified&&start.verified&&start.rows.every(row=>official.racers.some(r=>r.boat===row.boat)) && new Set(start.rows.map(row=>row.course)).size===6;
  if(exhibitionMatches||startMatches){
    const verifiedExhibition=exhibitionMatches?exhibition:{verified:false,rows:[]};
    const verifiedStart=startMatches?start:{verified:false,rows:[]};
    saveVerifiedBeforeinfo(date,venue,race,verifiedExhibition,verifiedStart);
    await writeSharedVerifiedBeforeinfo(env,date,venue,race,verifiedExhibition,verifiedStart);
  }
  const complete=official.verified&&official.statsVerified&&exhibitionMatches&&startMatches&&weather.verified;
  const missingInputs=[];
  if(!official.verified)missingInputs.push('racers');
  if(official.statsVerified!==true)missingInputs.push('stats');
  if(!exhibitionMatches)missingInputs.push('exhibition');
  if(!startMatches)missingInputs.push('start');
  if(weather.verified!==true)missingInputs.push('weather');
  if(weather.windDirectionVerified!==true)missingInputs.push('windDirection');
  return reply(request,{
    status:complete?'official_sources_verified':'partial',missingInputs,capturedAt:new Date().toISOString(),source:'official_race_data',
    diagnostics:{officialRacersReason:official.verified?null:(official.reason||'official_racer_rows_not_verified'),officialRacerCandidateCount:official.officialBoatRowCandidates??null,officialResponseLength:official.htmlLength??null,officialStatsReason:official.statsVerified?null:'official_stats_not_verified',averageSTParseDiagnostics:official.averageSTParseDiagnostics||[],beforeinfoReason:beforeFailureReason||(before?(exhibition.verified&&start.verified&&weather.verified?'beforeinfo_verified':'beforeinfo_parsing_not_verified'):'beforeinfo_unavailable'),beforeinfoResponseLength:before?.length??null,exhibitionCandidateCount:exhibition.candidateCount??0,startCandidateCount:start.candidateCount??0,exhibitionParserVerified:exhibition.verified===true,startParserVerified:start.verified===true,weatherParserReason:weather.reason??null,selectedDate:date,selectedVenue:Number(venue),selectedRace:Number(race)},
    racersVerified:official.verified,statsVerified:official.statsVerified===true,
    exhibitionVerified:exhibitionMatches,startVerified:startMatches,weatherVerified:weather.verified===true,
    racersByBoat:official.verified?official.racers:[],
    statsByBoat:official.statsVerified?official.statsByBoat:[],
    exhibitionByBoat:exhibitionMatches?exhibition.rows:[],
    startByCourse:startMatches?start.rows:[],weather,
    makulaboLast50Verified:false,windDirectionVerified:weather.windDirectionVerified===true,
    dataReadyForPrediction:false
  });
}
if (u.pathname === '/api/official/beforeinfo') {
  if (request.method !== 'GET') return reply(request,{error:'Method not allowed'},405);
  const date=u.searchParams.get('date')||'',venue=u.searchParams.get('venue')||'',race=u.searchParams.get('race')||'';
  if(!/^20\d{6}$/.test(date)||!/^\d{1,2}$/.test(venue)||!/^\d{1,2}$/.test(race)||
     Number(venue)<1||Number(venue)>24||Number(race)<1||Number(race)>12)
    return reply(request,{error:'Invalid parameters'},400);
  // Reuse the same race's recently verified exhibition and start data.
  // Reuse only complete weather and six-boat data; otherwise fetch again.
  const cached=getVerifiedBeforeinfo(date,venue,race)||await readSharedVerifiedBeforeinfo(env,date,venue,race);
  if(cached?.exhibition?.verified===true&&cached?.start?.verified===true&&cached?.weather?.verified===true&&cached?.weather?.windDirectionVerified===true){
    return reply(request,{status:'verified',source:'verified_recent_cache',capturedAt:new Date(cached.savedAt).toISOString(),
      exhibitionVerified:cached.exhibition.verified===true,startVerified:cached.start.verified===true,weatherVerified:true,windDirectionVerified:true,
      exhibitionByBoat:cached.exhibition.rows,startByCourse:cached.start.rows,
      weather:cached.weather,dataReadyForPrediction:false});
  }
  const url=new URL('https://www.boatrace.jp/owpc/pc/race/beforeinfo');
  url.searchParams.set('rno',String(Number(race)));
  url.searchParams.set('jcd',String(venue).padStart(2,'0'));
  url.searchParams.set('hd',date);
  try {
    // Retry only transport failures and transient upstream 5xx responses.
    // Never use unverified data as a substitute for a failed official response.
    let res;
    for (const timeoutMs of [10000, 15000]) {
      try {
        res=await fetch(url.toString(),{headers:{Accept:'text/html'},signal:AbortSignal.timeout(timeoutMs)});
        if(res.ok || res.status<500)break;
      } catch(error) {
        if(timeoutMs===15000)throw error;
      }
    }
    if(!res.ok)return reply(request,{status:'unavailable',reason:'upstream_http_'+res.status,dataReadyForPrediction:false},502);
    const html=await res.text();
    if(html.length>1000000)return reply(request,{status:'unavailable',reason:'response_too_large',dataReadyForPrediction:false},502);
    const capturedAt=new Date().toISOString();
    const exhibition=extractOfficialExhibition(html);
    const start=extractOfficialStartExhibition(html);
    const weather=extractOfficialWeather(html);
    saveVerifiedBeforeinfo(date,venue,race,exhibition,start,weather);
    await writeSharedVerifiedBeforeinfo(env,date,venue,race,exhibition,start,weather);
    return reply(request,{
      status:exhibition.verified&&start.verified?'verified':'partial',
      source:'official_beforeinfo',capturedAt,
      exhibitionVerified:exhibition.verified,startVerified:start.verified,
      weatherVerified:weather.verified===true,windDirectionVerified:weather.windDirectionVerified===true,
      exhibitionByBoat:exhibition.rows,startByCourse:start.rows,
      weather, dataReadyForPrediction:false
    });
  } catch(e) {
    return reply(request,{status:'unavailable',reason:'upstream_fetch_failed',diagnostics:{message:String(e?.message||e).slice(0,160),name:String(e?.name||'unknown')},dataReadyForPrediction:false},502);
  }
}
if (u.pathname === '/api/official/racers') {
  if (request.method !== 'GET') return reply(request,{error:'Method not allowed'},405);
  const date=u.searchParams.get('date')||'', venue=u.searchParams.get('venue')||'', race=u.searchParams.get('race')||'';
  if (!/^20\d{6}$/.test(date) || !/^\d{1,2}$/.test(venue) || !/^\d{1,2}$/.test(race) ||
      Number(venue)<1 || Number(venue)>24 || Number(race)<1 || Number(race)>12)
    return reply(request,{error:'Invalid parameters'},400);
  const official=await fetchOfficialRacers(date,venue,race);
  return reply(request,{
    status:official.verified?'verified':'unavailable',
    source:'BOAT RACE official racelist',
    racersByBoat:official.verified?official.racers:[],
    racersByBoatVerified:official.verified,
    statsByBoat:official.statsVerified?official.statsByBoat:[],
    statsVerified:official.statsVerified===true,
    candidateCount:official.officialBoatRowCandidates||0,
    dataReadyForPrediction:false,
    reason:official.verified?'Other required inputs are not yet verified':'Official six-boat identity verification failed'
  });
}
if (u.pathname === '/api/test') return reply(request,{status:'ok',message:'Boat Score API connected'});
    if (u.pathname !== '/api/makulabo/heatmap') return reply(request,{error:'Not found'},404);
    if (request.method !== 'GET') return reply(request,{error:'Method not allowed'},405);
    const date = u.searchParams.get('date')||'', venue=u.searchParams.get('venue')||'', race=u.searchParams.get('race')||'';
    if (!/^20\d{6}$/.test(date) || !/^\d{1,2}$/.test(venue) || !/^\d{1,2}$/.test(race) || Number(venue)<1 || Number(venue)>24 || Number(race)<1 || Number(race)>12) return reply(request,{error:'Invalid parameters'},400);
    const source = `https://makulabo-jp.com/data/${venue.padStart(2,'0')}/${Number(race)}/heatmap?hd=${date}`;
    try {
      const res = await fetch(source,{headers:{Accept:'text/html,application/xhtml+xml'},redirect:'follow',signal:AbortSignal.timeout(9000)});
if (!res.ok) return reply(request,{status:'unavailable',reason:'upstream_http_error',upstreamStatus:res.status,source,last50Verified:false,heatmapReadyForAnalysis:false,dataReadyForPrediction:false},502);
      const type=res.headers.get('content-type')||'';
      if (!/text\/html|text\/plain|application\/json/i.test(type)) return reply(request,{status:'unavailable',reason:'unexpected_content_type',type,source,last50Verified:false,heatmapReadyForAnalysis:false,dataReadyForPrediction:false},502);
      const html=await res.text();
const htmlLength = html.length;
      const plainText = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,' ').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ');
      const hasHeatmapHeading = /枠番別ヒートマップ/.test(plainText);
      const accessRestricted = /ログイン|会員登録|有料会員|新規登録/.test(plainText) && !hasHeatmapHeading;
      if (accessRestricted) return reply(request,{status:'unavailable',reason:'access_restricted_or_login_required',source, dataReadyForPrediction:false, last50Verified:false});
      if (/ヒートマップ\s*読み込み中/.test(plainText) && !/<table\b/i.test(html)) return reply(request,{status:'unavailable',reason:'heatmap_requires_client_side_rendering',source,htmlLength,dataReadyForPrediction:false,last50Verified:false,last50ByBoat:[]});
      if (!hasHeatmapHeading) return reply(request,{status:'unavailable',reason:'heatmap_not_present_in_response',source,htmlLength,dataReadyForPrediction:false,last50Verified:false});
      if (html.length>1_000_000) return reply(request,{error:'Response too large'},502);
     const officialRacers = await fetchOfficialRacers(date, venue, race);
     const parsedLast50 = parseLast50Heatmap(html);
     const verifiedRows = parsedLast50.verified && officialRacers.verified
       ? officialRacers.racers.map(racer=>{
           const row=parsedLast50.rows.find(x=>x.boat===racer.boat&&last50RacerNamesMatch(racer.name,x.name));
           return {boat:racer.boat,name:racer.name,counts:row?.counts??null,runs:row?.runs??null,verified:!!row};
         })
       : verifyHeatmapBoats(html, officialRacers);
     const last50MatchesOfficial = parsedLast50.verified && officialRacers.verified &&
       parsedLast50.rows.every(row => officialRacers.racers.some(r => r.boat === row.boat && last50RacerNamesMatch(r.name,row.name))) &&
       officialRacers.racers.every(r => parsedLast50.rows.some(row=>row.boat===r.boat&&last50RacerNamesMatch(r.name,row.name))) &&
       new Set(parsedLast50.rows.map(row=>normalizeLast50RacerName(row.name))).size===6 &&
       new Set(officialRacers.racers.map(row=>normalizeLast50RacerName(row.name))).size===6;
     const allSixVerified = verifiedRows.length === 6 &&
       verifiedRows.every(row => row.verified === true) &&
       new Set(verifiedRows.map(row => row.boat)).size === 6;
return reply(request,{
  status:'fetched',
  source,
  
...inspectBoatData(html),
boatLinks: extractBoatLinks(html),
racerInfo: inspectRacerInfo(html),
racerNameCandidates: extractRacerNames(html),

racersByBoat: allSixVerified ? verifiedRows : [],
racersByBoatVerified: allSixVerified,
dataReadyForPrediction: false,
heatmapReadyForAnalysis: allSixVerified,
dataQualityReason: !allSixVerified ? 'Six uniquely matched, verified boat rows are required' : !last50MatchesOfficial ? 'Heatmap matched, but last-50 table is not verified' : 'Heatmap and last-50 matched; exhibition, ST, wind, motor and other required prediction inputs remain unverified',
last50IdentityComparison: {
  officialVerified: officialRacers.verified === true,
  parsedTableVerified: parsedLast50.verified === true,
  official: (officialRacers.racers || []).map(r=>({boat:r.boat,name:r.name})),
  parsed: (parsedLast50.rows || []).map(r=>({boat:r.boat,name:r.name,runs:r.runs})),
  mismatches: (officialRacers.racers || []).filter(r=>!parsedLast50.rows.some(row=>row.boat===r.boat&&last50RacerNamesMatch(r.name,row.name))).map(r=>({boat:r.boat,officialName:r.name,parsedName:parsedLast50.rows.find(row=>row.boat===r.boat)?.name??null}))
},
last50Inspection: inspectLast50(html),
last50ByBoat: last50MatchesOfficial ? parsedLast50.rows : [],
last50PartialRows: officialRacers.verified ? parsedLast50.rows.filter(row=>officialRacers.racers.some(r=>r.boat===row.boat&&last50RacerNamesMatch(r.name,row.name))).map(row=>({...row,verified:true})):[],
last50MissingBoats: officialRacers.verified ? officialRacers.racers.filter(r=>!parsedLast50.rows.some(row=>row.boat===r.boat&&last50RacerNamesMatch(r.name,row.name))).map(r=>({boat:r.boat,name:r.name,status:'unpublished_or_unverified'})):[],
last50Verified: last50MatchesOfficial,
last50Status: last50MatchesOfficial ? 'officially_matched' : 'not_verified',
last50ParseReason: !officialRacers.verified ? 'official_six_boats_not_verified' : parsedLast50.verified ? 'last50_official_identity_mismatch' : parsedLast50.reason,
last50ParseDiagnostics: parsedLast50.diagnostics??null,
last50Reason: last50MatchesOfficial ? null : !officialRacers.verified ? '公式6艇の照合に失敗' : !parsedLast50.verified ? 'まくらぼ50走表の解析に失敗' : '公式6艇とまくらぼの選手・艇番が不一致',


embeddedDataInspection: inspectEmbeddedData(html),

heatmapInspection: inspectHeatmapData(html),

heatmapNumbers:
inspectHeatmapNumbers(html),

heatmapRows:
extractHeatmapRows(html),
heatmapBoatVerification: verifiedRows,

officialRacersInspection:
  officialRacers,


});
    } catch(e) {return reply(request,{status:'unavailable',reason:'upstream_fetch_failed',last50Verified:false,heatmapReadyForAnalysis:false,dataReadyForPrediction:false},502);}
  }
};
// Boat Score データ解析機能
function inspectBoatData(html) {
  return {
    htmlLength: html.length,
    title: html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || null
  };
}
function extractBoatLinks(html) {
  const links = [...html.matchAll(/href=["']([^"']+)["']/gi)]
    .map(m => m[1])
    .filter(link => /race|player|data/i.test(link));
  return [...new Set(links)].slice(0, 30);
}

function inspectRacerInfo(html) {
  const text = html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ");

  return {
    hasRacerInfo: /選手名|登録番号|全国勝率|当地勝率/.test(text),
    hasMotorInfo: /モーター|2連対率/.test(text),
    hasExhibitionInfo: /展示タイム|展示情報/.test(text),
    textSample: text.slice(0, 500)
  };
}

// Boat Score データ解析機能
function analyzeBoatScore(data) {
  return {
    racerInfo: data.hasRacerInfo ?? false,
    motorInfo: data.hasMotorInfo ?? false,
    exhibitionInfo: data.hasExhibitionInfo ?? false,
    dataReady:
      data.hasRacerInfo === true &&
      data.hasMotorInfo === true &&
      data.hasExhibitionInfo === true
  };
}

function calculateCourseWinRates(races) {
  const result = [];

  for (let course = 1; course <= 6; course++) {
    const records = races.filter(
      r => Number(r.course) === course
    );
    const starts = records.length;
    const wins = records.filter(
      r => Number(r.rank) === 1
    ).length;

    result.push({
      course,
      starts,
      wins,
      winRate: starts > 0
        ? Number((wins / starts * 100).toFixed(1))
        : null
    });
  }

  return result;
}
  
// コース別勝率を計算するためのテスト
function testCourseWinRates() {
  const races = [
    { course: 1, rank: 1 },
    { course: 1, rank: 2 },
    { course: 2, rank: 1 },
    { course: 2, rank: 3 }
  ];

  return calculateCourseWinRates(races);
}


// Boat Score 選手データ抽出テスト
function extractRacerData(html) {
  const text = html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ");

  
const names = extractHeatmapRows(html)
  .map(row => row.name)
  .filter(Boolean);


  return names.map((name, index) => ({
    boat: null,
    name,
    found: text.includes(name)
  }));
}



function extractRacerNames(html) {
  const section = html.match(
    /枠番別ヒートマップ[\s\S]{0,30000}/
  );

  if (!section) return [];

  const text = section[0]
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ");

  const names = [...text.matchAll(
    /(?:^|\s)([一-龯々]{1,4}[ぁ-んァ-ヶ一-龯々]{1,5})(?=\s|$)/g
  )].map(m => m[1]);

  const excluded = /^(優位|総合|選手|準備中|出走表|利用規約|問い合わせ|平均|全国|当地|枠番|結果|直近|展示|勝率|集計|順位|全場|着順|走数)$/;

  return [...new Set(
    names.filter(name => !excluded.test(name))
  )].slice(0, 30);
}


function inspectEmbeddedData(html) {
  const keywords = [
    "heatmap",
    "last50",
    "raceData"
  ];

  return {
    checks: keywords.map(word => ({
      keyword: word,
      found: html.includes(word)
    })),
    jsonScripts: (
      html.match(/<script[^>]*type=["']application\/json["'][^>]*>/gi) || []
    ).length
  };
}


function inspectLast50(html) {
  const text = html.replace(/<[^>]*>/g, " ");
  return {
    hasLast50: /直近50走|過去50走|最近50走/.test(text),
    hasHeatmap: /ヒートマップ/.test(text),
    hasCourseStats: /コース別|コース成績/.test(text)
  };
}


function inspectHeatmapData(html) {
  const names = extractHeatmapRows(html)
  .map(row => row.name)
  .filter(Boolean);
  return {
    htmlLength: html.length,
    racerNames: names.map(name => ({
      name,
      found: html.includes(name)
    })),
    hasHeatmapTable: /枠番別ヒートマップ/.test(html),
    hasHeatmapData: /35.{0,30}8.{0,30}2/.test(html)
  };
}
function inspectHeatmapNumbers(html) {
  const text = html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ");

  const pos = text.indexOf("枠番別ヒートマップ");

  return {
    found: pos >= 0,
    sample: pos >= 0
      ? text.slice(pos, pos + 1500)
      : null
  };
}

function extractHeatmapRows(html) {
  const tableRows = [...html.matchAll(
  /<tr\b[^>]*>[\s\S]*?<\/tr>/gi
)].map(m => m[0]);
const heatmapTableRows = tableRows.filter(row =>
  /枠番|着|平均|<td\b/i.test(row)
);
const parsedTableRows = heatmapTableRows.map(row => {
  const cells = [...row.matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)]
    .map(m => m[1]
  .replace(/<[^>]*>/g, "")
  .replace(/&nbsp;|&#160;|&#xA0;/gi, "")
  .replace(/\u00a0/g, "")
  .trim()
);
  return cells.map(cell => cell === "" || /^(?:&nbsp;|&#160;)+$/.test(cell) ? "0" : cell);
});
const text = html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
.replace(/<td\b[^>]*>\s*(?:&nbsp;|&#160;|\u00a0|\s)*<\/td>/gi, "<td>0</td>")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ");

  const start = text.indexOf("枠番別ヒートマップ");
  if (start < 0) return [];

  const names = extractRacerNames(html)
  .filter(name => text.indexOf(name, start) >= 0)
  .slice(0, 6);

  return names.map(name => {

const row = parsedTableRows.find(cells =>
  cells.some(cell =>
    cell.replace(/\s/g, "") === name.replace(/\s/g, "")
  )
);

const boat = row ? Number(row[0]) : null;
const tableCounts = row && row.length >= 8
  ? row.slice(2, 8).map(v => /^\\d+$/.test(v) ? Number(v) : null)
  : null;

const validBoat = Number.isInteger(boat) && boat >= 1 && boat <= 6 ? boat : null;


    const pos = text.indexOf(
  name,
  Math.max(start, text.indexOf("枠番別ヒートマップ", start) + 10)
);
    if (pos < 0) {
      return { name, counts: null, verified: false };
    } 

    const raw = text.slice(pos + name.length, pos + name.length + 300);
    const match = raw.match(
  /^\s*((?:\d{1,2}\s+){6})(\d{1,2})\s+(\d+\.\d{2})(?=\s|$)/
);

    if (!match && !tableCounts) {
  return { name, counts: null, verified: false };
}

    const counts = tableCounts ?? (
  match ? match[1].trim().split(/\s+/).map(Number) : null
);
    const runs = counts ? counts.reduce((a, b) => a + b, 0) : 0;

    if (!counts || counts.length !== 6 || counts.some(n => !Number.isInteger(n) || n < 0)) {
      return { name, counts: null, verified: false };
    }

    return {
      boat: validBoat,
      name,
      counts,
      runs,
      average: runs > 0 ? counts.reduce((sum, n, i) => sum + n * (i + 1), 0) / runs : null,
      verified: false
    };
  });
}


// Parse the published six-row heatmap table without guessing blank cells.
async function scanVenueMorning(date,venue,firstOfficial=null) {
  const records=[];
  for(let start=1;start<=12;start+=3){
    const batch=await Promise.all([start,start+1,start+2].map(async race=>{
      const official=race===1&&firstOfficial?firstOfficial:await fetchOfficialRacers(date,venue,race);
      return buildMorningRaceInputs(date,venue,race,official);
    }));
    records.push(...batch);
  }
  return records;
}

// Accept a cutoff only when an official race-list label and one unambiguous JST time exist.
function extractOfficialRaceDeadline(html,date) {
  if(!/^20[0-9]{6}$/.test(String(date))||typeof html!=='string')return null;
  const clean=html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,' ')
    .replace(/<[^>]+>/g,' ').replace(/&nbsp;|&#160;|&#xA0;/gi,' ')
    .replace(/\s+/g,' ').normalize('NFKC');
  const matches=[...clean.matchAll(/締切(?:予定)?(?:時刻|時間)?\s*[:：]?\s*([01]?\d|2[0-3]):([0-5]\d)/g)];
  const times=[...new Set(matches.map(m=>m[1].padStart(2,'0')+':'+m[2]))];
  if(times.length!==1)return null;
  const [hh,mm]=times[0].split(':').map(Number);
  const utc=Date.UTC(Number(date.slice(0,4)),Number(date.slice(4,6))-1,Number(date.slice(6,8)),hh-9,mm);
  const iso=new Date(utc).toISOString();
  return new Date(utc+9*3600000).toISOString().slice(0,10).replace(/-/g,'')===date?iso:null;
}

function buildMorningRaceInputs(date,venue,race,official) {
  if(!/^20[0-9]{6}$/.test(String(date))||!Number.isInteger(venue)||venue<1||venue>24||
    !Number.isInteger(race)||race<1||race>12||
    official?.verified!==true||official?.statsVerified!==true||
    !Array.isArray(official.statsByBoat)||official.statsByBoat.length!==6)
    return {ready:false,reason:'official_six_boat_stats_unverified'};
  const stats=official.statsByBoat;
  const boats=stats.map(x=>x.boat);
  if(new Set(boats).size!==6||!boats.every(x=>Number.isInteger(x)&&x>=1&&x<=6))
    return {ready:false,reason:'invalid_boat_identity'};
  const scoreRows=stats.map(x=>{
    const parseVerifiedMetric=value=>value===null||value===undefined||String(value).trim()===''?NaN:Number(value);
    const win=parseVerifiedMetric(x.nationwide?.winRate);
    const motor=parseVerifiedMetric(x.motor?.secondPlaceRate);
    const local=parseVerifiedMetric(x.local?.winRate);
    const top2=parseVerifiedMetric(x.nationwide?.secondPlaceRate);
    const top3=parseVerifiedMetric(x.nationwide?.thirdPlaceRate);
    return {boat:x.boat,win,motor,local,top2,top3};
  });
  if(!scoreRows.every(x=>Number.isFinite(x.win)&&x.win>=0&&x.win<=10&&Number.isFinite(x.motor)&&x.motor>=0&&x.motor<=100))
    return {ready:false,reason:'invalid_or_missing_morning_metrics'};
  const ranks=(key)=>new Map(scoreRows.slice().sort((a,b)=>b[key]-a[key]||a.boat-b.boat)
    .map((x,i)=>[x.boat,6-i]));
  const winRanks=ranks('win'),motorRanks=ranks('motor');
  const localVerified=scoreRows.every(x=>Number.isFinite(x.local)&&x.local>=0&&x.local<=10);
  // A verified local win rate of 0.00 means use the national rate as fallback,
  // never penalize the racer by averaging against a zero sample.
  const averageWinRates=new Map(scoreRows.map(x=>[x.boat,localVerified?(x.win+(x.local===0?x.win:x.local))/2:x.win]));
  const averageRanks=new Map(scoreRows.slice().sort((a,b)=>averageWinRates.get(b.boat)-averageWinRates.get(a.boat)||a.boat-b.boat).map((x,i)=>[x.boat,6-i]));
  const placesVerified=scoreRows.every(x=>Number.isFinite(x.top2)&&x.top2>=0&&x.top2<=100&&Number.isFinite(x.top3)&&x.top3>=x.top2&&x.top3<=100);
  const top2Ranks=placesVerified?ranks('top2'):null,top3Ranks=placesVerified?ranks('top3'):null;
  return {ready:true,date,venue,race,officialVerified:true,statsVerified:true,deadlineAt:official.deadlineAt||null,
    rankedScores:scoreRows.map(x=>({boat:x.boat,score:(7*averageRanks.get(x.boat)+3*motorRanks.get(x.boat))+(placesVerified?(top2Ranks.get(x.boat)+top3Ranks.get(x.boat))/100:0)})),
    method:localVerified?'average_national_local_winrate70_motor30_unvalidated':'national_winrate70_motor30_screening_unvalidated',placeRateTieBreakVerified:placesVerified,missingInputs:[...(!localVerified?['local']:[]),...(!placesVerified?['placeRates']:[]),'last50','course','exhibition','start','weather']};
}

// Independent screening for boat 1 winning. Scores are relative indices, not probabilities.
function rankMorningBoatOne(races,date){
 const found=new Map();
 for(const row of Array.isArray(races)?races:[]){
  const scores=row?.rankedScores,capture=Date.parse(row?.capturedAt||''),deadline=Date.parse(row?.deadlineAt||'');
  if(row?.date!==date||row.ready!==true||row.officialVerified!==true||row.statsVerified!==true||!Number.isInteger(row.venue)||row.venue<1||row.venue>24||!Number.isInteger(row.race)||row.race<1||row.race>12||!Number.isFinite(capture)||!Number.isFinite(deadline)||capture>=deadline||!Array.isArray(scores)||scores.length!==6||new Set(scores.map(x=>x.boat)).size!==6||!scores.every(x=>Number.isInteger(x.boat)&&x.boat>=1&&x.boat<=6&&Number.isFinite(x.score)))continue;
  const ordered=scores.slice().sort((a,b)=>b.score-a.score||a.boat-b.boat);
  if(JSON.stringify(row.predictedOrder)!==JSON.stringify(ordered.map(x=>x.boat)))continue;
  const jstDay=x=>new Date(x+9*3600000).toISOString().slice(0,10).replace(/-/g,'');
  if(jstDay(capture)!==date||jstDay(deadline)!==date)continue;
  const one=scores.find(x=>x.boat===1).score,other=Math.max(...scores.filter(x=>x.boat!==1).map(x=>x.score)),key=row.venue+':'+row.race;
  if(found.has(key))continue;
  found.set(key,{date,venue:row.venue,race:row.race,boatOneScore:one,nearestRivalScore:other,score:one-other,capturedAt:row.capturedAt,deadlineAt:row.deadlineAt,predictedOrder:ordered.map(x=>x.boat),rankedScores:ordered.map(x=>({boat:x.boat,score:x.score})),method:'boat_one_score_margin_v1',verifiedProbability:false});
 }
 return [...found.values()].sort((a,b)=>b.score-a.score||b.boatOneScore-a.boatOneScore||a.venue-b.venue||a.race-b.race).slice(0,20);
}
// Audit the actual saved ranking, never recreate missing historical selections.
function summarizeMorningBoatOne(date,morning,result){
 const summary={date,method:'boat_one_score_margin_v1',rankedAt:morning?.boatOneRankedAt||null,rankingPresent:false,selected:0,matched:0,wins:0,losses:0,pending:0,excluded:0,winRate:null,other:{eligible:0,matched:0,wins:0,winRate:null},details:[]};
 if(morning?.date!==date||!Array.isArray(morning.boatOneRanking))return {...summary,status:'ranking_not_saved'};
 summary.rankingPresent=true;
 const jstDay=t=>new Date(t+9*3600000).toISOString().slice(0,10).replace(/-/g,'');
 const validId=x=>x?.date===date&&Number.isInteger(x.venue)&&x.venue>=1&&x.venue<=24&&Number.isInteger(x.race)&&x.race>=1&&x.race<=12;
 const time=Date.parse(morning.boatOneRankedAt||'');
 const validTime=Number.isFinite(time)&&jstDay(time)===date;
 const evidence=new Map();
 for(const row of Array.isArray(morning.records)?morning.records:[]){
  if(!validId(row))continue;
  const verified=rankMorningBoatOne([row],date)[0];
  if(verified)evidence.set(row.venue+':'+row.race,verified);
 }
 const results=result?.date===date?result.records||{}:{};
 function finish(key,row){
  const f=results[key],order=f?.finishOrder;
  return validId(f)&&f.venue===row.venue&&f.race===row.race&&f.verified===true&&Array.isArray(order)&&order.length===6&&new Set(order).size===6&&order.every(n=>Number.isInteger(n)&&n>=1&&n<=6)?order:null;
 }
 const chosen=new Set();
 for(const [i,row] of morning.boatOneRanking.entries()){
  summary.selected++;
  const key=row?.venue+':'+row?.race,original=evidence.get(key);
  const duplicate=chosen.has(key);chosen.add(key);
  const detail={rank:i+1,venue:row?.venue,race:row?.race,score:row?.score??null};
  if(i>=20||duplicate||!validId(row)||!original||row.method!=='boat_one_score_margin_v1'||row.verifiedProbability!==false||row.score!==original.score||row.capturedAt!==original.capturedAt||row.deadlineAt!==original.deadlineAt||JSON.stringify(row.predictedOrder)!==JSON.stringify(original.predictedOrder)||!validTime||time<Date.parse(original.capturedAt)||time>=Date.parse(original.deadlineAt)){
   summary.excluded++;summary.details.push({...detail,status:'ranking_time_or_evidence_unverified'});continue;
  }
  const order=finish(key,row);
  if(!order){summary.pending++;summary.details.push({...detail,status:'result_unverified'});continue;}
  summary.matched++;if(order[0]===1)summary.wins++;else summary.losses++;
  summary.details.push({...detail,status:order[0]===1?'win':'loss',finishOrder:order});
 }
 for(const [key,row] of evidence){
  if(chosen.has(key)||!validTime||time<Date.parse(row.capturedAt)||time>=Date.parse(row.deadlineAt))continue;
  summary.other.eligible++;const order=finish(key,row);
  if(order){summary.other.matched++;if(order[0]===1)summary.other.wins++;}
 }
 summary.winRate=summary.matched?summary.wins/summary.matched:null;
 summary.other.winRate=summary.other.matched?summary.other.wins/summary.other.matched:null;
 return {...summary,status:summary.selected?'available':'no_candidates',note:'Saved ranking and verified normal six-boat results only; missing or late evidence excluded, not losses. Observed rate is not a forecast probability.'};
}
function classifyDailyRaceCandidates(races) {
  if(!Array.isArray(races))return {main:[],upset:[],chaos:[],held:0};
  const categories={main:[],upset:[],chaos:[]};
  let held=0;
  const seen=new Set();
  for(const race of races){
    const key=String(race?.date)+':'+String(race?.venue)+':'+String(race?.race);
    const scores=race?.rankedScores;
    if(seen.has(key))continue;
    seen.add(key);
    if(!/^20[0-9]{6}$/.test(String(race?.date))||!Number.isInteger(race?.venue)||race.venue<1||race.venue>24||
      !Number.isInteger(race?.race)||race.race<1||race.race>12||
      race?.officialVerified!==true||race?.statsVerified!==true||
      !Array.isArray(scores)||scores.length!==6||new Set(scores.map(x=>x.boat)).size!==6||
      !scores.every(x=>Number.isInteger(x.boat)&&x.boat>=1&&x.boat<=6&&Number.isFinite(x.score))){
      held++;continue;
    }
    const ordered=scores.slice().sort((a,b)=>b.score-a.score||a.boat-b.boat);
    const lead=ordered[0].score-ordered[1].score;
    const spread=ordered[0].score-ordered[5].score;
    const outer=Math.max(...ordered.filter(x=>x.boat>=4).map(x=>x.score));
    const inner=Math.max(...ordered.filter(x=>x.boat<=3).map(x=>x.score));
    // Persist the actual six-boat order before any result is known; never reconstruct later.
    // Morning-only, immutable candidate metrics. Retain the actual scoring input for
    // future audit of whether INNER racers were genuinely high scoring.
    // Do not reconstruct these metrics retrospectively from revised race pages.
    const innerRanked=ordered.filter(x=>x.boat<=3);
    const innerTopTwoCount=ordered.slice(0,2).filter(x=>x.boat<=3).length;
    const item={date:race.date,venue:race.venue,race:race.race,lead,spread,outerGap:outer-inner,
      capturedAt:race.capturedAt||null,
      deadlineAt:race.deadlineAt||null,
      rankedScores:ordered.map(x=>({boat:x.boat,score:x.score})),
      innerTopTwoCount,innerTopThreeCount:ordered.slice(0,3).filter(x=>x.boat<=3).length,
      innerTopScore:inner,outerTopScore:outer,
      innerTopTwoBoats:ordered.slice(0,2).filter(x=>x.boat<=3).map(x=>x.boat),
      status:'provisional_not_calibrated',predictedOrder:ordered.map(x=>x.boat)};
    const category=lead>=3&&ordered[0].boat<=3?'main':outer>=inner?'upset':'chaos';
    categories[category].push({...item,category,score:category==='main'?lead:category==='upset'?outer-inner:-spread});
  }
  for(const category of Object.keys(categories))
    categories[category].sort((a,b)=>b.score-a.score||a.venue-b.venue||a.race-b.race);
  return {main:categories.main.slice(0,20),upset:categories.upset.slice(0,20),chaos:categories.chaos.slice(0,20),held,
    method:'unvalidated_two_factor_screening',verifiedProbability:false};
}

function summarizeHistoricalOuterFollow(results) {
  if(!Array.isArray(results))return {verifiedRaces:0,eligibleRaces:0,followRaces:0,rate:null,ready:false};
  let verifiedRaces=0,eligibleRaces=0,followRaces=0;
  for(const result of results){
    const podium=result?.podium;
    if(result?.podiumVerified!==true||!Array.isArray(podium)||podium.length!==3||
      new Set(podium).size!==3||!podium.every(x=>Number.isInteger(x)&&x>=1&&x<=6))continue;
    verifiedRaces++;
    const winner=podium[0];
    if(winner>=6)continue;
    eligibleRaces++;
    if(podium[1]>winner||podium[2]>winner)followRaces++;
  }
  return {verifiedRaces,eligibleRaces,followRaces,rate:eligibleRaces?followRaces/eligibleRaces:null,
    ready:eligibleRaces>=30,definition:'winner_lower_boat_number_than_second_or_third'};
}

// Conservative, bounded beforeinfo adjustment. Only complete, six-boat verified exhibition
// records can affect the ranking; never infer unavailable measurements.
function applyVerifiedExhibitionAdjustment(baseScores, exhibition) {
  if(!Array.isArray(baseScores)||baseScores.length!==6||
     !baseScores.every(x=>Number.isInteger(x.boat)&&x.boat>=1&&x.boat<=6&&Number.isFinite(x.score))||
     new Set(baseScores.map(x=>x.boat)).size!==6||
     exhibition?.verified!==true||!Array.isArray(exhibition.rows)||exhibition.rows.length!==6)
    return {applied:false,rankedScores:baseScores,reason:'six_verified_exhibition_rows_required'};
  const rows=exhibition.rows;
  if(new Set(rows.map(x=>x.boat)).size!==6||
     !rows.every(x=>Number.isInteger(x.boat)&&x.boat>=1&&x.boat<=6&&
       Number.isFinite(x.exhibitionTime)&&x.exhibitionTime>=5&&x.exhibitionTime<=9))
    return {applied:false,rankedScores:baseScores,reason:'invalid_exhibition_metrics'};
  const sorted=rows.slice().sort((a,b)=>a.exhibitionTime-b.exhibitionTime||a.boat-b.boat);
  const ranks=new Map(sorted.map((x,i)=>[x.boat,6-i]));
  // Maximum correction is 1.5 points versus base scores typically ranging 10-60.
  return {applied:true,rankedScores:baseScores.map(x=>({...x,score:x.score+(ranks.get(x.boat)-3.5)*0.6})),
    reason:null,method:'verified_exhibition_time_small_rank_adjustment_unvalidated'};
}

// Start-exhibition timing and course are applied only when all six boats are
// uniquely verified. F/L starts are retained as observations, never scored as
// numerical timing. No course advantage is assumed without backtesting.
function applyVerifiedStartAdjustment(baseScores,start,verifiedStats=[]){
  if(!Array.isArray(baseScores)||baseScores.length!==6||
     !baseScores.every(x=>Number.isInteger(x.boat)&&x.boat>=1&&x.boat<=6&&Number.isFinite(x.score))||
     new Set(baseScores.map(x=>x.boat)).size!==6||
     start?.verified!==true||!Array.isArray(start.rows)||start.rows.length!==6)
    return {applied:false,rankedScores:baseScores,reason:'six_verified_start_rows_required',averageSTSubstitutions:[]};
  const rows=start.rows;
  if(new Set(rows.map(x=>x.boat)).size!==6||
     new Set(rows.map(x=>x.course)).size!==6||
     !rows.every(x=>Number.isInteger(x.boat)&&x.boat>=1&&x.boat<=6&&
       Number.isInteger(x.course)&&x.course>=1&&x.course<=6))
    return {applied:false,rankedScores:baseScores,reason:'invalid_start_course_rows',averageSTSubstitutions:[]};
  const stats=new Map(Array.isArray(verifiedStats)?verifiedStats.map(x=>[x.boat,x]):[]);
  const substitutions=[];
  const timed=[];
  for(const row of rows){
    let timing=row.startTiming;
    if(typeof timing==='string'&&/^[FL]\.\d{1,2}$/i.test(timing)){
      const avg=stats.get(row.boat)?.averageST;
      if(typeof avg!=='number'||!Number.isFinite(avg)||avg<0||avg>0.5)
        return {applied:false,rankedScores:baseScores,reason:'official_average_st_unverified',averageSTSubstitutions:[]};
      timing=avg;
      substitutions.push({boat:row.boat,original:row.startTiming,averageST:avg});
    }
    if(typeof timing!=='number'||!Number.isFinite(timing)||timing<0||timing>1)
      return {applied:false,rankedScores:baseScores,reason:'non_numeric_start_timing',averageSTSubstitutions:[]};
    timed.push({boat:row.boat,timing});
  }
  const sorted=timed.sort((a,b)=>a.timing-b.timing||a.boat-b.boat);
  const rank=new Map(sorted.map((x,i)=>[x.boat,6-i]));
  return {applied:true,rankedScores:baseScores.map(x=>({...x,score:x.score+(rank.get(x.boat)-3.5)*0.3})),
    reason:null,averageSTSubstitutions:substitutions,method:'verified_start_timing_or_official_average_st_small_adjustment_unvalidated'};
}

function rankTrifectaCandidates(rankedScores) {
  if(!Array.isArray(rankedScores)||rankedScores.length!==6||new Set(rankedScores.map(x=>x.boat)).size!==6||
    !rankedScores.every(x=>Number.isInteger(x.boat)&&x.boat>=1&&x.boat<=6&&Number.isFinite(x.score)))
    return {ready:false,main:[],upset:[],reason:'six_verified_scores_required'};
  const scores=new Map(rankedScores.map(x=>[x.boat,x.score]));
  const combinations=[];
  for(let first=1;first<=6;first++)for(let second=1;second<=6;second++)for(let third=1;third<=6;third++){
    if(first===second||first===third||second===third)continue;
    const strength=scores.get(first)*0.56+scores.get(second)*0.29+scores.get(third)*0.15;
    combinations.push({boats:[first,second,third],strength});
  }
  const ordered=combinations.sort((a,b)=>b.strength-a.strength||a.boats.join('').localeCompare(b.boats.join('')));
  const main=ordered.slice(0,6).map(x=>x.boats);
  const used=new Set(main.map(x=>x.join('-')));
  const upset=ordered.filter(x=>x.boats[0]>=4&&!used.has(x.boats.join('-'))).slice(0,6).map(x=>x.boats);
  return {ready:main.length===6&&upset.length===6,main,upset,reason:null,method:'two_factor_heuristic_unvalidated'};
}

function parseOfficialFinishOrder(html) {
  const tables=[...html.matchAll(/<table\b[^>]*>[\s\S]*?<\/table>/gi)].map(m=>m[0]);
  const clean=v=>String(v).replace(/<[^>]*>/g,' ').replace(/&nbsp;|&#160;|&#xA0;/gi,' ').replace(/\s+/g,' ').trim().normalize('NFKC');
  const diagnostics={candidateTables:0,parsedRows:0,nonNumericRanks:0};
  for(const table of tables){
    const trs=[...table.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)].map(m=>m[1]);
    const rows=trs.map(tr=>[...tr.matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)].map(m=>clean(m[1]))).filter(c=>c.length>=2);
    const headers=rows.find(c=>c.some(x=>x==='着'||x==='着順')&&c.some(x=>x==='枠'||x==='艇番'));
    if(!headers)continue;
    diagnostics.candidateTables++;
    const rankIndex=headers.findIndex(x=>x==='着'||x==='着順'),boatIndex=headers.findIndex(x=>x==='枠'||x==='艇番');
    const found=rows.slice(rows.indexOf(headers)+1).map(c=>({rank:c[rankIndex],boat:c[boatIndex]})).filter(x=>/^[1-6]$/.test(x.boat));
    diagnostics.parsedRows=Math.max(diagnostics.parsedRows,found.length);
    diagnostics.nonNumericRanks=Math.max(diagnostics.nonNumericRanks,found.filter(x=>!/^[1-6]$/.test(x.rank)).length);
    const numeric=found.filter(x=>/^[1-6]$/.test(x.rank)).map(x=>({rank:Number(x.rank),boat:Number(x.boat)}));
    const ranks=new Set(numeric.map(x=>x.rank)),boats=new Set(numeric.map(x=>x.boat));
    if(found.length!==6||numeric.length!==6||ranks.size!==6||boats.size!==6)continue;
    numeric.sort((x,y)=>x.rank-y.rank);
    return {verified:true,finishOrder:numeric.map(x=>x.boat),podiumVerified:true,podium:numeric.slice(0,3).map(x=>x.boat),reason:null,parserDiagnostics:diagnostics};
  }
  return {verified:false,finishOrder:[],podiumVerified:false,podium:[],reason:diagnostics.candidateTables?'result_rows_incomplete_or_nonstandard':'result_table_missing',parserDiagnostics:diagnostics};
}

// Normalize harmless typography differences only; never infer a racer from a partial name.
function normalizeLast50RacerName(value) {
  return String(value ?? '').normalize('NFKC')
    .replace(/[\s\u00a0\u200b-\u200d\u3000・･]/g, '')
    .replace(/(?:&nbsp;|&#160;|&#xA0;)/gi, '');
}
function last50RacerNamesMatch(officialName, heatmapName) {
  const official = normalizeLast50RacerName(officialName);
  const heatmap = normalizeLast50RacerName(heatmapName);
  // Makulabo can shorten a given name by one character (e.g. 船岡洋一郎 -> 船岡洋一).
  // Accept a four-character or longer prefix within the SAME numbered boat; retain existing 3-to-4 matching.
  return !!official && !!heatmap && (official === heatmap || (heatmap.length >= 4 && official.startsWith(heatmap)) || (heatmap.length === 3 && official.length === 4 && official.startsWith(heatmap)));
}
function parseLast50Heatmap(html) {
  const section = html.split(/枠番別ヒートマップ/)[1];
  if (!section) return {verified:false,rows:[],reason:'heading_missing'};
  const table = section.match(/<table\b[^>]*>[\s\S]*?<\/table>/i);
  if (!table) return {verified:false,rows:[],reason:'table_missing'};
  const rejectedRows = [];
  const rows = [...table[0].matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)].map(m => {
    const cells = [...m[1].matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)]
      .map(c => c[1].replace(/<[^>]*>/g,'').replace(/&nbsp;|&#160;|&#xA0;/gi,' ').normalize('NFKC').trim());
    if (cells.length < 10 || !/^[1-6]$/.test(cells[0])) return null;
    const counts = cells.slice(2,8).map(v => (v === '' || /^[—–－−-]$/.test(v)) ? 0 : (/^\d+$/.test(v) ? Number(v) : NaN));
    const runs = /^\d+$/.test(cells[8]) ? Number(cells[8]) : NaN;
    const avg = Number(cells[9]);
    const weighted = counts.reduce((sum,n,i) => sum + n*(i+1),0);
    const countSum=counts.reduce((a,b)=>a+b,0);
    const reason=!cells[1]?'missing_name':!counts.every(Number.isInteger)?'invalid_finish_counts':!Number.isInteger(runs)||runs<1||runs>50?'invalid_run_count':countSum!==runs?'run_count_mismatch':!Number.isFinite(avg)?'invalid_average':Math.abs(weighted/runs-avg)>0.011?'average_mismatch':null;
    if(reason){rejectedRows.push({boat:Number(cells[0]),reason,rawRuns:cells[8].slice(0,30),rawAverage:cells[9].slice(0,30),runs:Number.isFinite(runs)?runs:null,countSum:Number.isFinite(countSum)?countSum:null,average:Number.isFinite(avg)?avg:null,calculatedAverage:runs>0&&Number.isFinite(weighted)?Number((weighted/runs).toFixed(3)):null,invalidCountCells:cells.slice(2,8).map((value,index)=>({finish:index+1,value})).filter(x=>x.value!==''&&!/^\d+$/.test(x.value)).map(x=>({finish:x.finish,value:x.value.slice(0,20)}))});return null;}
    return {boat:Number(cells[0]),name:cells[1],counts,runs,average:avg};
  }).filter(Boolean);
  const verified = rows.length===6 && new Set(rows.map(r=>r.boat)).size===6 &&
    new Set(rows.map(r=>normalizeLast50RacerName(r.name))).size===6;
  return {verified,rows,reason:verified?null:'incomplete_or_inconsistent_table',diagnostics:{tableRowCount:[...table[0].matchAll(/<tr\b/gi)].length,validRowCount:rows.length,boatsFound:rows.map(r=>r.boat),nameLengths:rows.map(r=>normalizeLast50RacerName(r.name).length),rejectedRows}};
}

function verifyHeatmapBoats(html, officialRacers) {
  const rows = extractHeatmapRows(html);
  if (!officialRacers?.verified) return [];

  return officialRacers.racers.map(racer => {
    const normalize = name =>
      String(name ?? "").replace(/\s/g, "");

    const row = rows.find(
      r => normalize(r.name) === normalize(racer.name)
    );

    return {
      boat: racer.boat,
      name: racer.name,
      counts: row?.counts ?? null,
      verified: !!row &&
row.boat === racer.boat &&
        rows.filter(candidate => String(candidate.name).replace(/\s/g, "") === normalize(racer.name)).length === 1 &&
        Array.isArray(row.counts) &&
        row.counts.length === 6 &&
row.counts.every(n => Number.isInteger(n) && n >= 0) &&
row.counts.reduce((sum, n) => sum + n, 0) === row.runs
    };
  });
}


function extractOfficialWeather(html) {
  const plain=html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,' ')
    .replace(/<[^>]*>/g,' ').replace(/&nbsp;/g,' ').replace(/\s+/g,' ').trim();
  const section=plain.match(/水面気象情報([\s\S]{0,350})/);
  if(!section)return {verified:false,reason:'weather_section_missing'};
  const text=section[1];
  const number=(label,unit)=>{
    const m=text.match(new RegExp(label+'\\s*([+-]?\\d+(?:\\.\\d+)?)\\s*'+unit));
    return m?Number(m[1]):null;
  };
  const windSpeed=number('風速','m'),waveHeight=number('波高','cm');
  const airTemperature=number('気温','℃'),waterTemperature=number('水温','℃');
  const directionMatch=text.match(/風向\s*[:：]?\s*(北北東|東北東|東南東|南南東|南南西|西南西|西北西|北北西|北東|南東|南西|北西|北|東|南|西|無風)(?=\s|風速|波高|[、,。]|$)/);
  // Some official weather pages expose direction as image alt/title rather than text.
  // Accept only an explicit cardinal direction in the weather section; never infer from an icon.
  const weatherHtml=html.match(/水面気象情報[\s\S]{0,6000}/)?.[0]||'';
  const cardinal='北北東|東北東|東南東|南南東|南南西|西南西|西北西|北北西|北東|南東|南西|北西|北|東|南|西|無風';
  const imageLabels=[...weatherHtml.matchAll(/<(?:img|span)\b[^>]*>/gi)]
    .flatMap(m=>[...m[0].matchAll(/(?:alt|title|aria-label)\s*=\s*["']([^"']+)["']/gi)].map(a=>a[1]));
  const imageDirections=imageLabels.flatMap(label=>{
    const match=label.match(new RegExp('(?:風向\\s*[:：]?\\s*)?('+cardinal+')(?:の風|風向)?$'));
    return match?[match[1]]:[];
  });
  const windDirection=directionMatch?directionMatch[1]:(new Set(imageDirections).size===1?imageDirections[0]:null);
  const directionNearby=text.match(/風向[\s\S]{0,75}/);
  const directionDiagnostic=windDirection?null:(directionNearby?'wind_direction_label_without_cardinal_text':'wind_direction_label_absent_or_icon_only');
  const verified=windSpeed!==null&&windSpeed>=0&&windSpeed<=60&&
    waveHeight!==null&&waveHeight>=0&&waveHeight<=500;
  return {verified,windSpeed:verified?windSpeed:null,waveHeight:verified?waveHeight:null,
    airTemperature:airTemperature!==null&&airTemperature>=-30&&airTemperature<=50?airTemperature:null,
    waterTemperature:waterTemperature!==null&&waterTemperature>=-5&&waterTemperature<=45?waterTemperature:null,
    windDirection:verified?windDirection:null,windDirectionVerified:verified&&windDirection!==null,reason:directionDiagnostic};
}

function extractOfficialStartExhibition(html) {
  const table=[...html.matchAll(/<table\b[^>]*>[\s\S]*?<\/table>/gi)]
    .map(m=>m[0]).find(t=>/スタート展示/.test(t));
  if (!table) return {verified:false,rows:[],candidateCount:0};
  const candidates=[];
  for(const [,row] of table.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)){
    const text=row.replace(/<[^>]*>/g,' ').replace(/&nbsp;/g,' ').replace(/\s+/g,' ').trim();
    const match=text.match(/^([1-6])\s+([FfLl]?\s*\.?\d{1,2})$/);
    if(!match) continue;
    const boat=Number(match[1]),stText=match[2].replace(/\s/g,'');
    const st=stText.startsWith('F')||stText.startsWith('L') ? stText.toUpperCase() : Number(stText);
    if(typeof st==='number' && (st<0 || st>1)) continue;
    candidates.push({boat,course:candidates.length+1,startTiming:st});
  }
  const verified=candidates.length===6 && new Set(candidates.map(x=>x.boat)).size===6;
  return {verified,rows:verified?candidates:[],candidateCount:candidates.length};
}

function extractOfficialExhibition(html) {
  const table=[...html.matchAll(/<table\b[^>]*>[\s\S]*?<\/table>/gi)]
    .map(m=>m[0]).find(t=>/展示\s*タイム/.test(t.replace(/<[^>]*>/g,' ')) && /チルト/.test(t));
  if (!table) return {verified:false,rows:[]};
  const rows=[];
  for (const [,row] of table.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const cells=[...row.matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)]
      .map(m=>m[1].replace(/<[^>]*>/g,' ').replace(/&nbsp;/g,' ').replace(/\s+/g,' ').trim());
    if(cells.length<6 || !/^[1-6]$/.test(cells[0])) continue;
    const boat=Number(cells[0]),name=cells[2];
    const time=/^\d\.\d{2}$/.test(cells[4])?Number(cells[4]):null;
    const tilt=/^-?\d+(?:\.\d+)?$/.test(cells[5])?Number(cells[5]):null;
    if(!name || time===null || time<5 || time>9 || tilt===null || tilt< -2 || tilt>3) continue;
    rows.push({boat,name,exhibitionTime:time,tilt});
  }
  const verified=rows.length===6 && new Set(rows.map(r=>r.boat)).size===6;
  return {verified,rows:verified?rows.sort((a,b)=>a.boat-b.boat):[],candidateCount:rows.length};
}

function extractOfficialBoatStats(html) {
  const results = [];
  const rows = [...html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)];
  for (const [, row] of rows) {
    const cells = [...row.matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map(m=>m[1].replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim());
    if (cells.length < 8) continue;
    const boat = /^[１-６]$/.test(cells[0]) ? cells[0].charCodeAt(0)-'１'.charCodeAt(0)+1 : (/^[1-6]$/.test(cells[0]) ? Number(cells[0]) : null);
    if (!boat) continue;
    const ids=[...new Set([...row.matchAll(/toban=(\d{4})/g)].map(m=>m[1]))];
    if (ids.length !== 1 || !cells[2].includes(ids[0])) continue;
    const triple = value => {
      const m=value.match(/^(\d{1,2}\.\d{2})\s+(\d{1,3}\.\d{2})\s+(\d{1,3}\.\d{2})$/);
      if (!m) return null;
      const numbers=m.slice(1).map(Number);
      return numbers[0]<=10 && numbers[1]<=100 && numbers[2]<=100 ?
        {winRate:numbers[0],secondPlaceRate:numbers[1],thirdPlaceRate:numbers[2]} : null;
    };
    const equipment=value=>{
      const m=value.match(/^(\d{1,3})\s+(\d{1,3}\.\d{2})\s+(\d{1,3}\.\d{2})$/);
      if (!m || Number(m[2])>100 || Number(m[3])>100) return null;
      return {number:Number(m[1]),secondPlaceRate:Number(m[2]),thirdPlaceRate:Number(m[3])};
    };
    const nationwide=triple(cells[4]), local=triple(cells[5]), motor=equipment(cells[6]), hull=equipment(cells[7]);
    if (!nationwide || !local || !motor || !hull) continue;
    // Official racelist commonly shows F/L counts and average ST in one
    // column without a repeated "平均ST" label on each racer row.
    // Accept only an explicit label OR a tightly structured F/L + ST cell.
    // Never take a free-floating decimal from the racer name or win-rate cells.
    const stCell=cells[3].normalize('NFKC').replace(/\s+/g,' ').trim();
    const labelled=[...stCell.matchAll(/平均\s*S\s*T\s*[:：]?\s*(0?\.\d{2})/gi)];
    // HTML text extraction can collapse adjacent F/L and ST elements into
    // "F0L00.14". Anchor the full cell and require both F and L counts.
    const compact=stCell.replace(/\s+/g,'');
    const structured=compact.match(/^(?:F\d{1,2}L\d{1,2}|L\d{1,2}F\d{1,2})(0?\.\d{2})$/i);
    const extracted=labelled.length===1?labelled[0][1]:(labelled.length===0&&structured?structured[1]:null);
    const averageST=extracted!==null&&Number(extracted)>=0&&Number(extracted)<=0.5?
      Number(extracted):null;
    results.push({boat,racerId:ids[0],nationwide,local,motor,hull,averageST,averageSTParseDiagnostic:averageST===null?stCell.slice(0,100):null});
  }
  const verified=results.length===6 && new Set(results.map(x=>x.boat)).size===6 &&
    new Set(results.map(x=>x.racerId)).size===6;
  return {verified,rows:verified?results.sort((a,b)=>a.boat-b.boat):[],candidateCount:results.length};
}

function extractOfficialBoatRows(html) {
  // The official site repeats the same racer profile link within each
  // four-row boat group. Deduplicate IDs, never infer boats by link order.
  const rows = [...html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)];
  const candidates = [];
  for (const [, row] of rows) {
    const cells = [...row.matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map(m => m[1]);
    if (cells.length < 2) continue;
    const first = cells[0].replace(/<[^>]*>/g, ' ').replace(/\s+/g, '').trim();
    const boat = /^[１-６]$/.test(first) ? first.charCodeAt(0) - '１'.charCodeAt(0) + 1 :
      (/^[1-6]$/.test(first) ? Number(first) : null);
    if (!boat) continue;
    const links = [...row.matchAll(/<a\b[^>]*href=["']([^"']*racersearch\/profile[^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi)];
    const ids = [...new Set(links.map(link => {
      try { return new URL(link[1], 'https://www.boatrace.jp').searchParams.get('toban'); }
      catch { return null; }
    }).filter(id => /^\d{4}$/.test(id || '')))];
    if (ids.length !== 1) continue;
    const racerId = ids[0];
    const cellText = cells[2]?.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim() || '';
    const embeddedId = new RegExp('(?:^|\\s)' + racerId + '(?:\\s|/)').test(cellText);
    const profileName = links.map(link => link[2].replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()).find(Boolean);
    const name = embeddedId
      ? cellText.replace(new RegExp('^.*?' + racerId + '\\s*/\\s*[A-Z][12]?\\s*'), '')
        .split(/\s+(?:北海道|青森|岩手|宮城|秋田|山形|福島|茨城|栃木|群馬|埼玉|千葉|東京|神奈川|新潟|富山|石川|福井|山梨|長野|岐阜|静岡|愛知|三重|滋賀|京都|大阪|兵庫|奈良|和歌山|鳥取|島根|岡山|広島|山口|徳島|香川|愛媛|高知|福岡|佐賀|長崎|熊本|大分|宮崎|鹿児島|沖縄)\s*[/／]/)[0].trim()
      : (cells.length === 2 ? profileName : '');
    if (!name || (embeddedId && name === cellText)) continue;
    candidates.push({boat, racerId, name});
  }
  const verified = candidates.length === 6 &&
    new Set(candidates.map(r => r.boat)).size === 6 &&
    new Set(candidates.map(r => r.racerId)).size === 6;
  return {verified, racers: verified ? candidates.sort((a,b) => a.boat-b.boat) : [],
    candidateCount: candidates.length};
}

// Per-isolate cache: only fully verified official six-boat statistics.
const verifiedRacersCache=new Map();
function verifiedRacersCacheKey(date,venue,race){return String(date)+':'+Number(venue)+':'+Number(race);}
function getCachedVerifiedRacers(date,venue,race){
 const key=verifiedRacersCacheKey(date,venue,race),entry=verifiedRacersCache.get(key);
 if(!entry)return null;
 const now=Date.now(),deadline=Date.parse(entry.data?.deadlineAt||'');
 if(now-entry.savedAt>120000||now<entry.savedAt||(String(date)===jstDateFromUtc(new Date(now))&&(!Number.isFinite(deadline)||now>=deadline-15*60000))){verifiedRacersCache.delete(key);return null;}
 return entry.data;
}
function saveCachedVerifiedRacers(date,venue,race,data){
 if(data?.verified!==true||data?.statsVerified!==true||data.racers?.length!==6||data.statsByBoat?.length!==6)return;
 if(verifiedRacersCache.size>=30)verifiedRacersCache.delete(verifiedRacersCache.keys().next().value);
 verifiedRacersCache.set(verifiedRacersCacheKey(date,venue,race),{savedAt:Date.now(),data});
}
async function fetchOfficialRacers(date, venue, race, options={}) {
  if(options.forceRefresh)verifiedRacersCache.delete(verifiedRacersCacheKey(date,venue,race));
  const cached=options.forceRefresh?null:getCachedVerifiedRacers(date,venue,race);
  if(cached)return cached;
  const url = new URL(
    "https://www.boatrace.jp/owpc/pc/race/racelist"
  );

  url.searchParams.set("rno", String(Number(race)));
  url.searchParams.set("jcd", String(venue).padStart(2, "0"));
  url.searchParams.set("hd", String(date));

  try {
    // Official pages can respond slowly from Workers. Retry only transport failures;
    // never treat a timeout or an unverified response as valid racer data.
    let response;
    let lastTransportError;
    for (const timeoutMs of (options.interactive ? [6000, 12000] : options.fastVerification ? [4500, 4500] : [10000, 18000])) {
      try {
        response = await fetch(url.toString(), {
          headers: {Accept: 'text/html,application/xhtml+xml'},
          signal: AbortSignal.timeout(timeoutMs)
        });
        break;
      } catch (error) {
        lastTransportError = error;
        if (error?.name !== 'TimeoutError' && error?.name !== 'AbortError') throw error;
      }
    }
    if (!response) throw lastTransportError || new Error('official_transport_failed');

    if (!response.ok) {
      return { verified: false, statsVerified: false, statsByBoat: [], racers: [],
        reason: 'official_http_'+response.status };
    }

    const contentType = response.headers.get('content-type') || '';
    if (contentType && !/text\/html|application\/xhtml\+xml/i.test(contentType))
      return {verified:false,statsVerified:false,statsByBoat:[],racers:[],reason:'official_unexpected_content_type'};
    const declaredSize = Number(response.headers.get('content-length'));
    if(Number.isFinite(declaredSize)&&declaredSize>1000000)
      return {verified:false,statsVerified:false,statsByBoat:[],racers:[],reason:'official_response_too_large'};
    const html = await response.text();
    if(html.length>1000000)
      return {verified:false,statsVerified:false,statsByBoat:[],racers:[],reason:'official_response_too_large'};
const officialRows = extractOfficialBoatRows(html);
const officialStats = extractOfficialBoatStats(html);
const statsMatch = officialRows.verified && officialStats.verified && officialStats.rows.length===6 && officialRows.racers.length===6 && officialStats.rows.every((stat,i)=>stat.boat===officialRows.racers[i].boat && stat.racerId===officialRows.racers[i].racerId);
const racerLinks = [...html.matchAll(/href="([^"]*\/owpc\/pc\/data\/racersearch\/profile[^"]*)"/g)];
const uniqueRacerLinks = [...new Set(racerLinks.map(m => m[1]))];
const officialRacerIds = uniqueRacerLinks
  .map(link => new URL(link, "https://www.boatrace.jp").searchParams.get("toban"))
  .filter(Boolean);
const officialRacerLinkContexts = racerLinks
  .slice(0, 12)
  .map(m => html.slice(
    Math.max(0, m.index - 150),
    m.index + m[0].length + 100
  ));
const officialRacerIdCount = officialRacerIds.length;
const officialRacerIdsUnique =
  new Set(officialRacerIds).size === 6;
const officialText = html
  .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
  .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
  .replace(/<[^>]+>/g, " ")
  .replace(/\s+/g, " ")
  .trim();


const officialNames = officialRows.racers;
  


    const result={
      verified: officialRows.verified,
      statsVerified: statsMatch,
      deadlineAt:extractOfficialRaceDeadline(html,date),
      statsByBoat: statsMatch ? officialStats.rows : [],
      averageSTParseDiagnostics:statsMatch?officialStats.rows.map(x=>({boat:x.boat,rawCell:x.averageSTParseDiagnostic,parsed:x.averageST})):[],
      officialBoatRowCandidates: officialRows.candidateCount,
      racers: officialNames,
htmlLength: html.length,
officialTextSample: officialText.slice(0, 1500),
racerLinkCount: racerLinks.length,
officialRacerIdCount: officialRacerIdCount,
officialRacerLinkContexts: officialRacerLinkContexts,
officialRacerIdsUnique: officialRacerIdsUnique,
officialRacerIds: officialRacerIds,
uniqueRacerLinkCount: uniqueRacerLinks.length,
racerLinkSamples: racerLinks.slice(0, 6).map(m => m[1]),
    };
    saveCachedVerifiedRacers(date,venue,race,result);
    return result;
  } catch (error) {
    return {
      verified: false, statsVerified: false, statsByBoat: [], racers: [],
      reason: error?.name === 'TimeoutError' || error?.name === 'AbortError'
        ? 'official_timeout' : 'official_fetch_failed',
      diagnostic: {stage:'official_racelist_fetch',errorName:String(error?.name||'unknown').slice(0,40)}
    };
  }
}
