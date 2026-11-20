// Boat Score 2 independent scoring module. Not wired to production Worker.
// National/local racer win rates are on the official 0-10 scale.
// Motor and recent-50 first-place rates are percentages (0-100).
// exhibitionScore is a separately computed 0-100 score, not raw exhibition seconds.
export const SCORE_WEIGHTS = Object.freeze({
  nationalWinRate: 45,
  localWinRate: 25,
  motorTwoWinRate: 15,
  recent50WinRate: 10,
  exhibitionScore: 5
});
const LIMITS = Object.freeze({
  nationalWinRate: 10,
  localWinRate: 10,
  motorTwoWinRate: 100,
  recent50WinRate: 100,
  exhibitionScore: 100
});
export function validateResearchWeights(weights) {
  const keys=Object.keys(SCORE_WEIGHTS);
  return !!weights && typeof weights==='object' && !Array.isArray(weights) &&
    Object.keys(weights).length===keys.length &&
    keys.every(k=>Number.isFinite(weights[k])&&weights[k]>=0&&weights[k]<=100) &&
    Math.abs(keys.reduce((n,k)=>n+weights[k],0)-100)<1e-8;
}
export function evaluateRacer(input,weights=SCORE_WEIGHTS) {
  if(!validateResearchWeights(weights))return {status:'invalid_weights',score:null};
  // A reported local 0.00 is treated as no local sample; use national rate for scoring.
  input = input && input.localWinRate === 0 && Number.isFinite(input.nationalWinRate) ? {...input,localWinRate:input.nationalWinRate} : input;
  const keys = Object.keys(SCORE_WEIGHTS);
  const missing = keys.filter(k => !Number.isFinite(input?.[k]));
  if (missing.length) return {status:'insufficient_data',missing,score:null};
  const invalid = keys.filter(k => input[k] < 0 || input[k] > LIMITS[k]);
  if (invalid.length) return {status:'invalid_data',invalid,score:null};
  const score = keys.reduce((total,k) =>
    total + input[k] / LIMITS[k] * weights[k],0);
  return {status:'evaluated',score:Math.round(score*100)/100};
}
export function evaluateRace(racers,weights=SCORE_WEIGHTS) {
  if (!Array.isArray(racers) || racers.length !== 6 ||
      new Set(racers.map(r=>r.boat)).size !== 6 ||
      racers.some(r=>!Number.isInteger(r.boat)||r.boat<1||r.boat>6)) {
    return {status:'invalid_race',racers:[]};
  }
  const results = racers.map(r=>({boat:r.boat,...evaluateRacer(r,weights)}));
  return {status:results.every(r=>r.status==='evaluated')?'evaluated':'insufficient_data',racers:results};
}
