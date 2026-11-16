// Privacy-conscious diagnostics for BOATRACE HTML structure.
// Only tags, table headers and presence flags; never print raw HTML or names.
export function inspectOfficialStructure(html){
 if(typeof html!=='string')return {status:'invalid_html'};
 const tables=[...html.matchAll(/<table\b[^>]*>([\s\S]*?)<\/table>/gi)];
 const clean=s=>s.replace(/<[^>]*>/g,' ').replace(/&nbsp;|&#160;/gi,' ').replace(/\s+/g,' ').trim();
 const summary=tables.slice(0,15).map((m,i)=>{
  const table=m[1];
  const headers=[...table.matchAll(/<th\b[^>]*>([\s\S]*?)<\/th>/gi)]
   .map(x=>clean(x[1]).slice(0,40)).slice(0,24);
  return {index:i,rows:(table.match(/<tr\b/gi)||[]).length,
   headerCount:headers.length,headers,
   racerProfileLinks:(table.match(/racersearch\/profile/gi)||[]).length,
   tdCount:(table.match(/<td\b/gi)||[]).length};
 });
 const title=clean(html.match(/<title\\b[^>]*>([\\s\\S]*?)<\\/title>/i)?.[1]||'').slice(0,120);
 const markers={accessDenied:/access denied|forbidden|アクセス拒否|403/i.test(html),captcha:/captcha|recaptcha|bot detection/i.test(html),javascriptRequired:/enable javascript|javascriptを有効|javascript is required/i.test(html),maintenance:/メンテナンス|maintenance/i.test(html)};
 return {status:'ok',pageTitle:title,markers,tableCount:tables.length,tables:summary,
  totalRacerProfileLinks:(html.match(/racersearch\/profile/gi)||[]).length,
  hasNationalWinRate:html.includes('全国勝率'),
  hasLocalWinRate:html.includes('当地勝率'),
  hasMotor:html.includes('モーター'),
  hasRacelistText:html.includes('出走表'),
  hasScriptRenderedData:/__NEXT_DATA__|__NUXT__|application\/json/i.test(html)};
}
