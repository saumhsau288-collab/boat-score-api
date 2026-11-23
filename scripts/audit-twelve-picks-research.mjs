// Research-only audit of twelve independently generated trifecta picks.
// Does not generate picks, tune weights, or change production predictions.
const validOrder = a => Array.isArray(a) && a.length === 3 &&
  a.every(x => Number.isInteger(x) && x >= 1 && x <= 6) &&
  new Set(a).size === 3;
const key = a => a.join('-');
const validDate = value => {
 const s=String(value);
 if(!/^20\d{6}$/.test(s))return false;
 const y=Number(s.slice(0,4)),m=Number(s.slice(4,6)),d=Number(s.slice(6,8));
 const date=new Date(Date.UTC(y,m-1,d));
 return date.getUTCFullYear()===y&&date.getUTCMonth()===m-1&&date.getUTCDate()===d;
};
const jstDate = iso => {
 const parts=new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Tokyo',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date(iso));
 const p=Object.fromEntries(parts.filter(x=>x.type!=='literal').map(x=>[x.type,x.value]));
 return p.year+p.month+p.day;
};
export function auditTwelvePicks(rows) {
  if (!Array.isArray(rows)) return {status:'invalid_input'};
  const seen = new Set(), accepted = [], excluded = [];
  for (const row of rows) {
    const raceKey = [row?.date,row?.venue,row?.race].join(':');
    const validRace = validDate(row?.date) &&
      Number.isInteger(row?.venue) && row.venue >= 1 && row.venue <= 24 &&
      Number.isInteger(row?.race) && row.race >= 1 && row.race <= 12;
    const validPicks = Array.isArray(row?.main) && row.main.length === 6 &&
      Array.isArray(row?.upset) && row.upset.length === 6 &&
      [...row.main,...row.upset].every(validOrder);
    const officialUrl = value => { try { const u = new URL(value); return u.protocol === 'https:' && (u.hostname === 'boatrace.jp' || u.hostname.endsWith('.boatrace.jp')) && !u.username && !u.password; } catch { return false; } };
    const validEvidence = row?.preRacePredictionsSaved === true &&
      row?.independentlyAuthenticatedCapture === true &&
      typeof row?.predictionSourceUrl === 'string' && row.predictionSourceUrl.startsWith('https://') &&
      officialUrl(row?.officialResultSourceUrl) && row?.officialCutoffVerified === true &&
      row?.officialResultVerified === true &&
      typeof row?.predictionCapturedAt === 'string' &&
      typeof row?.cutoffAt === 'string' &&
      Number.isFinite(Date.parse(row.predictionCapturedAt)) &&
      Number.isFinite(Date.parse(row.cutoffAt)) &&
      Date.parse(row.predictionCapturedAt) < Date.parse(row.cutoffAt) &&
      jstDate(row.predictionCapturedAt) === String(row.date) &&
      jstDate(row.cutoffAt) === String(row.date);
    if (!validRace || !validOrder(row?.actual) || !validPicks || !validEvidence || seen.has(raceKey)) {
      excluded.push({raceKey,reason:'missing_or_duplicate_verified_pre_race_evidence'});
      continue;
    }
    seen.add(raceKey);
    accepted.push(row);
  }
  const actual = row => key(row.actual);
  const metrics = field => Array.from({length:6},(_,i) => ({
    method:i+1,races:accepted.length,
    hits:accepted.filter(row=>key(row[field][i])===actual(row)).length,
    hitRate:accepted.length ? accepted.filter(row=>key(row[field][i])===actual(row)).length/accepted.length : null
  }));
  return {status:accepted.length?'evaluated':'no_eligible_races',eligible:accepted.length,
    excluded,main:metrics('main'),upset:metrics('upset'),
    mainAnyHits:accepted.filter(row=>row.main.some(p=>key(p)===actual(row))).length,
    upsetAnyHits:accepted.filter(row=>row.upset.some(p=>key(p)===actual(row))).length,
    anyTwelveHits:accepted.filter(row=>[...row.main,...row.upset].some(p=>key(p)===actual(row))).length,
    uniqueTicketCounts:accepted.map(row=>({date:row.date,venue:row.venue,race:row.race,uniqueTickets:new Set([...row.main,...row.upset].map(key)).size})),
    deployedWeightsChanged:false,
    warning:'Only saved pre-cutoff predictions with verified results qualify. These are hit rates, not return rates; no weights are adjusted.'};
}
