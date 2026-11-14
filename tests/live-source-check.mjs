const targets = [
  ['official', 'https://www.boatrace.jp/owpc/pc/race/racelist?rno=1&jcd=02&hd=20261109'],
  ['makulabo', 'https://makulabo-jp.com/data/01/1?hd=20261113']
];
for (const [label,url] of targets) {
  try {
    let response;
    for(let attempt=1;attempt<=2;attempt++){
      try {
        response=await fetch(url,{redirect:'follow',signal:AbortSignal.timeout(label==='official'?20000:10000),headers:{Accept:'text/html'}});
        break;
      } catch(error) {
        if(attempt===2 || error?.name!=='TimeoutError') throw error;
        console.log(JSON.stringify({source:label,event:'retry_after_timeout',attempt}));
      }
    }
    const type=response.headers.get('content-type') || '';
    const body=await response.text();
    const text=body.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ').replace(/<[^>]*>/g,' ');
    const title=(body.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]||'').replace(/\s+/g,' ').trim().slice(0,120);
    const summary={source:label,status:response.status,finalUrl:response.url,documentTitle:title,contentType:type.split(';')[0],htmlLength:body.length,
      heatmapHeading:/枠番別ヒートマップ/.test(text),
      racerProfiles:(body.match(/racersearch\/profile/g)||[]).length,
      loginOrSignup:/ログイン|会員登録|新規登録/.test(text),
      dataKeywords:{heatmap:/ヒートマップ/.test(text),last50:/直近50走|過去50走|50走/.test(text),race:/出走表|レース/.test(text)}};
    const tables=(body.match(/<table\b/gi)||[]).length;
    const headings=[...body.matchAll(/<h[1-6]\b[^>]*>([\s\S]*?)<\/h[1-6]>/gi)].slice(0,20).map(m=>m[1].replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim().slice(0,70));
    summary.tableCount=tables;
    summary.headings=headings;
    summary.heatmapKeywordCount=(text.match(/ヒートマップ/g)||[]).length;
    summary.officialProfileLinkCount=(body.match(/toban=\d+/g)||[]).length;

    summary.pageStructure={
      scriptTags:(body.match(/<script\b/gi)||[]).length,
      inlineJsonScripts:(body.match(/<script\b[^>]*type=['"]application\/json['"]/gi)||[]).length,
      nextDataMarker:body.includes('__NEXT_DATA__'),
      nuxtDataMarker:body.includes('__NUXT__'),
      apiReferences:(body.match(/\/api\//g)||[]).length,
      heatmapWordInScript:/<script\b[^>]*>[\s\S]*?ヒートマップ[\s\S]*?<\/script>/i.test(body),
      canvasTags:(body.match(/<canvas\b/gi)||[]).length,
      svgTags:(body.match(/<svg\b/gi)||[]).length
    };
    const svgBlocks=[...body.matchAll(/<svg\b[^>]*>[\s\S]*?<\/svg>/gi)];
    summary.svgInspection={
      blocks:svgBlocks.length,
      withText:svgBlocks.filter(m=>/<text\b/i.test(m[0])).length,
      withRect:svgBlocks.filter(m=>/<rect\b/i.test(m[0])).length,
      withPath:svgBlocks.filter(m=>/<path\b/i.test(m[0])).length,
      textLabels:[...new Set(svgBlocks.flatMap(m=>[...m[0].matchAll(/<text\b[^>]*>([\s\S]*?)<\/text>/gi)].map(x=>x[1].replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim()).filter(Boolean)))].slice(0,25)
    };
    summary.hasNoDataNotice=/データがありません/.test(text);
    const scriptSources=[...body.matchAll(/<script\b[^>]*src=["']([^"']+)["']/gi)].map(m=>m[1]);
    const relevantSources=scriptSources.filter(src=>/data|race|heat|chart|main|app/i.test(src)).slice(0,12);
    summary.renderingClues={
      svgWithAccessibleLabel:svgBlocks.filter(m=>/aria-label=|<title\b/i.test(m[0])).length,
      scriptsWithSrc:scriptSources.length,
      relevantScriptPaths:relevantSources.map(src=>{try{return new URL(src,response.url).pathname.slice(0,150)}catch{return 'unparsed'}}),
      htmlContainsJsonData:body.includes('application/ld+json'),
      dataAttributes:(body.match(/\bdata-[a-z-]+=/gi)||[]).length
    };
    const heatPos=text.indexOf('ヒートマップ');
    summary.heatmapContext=heatPos>=0?text.slice(Math.max(0,heatPos-100),heatPos+180).replace(/\s+/g,' ').trim():null;
    summary.visibleRaceDataIndicators={
      racerNumberMatches:(text.match(/\b[0-9]{4}\b/g)||[]).length,
      heatmapDataRows:(body.match(/heatmap[-_]?row|heatmap[-_]?data/gi)||[]).length
    };
    if(label==='official' && response.ok && !summary.hasNoDataNotice){
      const {readFileSync}=await import('node:fs');
      const vm=await import('node:vm');
      const workerSource=readFileSync('worker.js','utf8').replace('export default {','const workerExport = {');
      const ctx=vm.createContext({URL,Response,Request,Headers,AbortSignal,fetch:()=>{throw Error('Network disabled in parser inspection')}});
      vm.runInContext(workerSource,ctx,{filename:'worker.js'});
      const parsed=vm.runInContext('extractOfficialBoatRows',ctx)(body);
      summary.officialParser={verified:parsed.verified,candidateCount:parsed.candidateCount,boatCount:parsed.racers?.length||0};
      const parsedStats=vm.runInContext('extractOfficialBoatStats',ctx)(body);
      summary.officialStats={
        verified:parsedStats.verified,
        candidateCount:parsedStats.candidateCount,
        boatCount:parsedStats.rows.length,
        sample:parsedStats.verified?parsedStats.rows[0]:null
      };

    }
    if(label==='official' && response.ok && !summary.hasNoDataNotice){
      const rows=[...body.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)];
      summary.officialMarkup={
        rowCount:rows.length,
        rowCellCounts:rows.slice(0,12).map(m=>(m[1].match(/<td\b/gi)||[]).length),
        rowProfileCounts:rows.slice(0,12).map(m=>(m[1].match(/racersearch\/profile/gi)||[]).length),
        rowClassNames:rows.slice(0,12).map(m=>(m[0].match(/^<tr\b[^>]*class=["']([^"']*)/i)?.[1]||'').slice(0,70)),
        profileParentTags:[...body.matchAll(/<a\b[^>]*racersearch\/profile[^>]*>/gi)].slice(0,4).map(m=>body.slice(Math.max(0,m.index-250),m.index).match(/<([a-z][\w-]*)\b[^>]*>\s*$/i)?.[1]||'unknown')
      };
    }
    if(label==='official' && response.ok && !summary.hasNoDataNotice){
      const rows=[...body.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)];
      summary.racerRowShape=rows.filter(m=>/racersearch\/profile/.test(m[1])).slice(0,6).map(m=>{
        const cells=[...m[1].matchAll(/<td\b([^>]*)>([\s\S]*?)<\/td>/gi)];
        return {
          cells:cells.length,
          firstCells:cells.slice(0,4).map(c=>({attrs:c[1].slice(0,90),text:c[2].replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim().slice(0,70)})),
          profileIds:[...new Set([...m[1].matchAll(/toban=(\d{4})/g)].map(x=>x[1]))]
        };
      });
    }
    if(label==='official' && response.ok && !summary.hasNoDataNotice){
      const racerRow=[...body.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)].find(m=>/racersearch\/profile/.test(m[1]));
      if(racerRow){
        const cells=[...racerRow[1].matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)];
        summary.officialStatLayout=cells.map((m,i)=>({
          index:i,
          text:m[1].replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim().slice(0,95)
        }));
      }
      summary.officialHeaderLabels=[...body.matchAll(/<th\b[^>]*>([\s\S]*?)<\/th>/gi)]
        .slice(0,50).map(m=>m[1].replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim().slice(0,60));
    }
    console.log(JSON.stringify(summary));
  } catch (e) {
    console.log(JSON.stringify({source:label,error:String(e?.message||e)}));
  }
}
console.log('Diagnostics only: no login bypass, no page contents stored, no deployment');
