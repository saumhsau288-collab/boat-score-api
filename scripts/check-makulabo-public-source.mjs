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
 const scriptTags=[...html.matchAll(/<script\b[^>]*>/gi)].map(m=>m[0]);
 const externalScripts=scriptTags.filter(tag=>/\bsrc\s*=/.test(tag));
 const dataAttributeNames=[...new Set([...html.matchAll(/\b(data-[a-z][a-z0-9-]*)\s*=/gi)].map(m=>m[1].toLowerCase()))].sort().slice(0,30);
 const tableSummaries=[...html.matchAll(/<table\b[^>]*>[\s\S]*?<\/table>/gi)].slice(0,3).map((m,index)=>{
  const table=m[0];
  const rows=[...table.matchAll(/<tr\b[^>]*>[\s\S]*?<\/tr>/gi)];
  const headerLabels=(rows[0]?.[0].match(/<th\b[^>]*>[\s\S]*?<\/th>/gi)||[]).map(cell=>cell.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim().slice(0,40));
  const firstColumnTypes=rows.slice(1).map(row=>{
   const cell=row[0].match(/<td\b[^>]*>[\s\S]*?<\/td>/i)?.[0]??'';
   const value=cell.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();
   return {isBoatNumber:/^[1-6]$/.test(value),hasDigits:/\d/.test(value),isEmpty:value.length===0};
  });
  return {index,headerLabels,firstColumnTypes,rowCount:rows.length,headerCellCount:(table.match(/<th\b/gi)||[]).length,
   dataCellCount:(table.match(/<td\b/gi)||[]).length,
   firstRows:rows.slice(0,3).map(row=>({
    cells:(row[0].match(/<(?:th|td)\b/gi)||[]).length,
    hasNumericToken:/\d/.test(row[0]),
    hasWinRateLabel:/勝率|1着率|１着率/.test(row[0]),
    hasRecent50Label:/直近50走|過去50走|最近50走/.test(row[0])
   }))};
 });
 const result={httpStatus:res.status,contentType:res.headers.get('content-type'),htmlLength:html.length,
  hasHeatmapHeading:normalized.includes('枠番別ヒートマップ'),
  hasRecent50Label:/直近50走|過去50走|最近50走/.test(normalized),
  hasLoginMarkers:/ログイン|会員登録|新規登録/.test(normalized),
  // Structural hints only. Do not log page HTML, names, or pretend the
  // presence of tables means recent-50 results are verified.
  scriptTagCount:scriptTags.length,
  externalScriptCount:externalScripts.length,
  inlineScriptCount:scriptTags.length-externalScripts.length,
  dataAttributeNames,
  tableSummaries,
  hasFetchCall:html.includes('fetch('),
  hasAxiosCall:html.toLowerCase().includes('axios'),
  hasApiPath:html.includes('/api/'),
  hasDataAttributes:html.includes('data-'),
  tableCount:(html.match(/<table\b/gi)||[]).length,
  tbodyCount:(html.match(/<tbody\b/gi)||[]).length,
  rowCount:(html.match(/<tr\b/gi)||[]).length,
  imageCount:(html.match(/<img\b/gi)||[]).length,
  canvasCount:(html.match(/<canvas\b/gi)||[]).length,
  hasRegistrationNumberLabel:/登録番号|登録No\\.?|登番/.test(normalized),
  hasWinRateLabel:/勝率|1着率|１着率/.test(normalized),
  hasScriptDataMarkers:html.includes('__NEXT_DATA__')||html.includes('__NUXT__')||html.includes('application/json'),
  hasHeatmapImageMarker:/heatmap[^\\s"'<>]*\\.(?:png|jpe?g|webp)/i.test(html),
  note:'Reachability and page markers only. Not six verified racers or a proven 50-race sample.'};
 console.log(JSON.stringify(result,null,2));
 if(!res.ok||!result.hasHeatmapHeading)process.exitCode=1;
}catch(e){console.error('Source fetch failed:',e.message);process.exitCode=1;}
