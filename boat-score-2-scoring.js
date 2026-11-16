// Boat Score 2: scoring engine (not yet wired into the public API).
// Missing inputs are never silently replaced with averages.
export const SCORE_WEIGHTS = Object.freeze({
  nationalWinRate: 45,
  localWinRate: 25,
  motorTwoWinRate: 15,
  recent50WinRate: 10,
  exhibition: 5
});
export function evaluateRacer(input) {
  const required = Object.keys(SCORE_WEIGHTS);
  const missing = required.filter(key => !Number.isFinite(input?.[key]));
  if (missing.length) return {status:'insufficient_data', missing, score:null};
  const rateKeys = required.filter(key => key !== 'exhibition');
  const invalid = rateKeys.filter(key => input[key] < 0 || input[key] > 100);
  if (input.exhibition < 0 || input.exhibition > 100) invalid.push('exhibition');
  if (invalid.length) return {status:'invalid_data', invalid, score:null};
  const score = required.reduce((sum,key) => sum + input[key] * SCORE_WEIGHTS[key] / 100, 0);
  return {status:'evaluated',score:Math.round(score*100)/100,weights:SCORE_WEIGHTS};
}
export function evaluateRace(racers) {
  if (!Array.isArray(racers) || racers.length !== 6 ||
      new Set(racers.map(r => r.boat)).size !== 6 ||
      racers.some(r => !Number.isInteger(r.boat) || r.boat < 1 || r.boat > 6)) {
    return {status:'invalid_race',racers:[]};
  }
  const results = racers.map(r => ({boat:r.boat,...evaluateRacer(r)}));
  return {status:results.every(r=>r.status==='evaluated')?'evaluated':'insufficient_data',racers:results};
}
