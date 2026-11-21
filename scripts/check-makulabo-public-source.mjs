// Read-only source reachability check. Never treats HTTP 200 as verified race data.
const [date,venue,race]=process.argv.slice(2);
if(!/^20\d{6}$/.test(date??'')||!/^\d{1,2}$/.test(venue??'')||!/^\d{1,2}$/.test(race??'')||+venue<1||+venue>24||+race<1||+race>12){
 console.error('Invalid date/venue/race');process.exit(2);
}
const url='https://makulabo-jp.com/data/'+venue.padStart(2,'0')+'/'+Number(race)+'/heatmap?hd='+date;
try {
 const res=await fetch(url,{headers:{Accept:'text/html'},signal:AbortSignal.timeout(15000)});
 const html=await res.text();
 const normalized=html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ');
 const result={httpStatus:res.status,contentType:res.headers.get('content-type'),htmlLength:html.length,
  hasHeatmapHeading:normalized.includes('枠番別ヒートマップ'),
  hasRecent50Label:/直近50走|過去50走|最近50走/.test(normalized),
  hasLoginMarkers:/ログイン|会員登録|新規登録/.test(normalized),
  // Structural hints only. Do not log page HTML, names, or pretend the
  // presence of tables means recent-50 results are verified.
  scriptTagCount:(html.match(/<script\\b/gi)||[]).length,
  externalScriptCount:(html.match(/<script\\b[^>]*\\bsrc\\s*=/gi)||[]).length,
  inlineScriptCount:(html.match(/<script\\b(?![^>]*\\bsrc\\s*=)/gi)||[]).length,
  hasFetchCall:/\\bfetch\\s*\\(/.test(html),
  hasAxiosCall:/\\baxios\\b/i.test(html),
  hasApiPath:/\\/api\\//i.test(html),
  hasDataAttributes:/\\bdata-[a-z-]+\\s*=/.test(html),
  tableCount:(html.match(/<table\\b/gi)||[]).length,
  tbodyCount:(html.match(/<tbody\\b/gi)||[]).length,
  rowCount:(html.match(/<tr\\b/gi)||[]).length,
  imageCount:(html.match(/<img\\b/gi)||[]).length,
  canvasCount:(html.match(/<canvas\\b/gi)||[]).length,
  hasRegistrationNumberLabel:/登録番号|登録No\\.?|登番/.test(normalized),
  hasWinRateLabel:/勝率|1着率|１着率/.test(normalized),
  hasScriptDataMarkers:html.includes('__NEXT_DATA__')||html.includes('__NUXT__')||html.includes('application/json'),
  hasHeatmapImageMarker:/heatmap[^\\s"'<>]*\\.(?:png|jpe?g|webp)/i.test(html),
  note:'Reachability and page markers only. Not six verified racers or a proven 50-race sample.'};
 console.log(JSON.stringify(result,null,2));
 if(!res.ok||!result.hasHeatmapHeading)process.exitCode=1;
}catch(e){console.error('Source fetch failed:',e.message);process.exitCode=1;}
