// Research-only public Makulabo page readiness probe. Never bypass authentication or infer last50.
export async function probeMakulaboPublicPage({date,venue,race,fetchImpl=fetch}={}){
 if(!/^20\d{6}$/.test(String(date))||!Number.isInteger(venue)||venue<1||venue>24||!Number.isInteger(race)||race<1||race>12)return {status:'invalid_selection'};
 const url=`https://makulabo-jp.com/data/${String(venue).padStart(2,'0')}/${race}/heatmap?hd=${date}`;
 try{
  const res=await fetchImpl(url,{redirect:'follow',headers:{accept:'text/html'},signal:AbortSignal.timeout(12000)});
  if(!res.ok)return {status:'http_error',httpStatus:res.status,url,recent50Ready:false};
  const type=res.headers.get('content-type')??'';
  if(!/text\/html/i.test(type))return {status:'unexpected_content_type',url,recent50Ready:false};
  const html=await res.text();
  if(html.length>1500000)return {status:'page_too_large',url,recent50Ready:false};
  const text=html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,' ').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ');
  const indicators={hasHeatmap:/ヒートマップ/.test(text),hasLast50Label:/直近\s*50\s*走|過去\s*50\s*走|50走/.test(text),hasLoginPrompt:/ログイン|会員登録|有料会員|新規登録/.test(text),hasRacerRegistrationId:/\b[3-5]\d{3}\b/.test(text),htmlBytes:html.length};
  const structure={tableCount:(html.match(/<table\b/gi)??[]).length,rowCount:(html.match(/<tr\b/gi)??[]).length,heatmapLabelCount:(text.match(/ヒートマップ/g)??[]).length,last50LabelCount:(text.match(/50走/g)??[]).length,visibleRacerNameLabels:(text.match(/選手名/g)??[]).length,visibleRegistrationLabels:(text.match(/登録番号|登録No/g)??[]).length,sourceHasDataAttributes:/data-(?:racer|player|boat|waku)/i.test(html),sourceHasPlayerLinks:/player|racer|toban|register/i.test(html)};
  const tableRows=[...html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)];
  const tableShape={rowCellCounts:tableRows.slice(0,12).map(m=>(m[1].match(/<(?:td|th)\b/gi)??[]).length),headerCells:(html.match(/<th\b/gi)??[]).length,registrationLinkCount:(html.match(/racersearch\/profile\/\d{4,6}/gi)??[]).length,containsDataTable:/<table\b[^>]*\b(?:data-|id=|class=)/i.test(html)};
  const js={scriptCount:html.split('<script').length-1,hasNextData:html.includes('__NEXT_DATA__'),hasNuxtData:html.includes('__NUXT__'),hasReactRoot:html.includes('id="root"')||html.includes('id="__next"'),hasVueRoot:html.includes('id="app"'),hasEmbeddedJson:html.includes('application/json'),hasApiPath:html.includes('/api/')||html.includes('axios.')};
  return {status:'public_page_inspected',url,recent50Ready:false,indicators,structure,tableShape,js,warning:'Page labels are not authenticated six-racer recent50 win rates. No values extracted or applied.'};
 }catch(e){return {status:'fetch_failed',url,recent50Ready:false,error:String(e.message).slice(0,120)};}
}

// Direct CLI mode: inspect only public page metadata, never store page HTML.
if(process.argv[1]&&import.meta.url===new URL('file://'+process.argv[1]).href){
 const date=process.env.MAKULABO_DATE||'20261119';
 const venue=Number(process.env.MAKULABO_VENUE||18);
 const race=Number(process.env.MAKULABO_RACE||2);
 const report=await probeMakulaboPublicPage({date,venue,race});
 console.log('MAKULABO_PUBLIC_PROBE',JSON.stringify(report));
 if(report.status!=='public_page_inspected')process.exitCode=1;
}
