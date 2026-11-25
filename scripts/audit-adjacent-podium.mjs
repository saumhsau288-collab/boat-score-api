// Descriptive, post-race research only. Never infer predictive advantage from this report.
export function auditAdjacentPodium(records) {
  if (!Array.isArray(records)) throw new TypeError('records must be an array');
  const counts = Object.fromEntries(Array.from({length:6},(_,i)=>[String(i+1),{races:0,neighborSecond:0,neighborThird:0,neighborPodium:0}]));
  const seen = new Set();
  let excluded = 0;
  for (const row of records) {
    const order = row?.finishOrder;
    const key = [row?.date,row?.venue,row?.race].join(':');
    const valid = row?.resultVerified === true &&
      /^20\d{6}$/.test(String(row?.date)) &&
      Number.isInteger(row?.venue) && row.venue>=1 && row.venue<=24 &&
      Number.isInteger(row?.race) && row.race>=1 && row.race<=12 &&
      Array.isArray(order) && order.length===6 &&
      order.every(n=>Number.isInteger(n)&&n>=1&&n<=6) &&
      new Set(order).size===6;
    if (!valid) {excluded++;continue;}
    if (seen.has(key)) throw new Error('duplicate race: '+key);
    seen.add(key);
    const winner = order[0], bucket=counts[String(winner)];
    const adjacent = n=>Math.abs(n-winner)===1;
    bucket.races++;
    if(adjacent(order[1])) bucket.neighborSecond++;
    if(adjacent(order[2])) bucket.neighborThird++;
    if(adjacent(order[1])||adjacent(order[2])) bucket.neighborPodium++;
  }
  const result = Object.fromEntries(Object.entries(counts).map(([boat,c])=>[boat,{...c,neighborPodiumRate:c.races?c.neighborPodium/c.races:null}]));
  return {scope:'DESCRIPTIVE_OFFLINE_ONLY',eligible:seen.size,excluded,byWinningBoat:result,
    warning:'Post-race adjacency counts do not establish predictive power. Compare against opportunity-adjusted baselines, racer ability and verified pre-race ST before tuning; no deployed score changes.'};
}
