// Venue tendencies derived from actual entry courses and finish positions; no stereotypes or invented priors.
export function summarizeVenueTendencies(rows,{minRaces=30}={}){
 if(!Array.isArray(rows)||!Number.isInteger(minRaces)||minRaces<1)throw Error('Invalid venue history');
 const byVenue=new Map();
 for(const r of rows){
  if(!Number.isInteger(r?.venue)||r.venue<1||r.venue>24||!Array.isArray(r.racers)||r.racers.length!==6)continue;
  const courses=r.racers.map(x=>x.entryCourse),finishes=r.racers.map(x=>x.finish);
  if(courses.some(x=>!Number.isInteger(x)||x<1||x>6)||finishes.some(x=>!Number.isInteger(x)||x<1||x>6)||new Set(courses).size!==6||new Set(finishes).size!==6)continue;
  const a=byVenue.get(r.venue)||{venue:r.venue,races:0,winsByCourse:[0,0,0,0,0,0],podiumsByCourse:[0,0,0,0,0,0]};
  a.races++;
  for(const x of r.racers){if(x.finish===1)a.winsByCourse[x.entryCourse-1]++;if(x.finish<=3)a.podiumsByCourse[x.entryCourse-1]++;}
  byVenue.set(r.venue,a);
 }
 return [...byVenue.values()].sort((a,b)=>a.venue-b.venue).map(a=>({...a,
  status:a.races>=minRaces?'descriptive_sample':'insufficient_history',
  winRatesByCourse:a.winsByCourse.map(n=>n/a.races),podiumRatesByCourse:a.podiumsByCourse.map(n=>n/a.races),
  insideWinRate:a.winsByCourse[0]/a.races,outsideWinRate:a.winsByCourse.slice(3).reduce((s,n)=>s+n,0)/a.races,
  eligibleForPredictionAdjustment:false,
  note:'Historical descriptive rates only; cannot establish current race probability or justify score adjustment.'}));
}
