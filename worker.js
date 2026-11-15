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
      await env.MORNING_KV.put(key,JSON.stringify(state),{expirationTtl:172800});
    }else{
      await env.MORNING_KV.put(key,JSON.stringify({date,status:'schedule_unverified',
        updatedAt:new Date().toISOString(),venues:[],completedVenues:[],failedVenues:[],
        categories:{main:[],upset:[],chaos:[]}}),{expirationTtl:172800});
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
  const remaining=venues.filter(v=>!state.completedVenues.includes(v)&&(state.attempts[v]||0)<3).slice(0,2);
  if(!remaining.length)return;
  for(const venue of remaining){
    state.attempts[venue]=(state.attempts[venue]||0)+1;
    try{
      const rows=await scanVenueMorning(date,venue);
      const verifiedRows=rows.filter(x=>x.ready===true);
      // A completed scan is not a verified venue if every official fetch failed.
      // Preserve the venue for a later bounded retry instead of falsely marking it done.
      if(!verifiedRows.length)throw new Error('venue_no_verified_races');
      const existing=new Set(state.records.map(x=>x.date+':'+x.venue+':'+x.race));
      for(const row of verifiedRows){
        const id=row.date+':'+row.venue+':'+row.race;
        if(!existing.has(id)){state.records.push(row);existing.add(id);}
      }
      state.completedVenues.push(venue);
      state.failedVenues=state.failedVenues.filter(v=>v!==venue);
    }catch(e){if(!state.failedVenues.includes(venue))state.failedVenues.push(venue);}
    state.updatedAt=new Date().toISOString();
    const ranking=classifyDailyRaceCandidates(state.records);
    state.categories={main:ranking.main,upset:ranking.upset,chaos:ranking.chaos};
    const exhausted=venues.filter(v=>!state.completedVenues.includes(v)&&(state.attempts[v]||0)>=3);
    state.status=state.completedVenues.length>=venues.length?'completed':exhausted.length+state.completedVenues.length>=venues.length?'incomplete':'partial';
    state.exhaustedVenues=exhausted;
    await env.MORNING_KV.put(key,JSON.stringify(state),{expirationTtl:172800});
  }
}
export default {
  async scheduled(event,env,ctx) {
    ctx.waitUntil(runScheduledMorning(env,event.scheduledTime));
  },
  async fetch(request,env) {
    const u = new URL(request.url);
    if (request.method === 'OPTIONS') return new Response(null, {status:204,headers:{...cors(request),'Access-Control-Allow-Methods':'GET, OPTIONS','Access-Control-Allow-Headers':'Content-Type','Access-Control-Max-Age':'600'}});
    
if (u.pathname === '/api/morning/snapshot') {
  if(request.method!=='GET')return reply(request,{error:'Method not allowed'},405);
  const date=u.searchParams.get('date')||'';
  if(!/^20[0-9]{6}$/.test(date))return reply(request,{error:'Invalid YYYYMMDD date'},400);
  if(!env?.MORNING_KV)return reply(request,{date,status:'not_configured',message:'Scheduled storage is not configured'},503);
  const saved=await env.MORNING_KV.get('morning:'+date);
  if(!saved)return reply(request,{date,status:'not_available',message:'No saved morning snapshot'},404);
  const state=JSON.parse(saved);
  return reply(request,{date,status:state.status,updatedAt:state.updatedAt||null,venues:state.venues||[],
    completedVenues:state.completedVenues||[],failedVenues:state.failedVenues||[],exhaustedVenues:state.exhaustedVenues||[],
    categories:state.categories||{main:[],upset:[],chaos:[]},eligible:(state.records||[]).length,
    provisional:true,method:'two_factor_morning_screening_unvalidated'});
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

if (u.pathname === '/api/version') return reply(request,{app:'Boat Score 2 preview',build:'20261115-auto-preview-check',sourceBranch:'fix-boat-score-2-syntax-20261115',features:['official-verified-venues','official-verified-races','six-racer-finish-rate-comparison','abort-obsolete-fetches','bounded-upstream-concurrency'],deployedAt:'not_reported'});

if (u.pathname === '/' || u.pathname === '/index.html') {
  if(request.method!=='GET')return reply(request,{error:'Method not allowed'},405);
  const html = String.raw`<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Boat Score 2</title>
<style>body{font-family:system-ui,sans-serif;background:#0b1424;color:#e5f0ff;margin:0}main{max-width:720px;margin:auto;padding:18px}h1{font-size:1.65rem}section{background:#17253b;border-radius:14px;padding:18px;margin:14px 0;box-shadow:0 2px 9px #172a4212}label{display:block;margin:12px 0 4px;font-weight:600}input,select,button{font:inherit;padding:11px;border:1px solid #b6c4d3;border-radius:8px;max-width:100%;box-sizing:border-box}button{background:#1768a6;color:white;border:0;margin:12px 0;cursor:pointer}button:disabled{opacity:.5}a{color:#72c8ff}pre{white-space:pre-wrap;overflow-wrap:anywhere;font-size:.85rem}small{color:#a9bdd5}.warn{color:#a64a00}</style></head>
<body><main><h1>Boat Score 2</h1><small>開発版 20261115-racers-retry-diagnostics · <a href="/api/version" target="_blank" rel="noopener">公開バージョンを確認</a></small><p>公式情報の取得状況と分析候補を確認する開発プレビューです。</p>
<section><h2>朝8時の全国事前評価</h2><p>当日開催場の公式日程を先に確認します。予想・ランキングはデータ確認が完了するまで表示しません。</p><button id="morningCheck">選択日の開催場を確認</button><button id="morningVenue">選択場の12Rを事前評価</button><button id="morningNational">全国の開催候補を集計</button><button id="morningSaved">朝8時のサーバー保存結果</button><p id="morningStatus" role="status">未確認</p><pre id="morningOutput"></pre><small>本命20R・穴20R・大荒れ20R／本命6点・穴6点は開発予定です。未取得データから買い目を生成しません。</small></section>
<section><h2>開催場・レースをまとめて選択</h2><label for="day">開催日</label><input type="date" id="day"><label for="venue">競艇場</label><select id="venue"><option value="">競艇場を選択</option><option value="1">桐生</option><option value="2">戸田</option><option value="3">江戸川</option><option value="4">平和島</option><option value="5">多摩川</option><option value="6">浜名湖</option><option value="7">蒲郡</option><option value="8">常滑</option><option value="9">津</option><option value="10">三国</option><option value="11">びわこ</option><option value="12">住之江</option><option value="13">尼崎</option><option value="14">鳴門</option><option value="15">丸亀</option><option value="16">児島</option><option value="17">宮島</option><option value="18">徳山</option><option value="19">下関</option><option value="20">若松</option><option value="21">芦屋</option><option value="22">福岡</option><option value="23">唐津</option><option value="24">大村</option></select><label for="race">レース</label><select id="race"><option value="">レースを選択</option><option value="1">1R</option><option value="2">2R</option><option value="3">3R</option><option value="4">4R</option><option value="5">5R</option><option value="6">6R</option><option value="7">7R</option><option value="8">8R</option><option value="9">9R</option><option value="10">10R</option><option value="11">11R</option><option value="12">12R</option></select><button id="load">選択したレースの公式データを取得</button><button id="predictSelected">このレースを予想（本命6点・穴6点）</button><p id="predictStatus" role="status">競艇場とレースを選択してください。</p><pre id="predictOutput"></pre><p><button id="schedule">開催場の一括照合（任意）</button></p><p id="scheduleStatus" role="status">競艇場・レースは照合前でも選択できます。</p><div id="scheduleOutput"></div><small>一括照合は参考情報です。開催の有無・出走表はレース取得時に公式確認し、未確認の情報は補いません。</small><p id="status" role="status"></p><div style="overflow-x:auto"><table id="comparison" style="border-collapse:collapse;width:100%;font-size:.84rem"><thead><tr><th>艇</th><th>選手名</th><th>登録番号</th><th>全国勝率</th><th>全国2連対率</th><th>全国3連対率</th><th>当地勝率</th><th>当地2連対率</th><th>当地3連対率</th><th>モーター</th><th>モーター2連対率</th><th>モーター3連対率</th><th>平均ST</th><th>展示タイム</th><th>展示ST</th><th>進入</th><th>チルト</th><th>まくらぼ50走</th></tr></thead><tbody id="comparisonBody"><tr><td colspan="18">レースを選んで「公式データを確認」を押してください</td></tr></tbody></table></div><small>選手の全国・当地2連対率／3連対率、モーター2連対率／3連対率を復元しました。公式照合できた場合のみ表示します。1着率・2着率・3着率の個別値はこの取得元からは未取得です。平均ST・まくらぼ50走も未確認です。</small><h3>選手の入賞率比較（公式照合済みのみ）</h3><div id="finishRateSummary" role="status">レースを選んで公式データを確認してください。</div><details><summary>公式データの取得結果・診断ログ</summary><pre id="output"></pre></details><h3>出走選手・診断ポイント</h3><div id="racerPoints" role="status">公式データ確認後に表示します。未確認項目は加点しません。</div></section>
<section><h2>まくらぼ直近50走</h2><p>スクリーンショットを参考にした入力画面へ進みます。未確認の数字は予想に反映しません。</p><a href="/tools/makulabo-screenshot">まくらぼ取り込み画面を開く</a></section>
<section><h2>本命・穴・大荒れランキング</h2><p class="warn">朝8時の自動集計は未実装です。全国ランキングは未確認データを埋めず、準備中と表示します。</p><button id="screen">選択場の暫定分析を確認</button><p id="screenStatus" role="status"></p><pre id="screenOutput"></pre><small>選択場のみ・オンデマンド分析。検証済みの的中確率ではありません。</small></section>
</main><script>
const names=['桐生','戸田','江戸川','平和島','多摩川','浜名湖','蒲郡','常滑','津','三国','びわこ','住之江','尼崎','鳴門','丸亀','児島','宮島','徳山','下関','若松','芦屋','福岡','唐津','大村'];
const day=document.getElementById('day'),venue=document.getElementById('venue'),race=document.getElementById('race');
const today=new Date(Date.now()+9*3600000).toISOString().slice(0,10);day.value=today;
venue.disabled=false;race.disabled=false;
const dateCode=()=>day.value.replaceAll('-','');

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
function clearRaceDisplay(){raceDataRequest++;if(raceDataController){raceDataController.abort();raceDataController=null;}document.getElementById('load').disabled=false;document.getElementById('comparisonBody').replaceChildren();document.getElementById('finishRateSummary').textContent='選択中のレースの公式データは未確認です';document.getElementById('racerPoints').textContent='レースを選んで公式データを確認してください';document.getElementById('output').textContent='';document.getElementById('status').textContent='';}
day.addEventListener('change',()=>{scheduleRequest++;if(scheduleController){scheduleController.abort();scheduleController=null;}document.getElementById('scheduleOutput').textContent='';resetRaceChoices();document.getElementById('scheduleStatus').textContent='日付を変更しました。以前の日付の開催場照合結果は破棄しました。';});
race.addEventListener('change',clearRaceDisplay);

async function refreshVerifiedRaces(){const token=++raceListRequest;if(raceListController)raceListController.abort();raceListController=new AbortController();const controller=raceListController;clearRaceDisplay();race.disabled=true;race.replaceChildren(new Option('レースを確認中…',''));if(!venue.value)return;const selectedVenue=venue.value,selectedDate=dateCode();try{const res=await fetch('/api/official/verified-races?date='+selectedDate+'&venue='+selectedVenue,{signal:controller.signal});const raw=await res.text();let data;try{data=JSON.parse(raw)}catch{throw Error('レース一覧APIがJSONを返しませんでした（HTTP '+res.status+'）')}if(token!==raceListRequest||selectedDate!==dateCode()||selectedVenue!==venue.value)return;if(!res.ok)throw Error('HTTP '+res.status);const confirmed=Array.isArray(data.verifiedRaces)?data.verifiedRaces.filter(v=>Number.isInteger(v)&&v>=1&&v<=12):[];race.replaceChildren(new Option(confirmed.length?'レースを選択':'確認できるレースなし',''));confirmed.forEach(v=>race.add(new Option(v+'R',String(v))));race.disabled=confirmed.length===0;document.getElementById('status').textContent=confirmed.length?'公式出走表で確認済み：'+confirmed.length+'レース':'公式出走表を確認できません。休止とは断定しません。'}catch(e){if(token!==raceListRequest)return;race.replaceChildren(new Option('レース情報を取得できません',''));race.disabled=true;document.getElementById('status').textContent='レース確認に失敗: '+e.message;}}
function resetRaceChoices(){
 raceListRequest++;if(raceListController){raceListController.abort();raceListController=null;}
 clearRaceDisplay();race.replaceChildren(new Option('レースを選択',''));
 for(let i=1;i<=12;i++)race.add(new Option(i+'R',String(i)));
 race.disabled=!venue.value;
 document.getElementById('status').textContent=venue.value?'レースを選び、公式データを取得してください。開催状況は取得時に確認します。':'';
}
venue.addEventListener('change',resetRaceChoices);
async function show(url,statusId,outId,button){const status=document.getElementById(statusId),out=document.getElementById(outId);button.disabled=true;status.textContent='公式情報を確認中…';out.textContent='';try{const res=await fetch(url);const data=await res.json();if(!res.ok)throw Error(data.error||'HTTP '+res.status);status.textContent='取得完了（未確認項目は推測しません）';out.textContent=JSON.stringify(data,null,2)}catch(e){status.textContent='取得できませんでした: '+e.message}finally{button.disabled=false}}
const morningCacheKey=date=>'boat-score-morning-'+date;
function restoreMorningSnapshot(){const out=document.getElementById('morningOutput'),st=document.getElementById('morningStatus');try{const raw=localStorage.getItem(morningCacheKey(dateCode()));if(!raw){out.textContent='';st.textContent='この日の保存済み集計はありません';return;}const data=JSON.parse(raw);if(data.date!==dateCode()||typeof data.text!=='string')throw Error('invalid');out.textContent=data.text;st.textContent='端末保存の事前評価：'+new Date(data.savedAt).toLocaleString('ja-JP')+'（'+(data.complete?'完了':'途中')+'・最新データではありません）';}catch(e){out.textContent='';st.textContent='保存結果を読み込めません';}}
document.getElementById('day').addEventListener('change',restoreMorningSnapshot);
restoreMorningSnapshot();
document.getElementById('morningSaved').onclick=async function(){const st=document.getElementById('morningStatus'),out=document.getElementById('morningOutput');this.disabled=true;st.textContent='サーバー保存結果を確認中…';try{const res=await fetch('/api/morning/snapshot?date='+dateCode(),{signal:AbortSignal.timeout(12000)});const d=await res.json();if(!res.ok)throw Error(d.message||d.error||'HTTP '+res.status);const lines=['朝8時のサーバー保存結果','更新: '+(d.updatedAt||'未確認'),'状態: '+d.status,'確認済み: '+d.completedVenues.length+'場 / 対象: '+d.venues.length+'場','取得済み評価レース: '+(d.eligible||0)+'R','取得失敗: '+(d.failedVenues||[]).length+'場 / 再試行上限: '+(d.exhaustedVenues||[]).length+'場','予想は暫定方式（検証前）'];for(const [key,label] of [['main','本命'],['upset','穴'],['chaos','大荒れ']]){const rows=d.categories?.[key]||[];lines.push(label+' TOP '+rows.length+'：'+(rows.length?rows.map((x,i)=>(i+1)+'. '+x.venue+'場 '+x.race+'R').join(' / '):'該当なし'));}out.textContent=lines.join('\n');st.textContent=d.status==='completed'?'サーバー集計完了':'サーバー集計途中（または未確認）';}catch(e){st.textContent='保存結果を表示できません: '+e.message;}finally{this.disabled=false;}};
let nationalMorningController=null;
document.getElementById('morningNational').onclick=async function(){
 const button=this,st=document.getElementById('morningStatus'),out=document.getElementById('morningOutput');
 if(nationalMorningController){nationalMorningController.abort();return;}
 const controller=new AbortController();nationalMorningController=controller;
 button.textContent='全国集計を中止';out.textContent='';st.textContent='開催場候補を確認中…';
 const grouped={main:[],upset:[],chaos:[]},failures=[],results=[];
 const labels={main:'本命',upset:'穴',chaos:'大荒れ'};
 const render=()=>{const lines=['全国事前評価（暫定・未検証）','取得成功 '+results.length+'場／取得失敗 '+failures.length+'場'];
 for(const key of ['main','upset','chaos']){const top=grouped[key].slice().sort((a,b)=>b.score-a.score||a.venue-b.venue||a.race-b.race).slice(0,20);
 lines.push(labels[key]+' TOP '+top.length+'：'+(top.length?top.map((x,j)=>(j+1)+'. '+x.venue+'場 '+x.race+'R').join(' / '):'確認できた候補なし'));}
 if(failures.length)lines.push('未取得: '+failures.join('、'));out.textContent=lines.join('\n');try{localStorage.setItem(morningCacheKey(dateCode()),JSON.stringify({date:dateCode(),savedAt:new Date().toISOString(),complete:false,text:out.textContent}));}catch(e){} };
 try{
 const found=new Set();let offset=0,partial=false;
 do{
  const response=await fetch('/api/morning/venues?date='+dateCode()+'&offset='+offset,{signal:AbortSignal.any([controller.signal,AbortSignal.timeout(13000)])});
  const schedule=await response.json();if(!response.ok)throw Error(schedule.message||'開催場候補を確認できません');
  for(const v of schedule.venues||[])found.add(v);
  partial=schedule.status==='partial_verified_race1_fallback';
  offset=partial&&schedule.nextOffset!=null?schedule.nextOffset:null;
  st.textContent='公式1R確認 '+(offset==null?24:offset)+'/24場／確認済み '+found.size+'場';
 }while(offset!=null&&!controller.signal.aborted);
 const venues=[...found];if(!venues.length)throw Error('確認できた開催場はありません。未確認の場が非開催とは限りません。');
 let next=0,done=0;
 const worker=async()=>{while(next<venues.length&&!controller.signal.aborted){
 const v=venues[next++];
 try{const res=await fetch('/api/daily/verified-venue-screen?date='+dateCode()+'&venue='+v,{signal:AbortSignal.any([controller.signal,AbortSignal.timeout(90000)])});
 const d=await res.json();if(!res.ok)throw Error(d.error||'HTTP '+res.status);
 results.push(d);for(const key of ['main','upset','chaos'])for(const item of d.categories?.[key]||[])grouped[key].push(item);
 }catch(e){if(controller.signal.aborted)return;failures.push(v+'場: '+e.message);}
 done++;st.textContent='全国照合 '+done+'/'+venues.length+'場（成功 '+results.length+'場）';render();
 }};
 await Promise.all(Array.from({length:Math.min(3,venues.length)},()=>worker()));
 if(controller.signal.aborted){st.textContent='集計を中止しました。取得済みの結果のみ表示';}
 else st.textContent='全国候補の集計終了（端末に保存・朝8時の自動実行は未実装）';
 render();try{localStorage.setItem(morningCacheKey(dateCode()),JSON.stringify({date:dateCode(),savedAt:new Date().toISOString(),complete:!controller.signal.aborted&&failures.length===0,text:out.textContent}));}catch(e){}
 }catch(e){st.textContent=controller.signal.aborted?'集計を中止しました':'全国集計できません: '+e.message;}
 finally{if(nationalMorningController===controller)nationalMorningController=null;button.textContent='全国の開催候補を集計';}
};
document.getElementById('morningVenue').onclick=async function(){const st=document.getElementById('morningStatus'),out=document.getElementById('morningOutput');if(!venue.value){st.textContent='先に競艇場を選択してください';return;}this.disabled=true;st.textContent='選択場の12レースを公式照合中（時間がかかる場合があります）…';out.textContent='';try{const res=await fetch('/api/daily/verified-venue-screen?date='+dateCode()+'&venue='+encodeURIComponent(venue.value),{signal:AbortSignal.timeout(110000)});const d=await res.json();if(!res.ok)throw Error(d.error||'HTTP '+res.status);st.textContent='照合 '+(d.scanned||0)+'R／評価可能 '+(d.eligible||0)+'R／未確認 '+(d.held||0)+'R';const labels={main:'本命候補',upset:'穴候補',chaos:'大荒れ候補'};let lines=['事前評価（未検証の暫定方式・朝8時の保存結果ではありません）'];for(const key of ['main','upset','chaos']){const rows=d.categories?.[key]||[];lines.push(labels[key]+': '+(rows.length?rows.map(x=>x.race+'R').join('、'):'評価可能な候補なし'));}for(const rec of d.records||[]){if(!rec.ready)continue;const picks=rec.picks||{};lines.push(rec.race+'R 買い目候補（検証前） '+JSON.stringify(picks));}out.textContent=lines.join('\n');}catch(e){st.textContent='事前評価できません: '+e.message;}finally{this.disabled=false;}};
document.getElementById('morningCheck').onclick=async function(){const st=document.getElementById('morningStatus'),out=document.getElementById('morningOutput');st.textContent='公式日程を照合中…';out.textContent='';this.disabled=true;try{const res=await fetch('/api/morning/venues?date='+dateCode(),{signal:AbortSignal.timeout(15000)});const data=await res.json();if(!res.ok)throw Error(data.message||data.error||'HTTP '+res.status);st.textContent='開催候補 '+data.venueCount+'場／予想は未作成';out.textContent='場コード: '+data.venues.join('、')+'\n'+data.message;}catch(e){st.textContent='開催場を確認できません: '+e.message;}finally{this.disabled=false}};
document.getElementById('schedule').onclick=refreshRunningVenues;
let selectedPredictionController=null;
function clearSelectedPrediction(){
 if(selectedPredictionController){selectedPredictionController.abort();selectedPredictionController=null;}
 const button=document.getElementById('predictSelected');
 button.disabled=false;
 document.getElementById('predictOutput').textContent='';
 document.getElementById('predictStatus').textContent='選択内容が変更されました。新しいレースで予想を実行してください。';
}
day.addEventListener('change',clearSelectedPrediction);
venue.addEventListener('change',clearSelectedPrediction);
race.addEventListener('change',clearSelectedPrediction);
document.getElementById('predictSelected').onclick=async function(){
 const st=document.getElementById('predictStatus'),out=document.getElementById('predictOutput');
 if(!day.value||!venue.value||!race.value){st.textContent='開催日・競艇場・レースを選択してください';return;}
 if(selectedPredictionController)selectedPredictionController.abort();
 const controller=new AbortController();selectedPredictionController=controller;this.disabled=true;out.textContent='';st.textContent='選択レースの公式6艇・勝率・モーター成績を照合中…';
 const date=dateCode(),v=venue.value,r=race.value;
 try{const res=await fetch('/api/predict/selected-race?date='+date+'&venue='+v+'&race='+r,{signal:AbortSignal.any([controller.signal,AbortSignal.timeout(25000)])});
 const d=await res.json();if(controller.signal.aborted||date!==dateCode()||v!==venue.value||r!==race.value)return;
 if(!res.ok)throw Error(d.error||'HTTP '+res.status);
 if(!d.ready){st.textContent='データ不足のため予想を保留: '+(d.reason||'確認できません');out.textContent='未確認情報を推測で補いません。';return;}
 const fmt=rows=>rows.map((x,i)=>(i+1)+'. '+x.join('-')).join(' / ');
 out.textContent=names[Number(v)-1]+' '+r+'R（'+date+'）\n本命6点：'+fmt(d.main)+'\n穴6点：'+fmt(d.upset)+'\n※全国勝率・モーター2連対率のみの暫定モデル。展示・ST・風・進入・直近50走は未反映。';
 st.textContent='選択レースの暫定予想を表示しました（的中保証なし）';
 }catch(e){if(!controller.signal.aborted)st.textContent='予想を取得できません: '+e.message;}
 finally{if(selectedPredictionController===controller){selectedPredictionController=null;this.disabled=false;}}
};
document.getElementById('load').onclick=async function(){const notice=document.getElementById('status');notice.textContent='読み込み操作を受け付けました。入力を確認中…';if(!day.value||!venue.value||venue.disabled||race.disabled||!race.value){notice.textContent='開催日・競艇場・レース番号を選択してください。';return;}if(raceDataController)raceDataController.abort();const token=++raceDataRequest,controller=new AbortController(),selectedDate=dateCode(),selectedVenue=venue.value,selectedRace=race.value;raceDataController=controller;const b=this,p=document.getElementById('racerPoints'),tbody=document.getElementById('comparisonBody'),finish=document.getElementById('finishRateSummary');p.textContent='選手・モーター情報を確認中…';finish.textContent='公式データを照合中…';tbody.textContent='';b.disabled=true;let d={};try{const urlBase='?date='+selectedDate+'&venue='+selectedVenue+'&race='+selectedRace;
 const res=await fetch('/api/official/race-data'+urlBase,{signal:AbortSignal.any([controller.signal,AbortSignal.timeout(15000)])});if(!res.ok)throw Error('公式データ API HTTP '+res.status);d=await res.json();
 if(d.racersVerified!==true){
   document.getElementById('status').textContent='通常取得で6艇を確認できません。出走表専用の取得を再試行中…';
   const backup=await fetch('/api/official/racers-only'+urlBase,{signal:AbortSignal.any([controller.signal,AbortSignal.timeout(12000)])});
   if(backup.ok){const limited=await backup.json();if(limited.racersVerified===true){d={...d,racersVerified:true,statsVerified:limited.statsVerified,racersByBoat:limited.racersByBoat,statsByBoat:limited.statsByBoat,diagnostics:{...d.diagnostics,racersOnlyFallback:'verified'}};}else{d.diagnostics={...d.diagnostics,racersOnlyFallbackReason:limited.diagnostics?.reason||'unverified'};}}
 }if(token!==raceDataRequest||selectedDate!==dateCode()||selectedVenue!==venue.value||selectedRace!==race.value)return;if(!res.ok)throw Error(d.error||'HTTP '+res.status);document.getElementById('status').textContent=d.racersVerified===true?'公式出走表取得成功':'公式出走表を確認できません：'+(d.officialReason||d.reason||JSON.stringify(d.missingInputs||[])||'理由不明');document.getElementById('output').textContent=JSON.stringify(d,null,2)}catch(err){if(token!==raceDataRequest)return;document.getElementById('status').textContent='取得できませんでした: '+err.message;d={}}finally{if(raceDataController===controller){raceDataController=null;b.disabled=false}}if(token!==raceDataRequest)return;const racers=d.racersVerified===true&&Array.isArray(d.racersByBoat)?d.racersByBoat:[],stats=d.statsVerified===true&&Array.isArray(d.statsByBoat)?d.statsByBoat:[],ex=d.exhibitionVerified===true&&Array.isArray(d.exhibitionByBoat)?d.exhibitionByBoat:[],starts=d.startVerified===true&&Array.isArray(d.startByCourse)?d.startByCourse:[];const fmt=v=>v===null||v===undefined||v===''?'未確認':String(v);for(let i=1;i<=6;i++){const x=racers.find(v=>v.boat===i),t=stats.find(v=>v.boat===i),e=ex.find(v=>v.boat===i),st=starts.find(v=>v.boat===i);const pct=v=>typeof v==='number'&&Number.isFinite(v)?v.toFixed(2)+'%':'未確認';const values=[i+'号艇',fmt(x?.name),fmt(x?.racerId),fmt(t?.nationwide?.winRate),pct(t?.nationwide?.secondPlaceRate),pct(t?.nationwide?.thirdPlaceRate),fmt(t?.local?.winRate),pct(t?.local?.secondPlaceRate),pct(t?.local?.thirdPlaceRate),fmt(t?.motor?.number),pct(t?.motor?.secondPlaceRate),pct(t?.motor?.thirdPlaceRate),'未確認',fmt(e?.exhibitionTime),fmt(st?.startTiming),fmt(st?.course),fmt(e?.tilt),'未確認'];const tr=document.createElement('tr');values.forEach((v,j)=>{const td=document.createElement('td');td.textContent=v;td.style.cssText='border-bottom:1px solid #d7e0ea;padding:8px 6px;white-space:nowrap;'+(j===0?'font-weight:700;':'');tr.appendChild(td)});tbody.appendChild(tr)}if(d.statsVerified===true&&stats.length===6&&racers.length===6){const table=document.createElement('table');table.style.cssText='border-collapse:collapse;width:100%;font-size:.9rem';const head=document.createElement('tr');['艇・選手','全国2連対率','全国3連対率','当地2連対率','当地3連対率'].forEach(label=>{const th=document.createElement('th');th.textContent=label;th.style.cssText='border-bottom:1px solid #aaa;text-align:left;padding:7px';head.appendChild(th)});table.appendChild(head);for(let i=1;i<=6;i++){const t=stats.find(v=>v.boat===i),x=racers.find(v=>v.boat===i),tr=document.createElement('tr');[i+' '+(x?.name||'未確認'),t?.nationwide?.secondPlaceRate,t?.nationwide?.thirdPlaceRate,t?.local?.secondPlaceRate,t?.local?.thirdPlaceRate].forEach((v,j)=>{const td=document.createElement('td');td.textContent=j===0?v:(typeof v==='number'&&Number.isFinite(v)?v.toFixed(2)+'%':'未確認');td.style.cssText='border-bottom:1px solid #ddd;padding:7px';tr.appendChild(td)});table.appendChild(tr)}finish.replaceChildren(table)}else{finish.textContent='公式の6艇分の入賞率を照合できていません。推測値は表示しません。'}p.textContent='公式選手情報: '+(d.racersVerified===true?'照合済':'未確認')+' / 勝率・モーター: '+(d.statsVerified===true?'照合済':'未確認')+' / 展示: '+(d.exhibitionVerified===true?'照合済':'未確認')+' / ST・進入: '+(d.startVerified===true?'照合済':'未確認')+'。診断ポイントは必要情報がそろうまで保留します。'}
document.getElementById('screen').onclick=function(){if(!day.value||!venue.value||venue.disabled)return;show('/api/daily/verified-venue-screen?date='+dateCode()+'&venue='+venue.value,'screenStatus','screenOutput',this)};
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
  return reply(request,await getVerifiedList('races:'+date+':'+venue,async()=>{const checks=await mapOfficialLimited(Array.from({length:12},(_,i)=>i+1),6,async race=>{
    try{
      const official=await fetchOfficialRacers(date,venue,race,{verificationOnly:true});
      return {race,verified:official.verified===true};
    }catch{return {race,verified:false};}
  });
  return {date,venue,verifiedRaces:checks.filter(x=>x.verified).map(x=>x.race),
    checks,completeScheduleVerified:false,
    note:'Only verified six-boat official entry lists are selectable. Unverified does not mean cancelled.'};}));
}

if (u.pathname === '/api/predict/selected-race') {
  if(request.method!=='GET')return reply(request,{error:'Method not allowed'},405);
  const date=u.searchParams.get('date')||'',venue=Number(u.searchParams.get('venue')),race=Number(u.searchParams.get('race'));
  if(!/^20[0-9]{6}$/.test(date)||!Number.isInteger(venue)||venue<1||venue>24||!Number.isInteger(race)||race<1||race>12)
    return reply(request,{error:'Invalid date, venue or race'},400);
  let official;
  try{official=await fetchOfficialRacers(date,venue,race);}
  catch(e){return reply(request,{date,venue,race,ready:false,main:[],upset:[],reason:'official_fetch_failed',detail:String(e?.message||e).slice(0,120)});}
  const inputs=buildMorningRaceInputs(date,venue,race,official);
  if(!inputs.ready)return reply(request,{date,venue,race,ready:false,main:[],upset:[],reason:inputs.reason||'verified_inputs_missing',
    missingInputs:inputs.missingInputs||[],officialVerified:official?.verified===true,statsVerified:official?.statsVerified===true});
  const picks=rankTrifectaCandidates(inputs.rankedScores);
  return reply(request,{date,venue,race,ready:picks.ready,main:picks.main,upset:picks.upset,
    rankedScores:inputs.rankedScores,method:picks.method||inputs.method,missingInputs:inputs.missingInputs,
    verified:'official_six_boat_entries_and_two_metrics_only',
    note:'On-demand provisional two-factor model, not validated odds or winning probability. Exhibition, ST, wind, course and last50 are NOT included.'});
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
   out.textContent=(i+1)+'/3 '+name+'の取得を実行しました。\\n'+(last||'応答待ち・取得状況は各欄を確認してください。')+'\\n※データが揃わない場合は分析を保留します。';
  }
  if(version===evidenceLoadVersion){const key=currentDataKey(),csvOk=priorSnapshotKey===key&&priorSnapshot?.officialVerified===true,exOk=officialSnapshotKey===key&&officialSnapshot?.exhibitionVerified===true,stOk=officialSnapshotKey===key&&officialSnapshot?.startVerified===true,resultOk=verifiedFinish?.key===key&&Array.isArray(verifiedFinish.places)&&verifiedFinish.places.length===3;const complete=csvOk&&exOk&&stOk&&resultOk;out.textContent+='\\n【取得後の照合判定】\\nCSV登録番号：'+(csvOk?'公式6艇一致':'未確認')+'\\n展示6艇：'+(exOk?'確認済':'未確認')+'\\n進入6艇：'+(stOk?'確認済':'未確認')+'\\n公式確定着順：'+(resultOk?'確認済':'未確認')+'\\n'+(complete?'4条件が揃いました。「条件と着順を照合」を押して検証を進めてください。':'不足データがあるため、検証登録は保留してください。')+'\\n※まくらぼ直近50走は別途未確認です。';}
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
   out.textContent='選択日・同場の結果取得診断 '+race+'/12\\n確認済：'+verified+' / 未確認：'+failed+'\\n'+rows.join('\\n');
  }
  if(version===scanVersion){choice.replaceChildren(new Option(confirmed.length?'確認済みレースを選択':'確認済みレースなし',''));for(const item of confirmed)choice.add(new Option(item.race+'R：'+item.order.join('-'),String(item.race)));open.disabled=confirmed.length===0;}
  if(version===scanVersion)out.textContent+='\\n【診断集計】\\n確認済：'+verified+'/12\\n未確認：'+failed+'/12\\n失敗理由：'+(Object.entries(reasons).map(([k,v])=>k+' '+v+'件').join('、')||'なし')+'\\n※取得状況の診断です。予想データとの照合や的中率の検証ではありません。';
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
  diagnostics.textContent='API応答：HTTP '+res.status+'\\n照合：'+(d.verified===true?'成功':'未確認')+'\\n理由：'+String(d.reason||'なし')+'\\n公式ページHTTP：'+String(d.diagnostics?.upstreamStatus??d.upstreamStatus??'不明')+'\\nHTML文字数：'+String(d.diagnostics?.htmlBytes??'不明')+'\\nテーブル数：'+String(d.diagnostics?.tableCount??'不明')+'\\n結果見出し検出：'+String(d.diagnostics?.hasResultHeading??'不明')+'\\n候補テーブル：'+String(d.parserDiagnostics?.candidateTables??'不明')+' / 読取行数：'+String(d.parserDiagnostics?.parsedRows??'不明')+' / 数字以外の着順：'+String(d.parserDiagnostics?.nonNumericRanks??'不明')+'\\n※公式ページの構造変更・未公開・通信失敗を区別するための診断です。';
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
 out.textContent='公式確定着順を取得済みの一時集計：'+records.length+'レース / 30レース目標まで残り '+Math.max(0,30-records.length)+'レース（重複レースは上書き）\\n'+lines.join('\\n')+'\\n※公式結果APIで照合した着順のみ集計。該当艇の件数であり的中率・予測精度ではありません。';
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
  out.textContent='CSV参考集計：'+records.size+'レース / 30レース目標まで残り '+Math.max(0,30-records.size)+'レース\\n'+linesOut.join('\\n')+'\\n※CSV内の公式照合済みフラグは自己申告値です。今回の読み込みで公式サイトへの再照合は行っていません。現行の公式確認済み集計には混ぜません。';
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
 out.textContent=(officialResultVerified?'公式結果取得済みの着順：':'手入力の着順（公式未照合・集計不可）：')+places.join('-')+'\\n'+observations.map(x=>x.boat+'号艇：'+(places.includes(x.boat)?places.indexOf(x.boat)+1+'着':'3着以内なし')+' / 事前最高値 '+x.leaderCount+'/3 / 展示最短 '+(x.fastest?'該当':'非該当')+' / 進入変動 '+(x.courseChange?'該当':'非該当')).join('\\n')+'\\n※単一レースの観察です。予測精度や的中率を示すものではありません。';
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
 box.textContent='事前→直前の項目別照合（優劣や買い目は未判定）\\n'+parts.join('\\n')+'\\n【直前の観察】\\n'+(observations.length?observations.join('\\n'):'照合できた観察項目なし')+'\\n※事前CSV数値は非公式。展示進入は本番進入の確定情報ではありません。まくらぼ50走・オッズは未反映。';
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
  if(makulabo?.last50Verified!==true){const warning=document.createElement('p');warning.textContent='まくらぼ直近50走が未確認のため、50走比較と30点評価は表示できません。';comparison.appendChild(warning)}
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
 const result=await fetchOfficialRacers(date,venue,race);
 return reply(request,{date,venue,race,racersVerified:result.verified===true,statsVerified:result.statsVerified===true,racersByBoat:result.verified?result.racers:[],statsByBoat:result.statsVerified?result.statsByBoat:[],diagnostics:{reason:result.reason||null,htmlLength:result.htmlLength||null}});
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
  const complete=official.verified&&official.statsVerified&&exhibitionMatches&&startMatches&&weather.verified;
  const missingInputs=[];
  if(!official.verified)missingInputs.push('racers');
  if(official.statsVerified!==true)missingInputs.push('stats');
  if(!exhibitionMatches)missingInputs.push('exhibition');
  if(!startMatches)missingInputs.push('start');
  if(weather.verified!==true)missingInputs.push('weather');
  if(weather.windDirectionVerified!==true)missingInputs.push('windDirection');
  return reply(request,{
    status:complete?'official_sources_verified':'partial',missingInputs,
    diagnostics:{officialRacersReason:official.verified?null:(official.reason||'official_racer_rows_not_verified'),officialRacerCandidateCount:official.officialBoatRowCandidates??null,officialResponseLength:official.htmlLength??null,officialStatsReason:official.statsVerified?null:'official_stats_not_verified',beforeinfoReason:beforeFailureReason||(before?(exhibition.verified&&start.verified&&weather.verified?'beforeinfo_verified':'beforeinfo_parsing_not_verified'):'beforeinfo_unavailable'),beforeinfoResponseLength:before?.length??null,exhibitionCandidateCount:exhibition.candidateCount??0,startCandidateCount:start.candidateCount??0,exhibitionParserVerified:exhibition.verified===true,startParserVerified:start.verified===true,weatherParserReason:weather.reason??null,selectedDate:date,selectedVenue:Number(venue),selectedRace:Number(race)},
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
  const url=new URL('https://www.boatrace.jp/owpc/pc/race/beforeinfo');
  url.searchParams.set('rno',String(Number(race)));
  url.searchParams.set('jcd',String(venue).padStart(2,'0'));
  url.searchParams.set('hd',date);
  try {
    const res=await fetch(url.toString(),{headers:{Accept:'text/html'},signal:AbortSignal.timeout(10000)});
    if(!res.ok)return reply(request,{status:'unavailable',reason:'upstream_http_'+res.status,dataReadyForPrediction:false},502);
    const html=await res.text();
    if(html.length>1000000)return reply(request,{status:'unavailable',reason:'response_too_large',dataReadyForPrediction:false},502);
    const exhibition=extractOfficialExhibition(html);
    const start=extractOfficialStartExhibition(html);
    const weather=extractOfficialWeather(html);
    return reply(request,{
      status:exhibition.verified&&start.verified?'verified':'partial',
      exhibitionVerified:exhibition.verified,startVerified:start.verified,
      weatherVerified:weather.verified===true,windDirectionVerified:weather.windDirectionVerified===true,
      exhibitionByBoat:exhibition.rows,startByCourse:start.rows,
      weather, dataReadyForPrediction:false
    });
  } catch(e) {
    return reply(request,{status:'unavailable',reason:'upstream_fetch_failed',dataReadyForPrediction:false},502);
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
    const source = `https://makulabo-jp.com/data/${venue.padStart(2,'0')}/${Number(race)}?hd=${date}`;
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
     const verifiedRows = verifyHeatmapBoats(html, officialRacers);
     const last50MatchesOfficial = parsedLast50.verified && officialRacers.verified &&
       parsedLast50.rows.every(row => officialRacers.racers.some(r => r.boat === row.boat && r.name.replace(/\s/g,'') === row.name.replace(/\s/g,'')));
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
last50Inspection: inspectLast50(html),
last50ByBoat: last50MatchesOfficial ? parsedLast50.rows : [],
last50Verified: last50MatchesOfficial,
last50Status: last50MatchesOfficial ? 'officially_matched' : 'not_verified',
last50ParseReason: parsedLast50.reason,
last50Reason: last50MatchesOfficial ? null : 'Six official boat identities and consistent last-50 table data could not be confirmed',


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
    const win=Number(x.nationwide?.winRate);
    const motor=Number(x.motor?.secondPlaceRate);
    return {boat:x.boat,win,motor};
  });
  if(!scoreRows.every(x=>Number.isFinite(x.win)&&x.win>=0&&x.win<=10&&Number.isFinite(x.motor)&&x.motor>=0&&x.motor<=100))
    return {ready:false,reason:'invalid_or_missing_morning_metrics'};
  const ranks=(key)=>new Map(scoreRows.slice().sort((a,b)=>b[key]-a[key]||a.boat-b.boat)
    .map((x,i)=>[x.boat,6-i]));
  const winRanks=ranks('win'),motorRanks=ranks('motor');
  return {ready:true,date,venue,race,officialVerified:true,statsVerified:true,
    rankedScores:scoreRows.map(x=>({boat:x.boat,score:winRanks.get(x.boat)+motorRanks.get(x.boat)})),
    method:'two_factor_morning_screening_unvalidated',missingInputs:['last50','course','exhibition','start','weather']};
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
    const item={date:race.date,venue:race.venue,race:race.race,lead,spread,outerGap:outer-inner,
      status:'provisional_not_calibrated'};
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

function parseLast50Heatmap(html) {
  const section = html.split(/枠番別ヒートマップ/)[1];
  if (!section) return {verified:false,rows:[],reason:'heading_missing'};
  const table = section.match(/<table\b[^>]*>[\s\S]*?<\/table>/i);
  if (!table) return {verified:false,rows:[],reason:'table_missing'};
  const rows = [...table[0].matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)].map(m => {
    const cells = [...m[1].matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)]
      .map(c => c[1].replace(/<[^>]*>/g,'').replace(/&nbsp;|&#160;|&#xA0;/gi,' ').trim());
    if (cells.length < 10 || !/^[1-6]$/.test(cells[0])) return null;
    const counts = cells.slice(2,8).map(v => v === '' ? 0 : (/^\d+$/.test(v) ? Number(v) : NaN));
    const runs = /^\d+$/.test(cells[8]) ? Number(cells[8]) : NaN;
    const avg = Number(cells[9]);
    const weighted = counts.reduce((sum,n,i) => sum + n*(i+1),0);
    if (!cells[1] || !counts.every(Number.isInteger) || !Number.isInteger(runs) || runs < 1 || runs > 50 ||
        counts.reduce((a,b)=>a+b,0)!==runs || !Number.isFinite(avg) ||
        Math.abs(weighted/runs-avg)>0.011) return null;
    return {boat:Number(cells[0]),name:cells[1],counts,runs,average:avg};
  }).filter(Boolean);
  const verified = rows.length===6 && new Set(rows.map(r=>r.boat)).size===6 &&
    new Set(rows.map(r=>r.name.replace(/\s/g,''))).size===6;
  return {verified,rows:verified?rows:[],reason:verified?null:'incomplete_or_inconsistent_table'};
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
  const imageLabels=[...weatherHtml.matchAll(/<(?:img|span)\\b[^>]*>/gi)]
    .flatMap(m=>[...m[0].matchAll(/(?:alt|title|aria-label)\\s*=\\s*["']([^"']+)["']/gi)].map(a=>a[1]));
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
    results.push({boat,racerId:ids[0],nationwide,local,motor,hull});
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

async function fetchOfficialRacers(date, venue, race, options={}) {
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
    for (const timeoutMs of (options.fastVerification ? [8500] : [10000, 18000])) {
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
  


    return {
      verified: officialRows.verified,
      statsVerified: statsMatch,
      statsByBoat: statsMatch ? officialStats.rows : [],
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
  } catch (error) {
    return {
      verified: false, statsVerified: false, statsByBoat: [], racers: [],
      reason: error?.name === 'TimeoutError' || error?.name === 'AbortError'
        ? 'official_timeout' : 'official_fetch_failed'
    };
  }
}
