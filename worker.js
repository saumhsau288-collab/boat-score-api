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
    
if (u.pathname === '/api/racers/test') {
  return reply(request, {
    status: 'ok',
    racers: extractRacerData('')
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
racerInfo: inspectRacerInfo(html),
racerNameCandidates: extractRacerNames(html),

racersByBoat: [],
racersByBoatVerified: false,
last50Inspection: inspectLast50(html),


embeddedDataInspection: inspectEmbeddedData(html),

heatmapInspection: inspectHeatmapData(html),

heatmapNumbers:
inspectHeatmapNumbers(html),

heatmapRows:
extractHeatmapRows(html),

heatmapBoatVerification: verifyHeatmapBoats(html),


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
    "前田健太",
    "中村有裕",
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
  const names = ["小澤学", "藤堂里香", "鈴木結平", "中村有裕", "前田健太", "大江純"];
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
  const text = html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ");

  const start = text.indexOf("枠番別ヒートマップ");
  if (start < 0) return [];

  const names = extractRacerNames(html).slice(0, 6);

  return names.map(name => {
    const pos = text.indexOf(name, start);
    if (pos < 0) {
      return { name, counts: null, verified: false };
    }

    const raw = text.slice(pos + name.length, pos + name.length + 120);
    const match = raw.match(
  /^\s*((?:\d{1,2}\s+){1,6})(\d{1,2})\s+(\d+\.\d{2})/
);

    if (!match) {
      return { name, counts: null, verified: false };
    }

    const counts = match[1].trim().split(/\s+/).map(Number);
    const runs = Number(match[2]);

    if (counts.reduce((a, b) => a + b, 0) !== runs) {
      return { name, counts: null, verified: false };
    }

    return {
      name,
      counts,
      runs,
      average: Number(match[3]),
      verified: true
    };
  });
}

function verifyHeatmapBoats(html) {
  const rows = extractHeatmapRows(html);
  const racers = [
    "小澤学",
    "藤堂里香",
    "鈴木結平",
    "中村有裕",
    "前田健太",
    "大江純"
  ];

  return racers.map((name, index) => {
    const row = rows.find(r => r.name === name);
    return {
      boat: index + 1,
      name,
      counts: row?.counts ?? null,
      verified: row?.verified === true
    };
  });
}

