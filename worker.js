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
    const source = `https://makulabo-jp.com/data/${venue.padStart(2,'0')}/${Number(race)}?hd=${date}`;
    try {
      const res = await fetch(source,{headers:{Accept:'text/html,application/xhtml+xml'},redirect:'follow',signal:AbortSignal.timeout(9000)});
if (!res.ok) return reply(request,{error:'Upstream HTTP '+res.status,source},502);
      const type=res.headers.get('content-type')||'';
      if (!/text\/html|text\/plain|application\/json/i.test(type)) return reply(request,{error:'Unexpected content type',type,source},502);
      const html=await res.text();
const htmlLength = html.length;
      const plainText = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,' ').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ');
      const hasHeatmapHeading = /枠番別ヒートマップ/.test(plainText);
      const accessRestricted = /ログイン|会員登録|有料会員|新規登録/.test(plainText) && !hasHeatmapHeading;
      if (accessRestricted) return reply(request,{status:'unavailable',reason:'access_restricted_or_login_required',source, dataReadyForPrediction:false, last50Verified:false});
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

async function fetchOfficialRacers(date, venue, race) {
  const url = new URL(
    "https://www.boatrace.jp/owpc/pc/race/racelist"
  );

  url.searchParams.set("rno", String(Number(race)));
  url.searchParams.set("jcd", String(venue).padStart(2, "0"));
  url.searchParams.set("hd", String(date));

  try {
    const response = await fetch(url.toString());

    if (!response.ok) {
      return { verified: false, racers: [] };
    }

    const html = await response.text();
const officialRows = extractOfficialBoatRows(html);
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
      verified: false,
      racers: [],
      error: String(error)
    };
  }
}

