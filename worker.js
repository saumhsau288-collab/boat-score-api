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
export default {
  async fetch(request) {
    const u = new URL(request.url);
    if (request.method === 'OPTIONS') return new Response(null, {status:204,headers:{...cors(request),'Access-Control-Allow-Methods':'GET, OPTIONS','Access-Control-Allow-Headers':'Content-Type','Access-Control-Max-Age':'600'}});
    if (u.pathname === '/api/test') return reply(request,{status:'ok',message:'Boat Score API connected'});
    if (u.pathname !== '/api/makulabo/heatmap') return reply(request,{error:'Not found'},404);
    if (request.method !== 'GET') return reply(request,{error:'Method not allowed'},405);
    const date = u.searchParams.get('date')||'', venue=u.searchParams.get('venue')||'', race=u.searchParams.get('race')||'';
    if (!/^20\d{6}$/.test(date) || !/^\d{1,2}$/.test(venue) || !/^\d{1,2}$/.test(race) || Number(venue)<1 || Number(venue)>24 || Number(race)<1 || Number(race)>12) return reply(request,{error:'Invalid parameters'},400);
    const source = `https://makulabo-jp.com/data/${venue.padStart(2,'0')}/${Number(race)}/heatmap?hd=${date}`;
    try {
      const res = await fetch(source,{headers:{Accept:'text/html,application/xhtml+xml'},redirect:'follow',signal:AbortSignal.timeout(9000)});
if (!res.ok) return reply(request,{error:'Upstream HTTP '+res.status,source},502);
      const type=res.headers.get('content-type')||'';
      if (!/text\/html|text\/plain|application\/json/i.test(type)) return reply(request,{error:'Unexpected content type',type,source},502);
      const html=await res.text();
const htmlLength = html.length;
      if (html.length>1_000_000) return reply(request,{error:'Response too large'},502);
      return reply(request,{
  status:'fetched',
  source,
  
...inspectBoatData(html),
boatLinks: extractBoatLinks(html),
racerInfo: inspectRacerInfo(html)

});
    } catch(e) {return reply(request,{error:'Upstream fetch failed',detail:String(e?.message||e)},502);}
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
