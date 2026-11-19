// Boat Score 2 historical analysis core, v1.
// Input: one row per racer per race, normalized from official result and race-card archives.
// Required: date YYYYMMDD, venue 1..24, race 1..12, racerId, boat 1..6,
// course 1..6 (actual entry, NOT frame), finish 1..6 or null.
// Do not convert disqualification / cancellation into a sixth-place finish.
export function normalizeHistoryRow(x) {
  const n=k=>Number(x?.[k]);
  const date=String(x?.date||'');
  const row={date,venue:n('venue'),race:n('race'),racerId:String(x?.racerId||''),
    boat:n('boat'),course:n('course'),finish:x?.finish==null?null:n('finish'),
    source:String(x?.source||''),verified:x?.verified===true};
  if(!/^20\d{6}$/.test(date)||!Number.isInteger(row.venue)||row.venue<1||row.venue>24||
     !Number.isInteger(row.race)||row.race<1||row.race>12||
     !/^\d{4}$/.test(row.racerId)||!Number.isInteger(row.boat)||row.boat<1||row.boat>6||
     !Number.isInteger(row.course)||row.course<1||row.course>6||
     (row.finish!==null&&(!Number.isInteger(row.finish)||row.finish<1||row.finish>6))) return null;
  return row;
}
export function historicalCourseStats(rawRows,{beforeDate,fromDate,venue,racerId,course,minStarts=1}={}) {
  const seen=new Set(), groups=new Map();
  for(const input of rawRows||[]){
    const r=normalizeHistoryRow(input);
    if(!r||!r.verified||r.finish===null||!r.source)continue;
    if(beforeDate&&r.date>=beforeDate)continue; // no future result leakage
    if(fromDate&&r.date<fromDate)continue;
    if(venue&&r.venue!==Number(venue))continue;
    if(racerId&&r.racerId!==String(racerId))continue;
    if(course&&r.course!==Number(course))continue;
    const id=[r.date,r.venue,r.race,r.racerId].join(':');
    if(seen.has(id))continue;
    seen.add(id);
    const key=[r.venue,r.racerId,r.course].join(':');
    if(!groups.has(key))groups.set(key,{venue:r.venue,racerId:r.racerId,course:r.course,starts:0,wins:0,top2:0,top3:0});
    const g=groups.get(key);g.starts++;g.wins+=Number(r.finish===1);g.top2+=Number(r.finish<=2);g.top3+=Number(r.finish<=3);
  }
  return [...groups.values()].filter(g=>g.starts>=minStarts).map(g=>({...g,
    winPct:Math.round(g.wins/g.starts*10000)/100,
    top2Pct:Math.round(g.top2/g.starts*10000)/100,
    top3Pct:Math.round(g.top3/g.starts*10000)/100,
    sampleSize:g.starts,verifiedOnly:true
  })).sort((a,b)=>a.venue-b.venue||a.racerId.localeCompare(b.racerId)||a.course-b.course);
}
export function summarizeVenueCourse(rawRows,{beforeDate,fromDate}={}) {
  const rows=historicalCourseStats(rawRows,{beforeDate,fromDate});
  const map=new Map();
  for(const r of rows){const key=r.venue+':'+r.course;
    if(!map.has(key))map.set(key,{venue:r.venue,course:r.course,starts:0,wins:0,top2:0,top3:0});
    const g=map.get(key);for(const k of ['starts','wins','top2','top3'])g[k]+=r[k];
  }
  return [...map.values()].map(g=>({...g,winPct:+(g.wins/g.starts*100).toFixed(2),
    top2Pct:+(g.top2/g.starts*100).toFixed(2),top3Pct:+(g.top3/g.starts*100).toFixed(2)}));
}

/**
 * Chronological partition for offline research. A single race must never appear
 * in both tuning and holdout sets. Excludes unknown dates and boundary dates.
 * This does not establish that features were available before race cutoff.
 */
export function splitHistoricalRacesByDate(rawRows,{tuningBefore,holdoutFrom}={}){
 const validDate=d=>typeof d==='string'&&/^20\d{6}$/.test(d)&&Number.isFinite(Date.parse(d.slice(0,4)+'-'+d.slice(4,6)+'-'+d.slice(6,8)+'T00:00:00Z'))&&new Date(d.slice(0,4)+'-'+d.slice(4,6)+'-'+d.slice(6,8)+'T00:00:00Z').toISOString().slice(0,10).replaceAll('-','')===d;
 if(!validDate(tuningBefore)||!validDate(holdoutFrom)||tuningBefore>holdoutFrom)throw Error('Invalid chronological split boundaries');
 const tuning=[],holdout=[],excluded=[];
 for(const row of rawRows||[]){
  const d=String(row?.date??'');
  if(!validDate(d)){excluded.push(row);continue;}
  if(d<tuningBefore)tuning.push(row);
  else if(d>=holdoutFrom)holdout.push(row);
  else excluded.push(row);
 }
 return {tuning,holdout,excluded,method:'chronological_race_date_split',eligibleForWeightTuning:false};
}
