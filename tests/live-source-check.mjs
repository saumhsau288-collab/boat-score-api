const targets = [
  ['official', 'https://www.boatrace.jp/owpc/pc/race/racelist?rno=1&jcd=01&hd=20261113'],
  ['makulabo', 'https://makulabo-jp.com/data/01/1?hd=20261113']
];
for (const [label,url] of targets) {
  try {
    const response = await fetch(url,{redirect:'follow',signal:AbortSignal.timeout(10000),headers:{Accept:'text/html'}});
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
    console.log(JSON.stringify(summary));
  } catch (e) {
    console.log(JSON.stringify({source:label,error:String(e?.message||e)}));
  }
}
console.log('Diagnostics only: no login bypass, no page contents stored, no deployment');
