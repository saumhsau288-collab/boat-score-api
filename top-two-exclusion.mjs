// Experimental top-two exclusion ranking. No calibrated probability claims.
export const EXCLUSION_VERSION = 'top2-exclusion-v0-20261122';
const valid = x => typeof x === 'number' && Number.isFinite(x);
export function rankTopTwoExclusions(snapshot) {
  const racers = snapshot?.racers;
  if (!Array.isArray(racers) || racers.length !== 6 ||
      new Set(racers.map(r => r?.boat)).size !== 6 ||
      racers.some(r => !Number.isInteger(r.boat) || r.boat < 1 || r.boat > 6)) {
    throw new Error('Six unique boats required');
  }
  // All scores use only pre-race evidence. Missing inputs never become zero.
  const coursesVerified = racers.every(r => Number.isInteger(r.course) && r.course >= 1 && r.course <= 6) &&
    new Set(racers.map(r => r.course)).size === 6;
  const eligible = racers.every(r => valid(r.nationalRate) && r.nationalRate >= 0 &&
    valid(r.localRate) && r.localRate >= 0 &&
    valid(r.averageST) && r.averageST >= 0);
  if (!eligible) return {version:EXCLUSION_VERSION,status:'abstain',reason:'missing_ability_or_average_st',coursesVerified,ranked:[]};
  const ability = r => r.localRate === 0 ? r.nationalRate : (r.nationalRate + r.localRate)/2;
  const field = racers.map(r => {
    const a = ability(r);
    const st = r.averageST;
    // Ranking index only, NOT an estimated chance of finishing outside top two.
    const index = a - 4 * st + (coursesVerified ? (7-r.course)*0.12 : 0);
    return {boat:r.boat,course:coursesVerified?r.course:null,index};
  });
  field.sort((a,b)=>a.index-b.index || b.boat-a.boat);
  return {version:EXCLUSION_VERSION,status:'ranked',coursesVerified,
    ranked:field, candidates:{exclude1:field.slice(0,1).map(r=>r.boat),
      exclude2:field.slice(0,2).map(r=>r.boat),
      exclude3:field.slice(0,3).map(r=>r.boat)}};
}
// Compare pre-race exclusions with OFFICIAL actual finish after the event.
// Success means NONE of the excluded boats finished 1st or 2nd.
export function evaluateTopTwoExclusions(cases) {
  const totals = [1,2,3].map(n=>({excluded:n,evaluated:0,success:0,abstained:0}));
  for (const item of cases) {
    const pred = rankTopTwoExclusions(item.snapshot);
    if (pred.status !== 'ranked') {for(const t of totals)t.abstained++;continue;}
    const finish=item.officialFinish;
    if (!Array.isArray(finish)||finish.length!==6||
        new Set(finish).size!==6||finish.some(b=>!Number.isInteger(b)||b<1||b>6)) {
      throw new Error('Verified six-boat official finish order required');
    }
    for(const t of totals){
      t.evaluated++;
      if(pred.candidates['exclude'+t.excluded].every(b=>b!==finish[0]&&b!==finish[1]))t.success++;
    }
  }
  // Uniform random exclusions are a transparent reference, not a prediction model.
  // P(no excluded boat in top 2) = C(4,n) / C(6,n), for n=1..3.
  const randomBaselines={1:2/3,2:2/5,3:1/5};
  return totals.map(t=>({...t,
    successRate:t.evaluated?t.success/t.evaluated:null,
    randomBaseline:randomBaselines[t.excluded],
    improvementVsRandom:t.evaluated?t.success/t.evaluated-randomBaselines[t.excluded]:null
  }));
}
