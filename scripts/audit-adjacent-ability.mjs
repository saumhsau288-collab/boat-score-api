// Stratified historical description using VERIFIED PRE-RACE racer win rates only.
// No result-derived ratings, no inference about predictive value.
export function auditAdjacentByAbility(records,{threshold=5.5}={}) {
 if(!Number.isFinite(threshold)||threshold<0||threshold>10) throw new RangeError('threshold must be 0..10');
 if(!Array.isArray(records)) throw new TypeError('records must be an array');
 const groups={high:{races:0,neighborSecond:0,neighborPodium:0},low:{races:0,neighborSecond:0,neighborPodium:0}};
 const seen=new Set();let excluded=0;
 for(const row of records) {
  const order=row?.finishOrder, rates=row?.preRaceNationalWinRates;
  const valid=row?.resultVerified===true&&row?.preRaceVerified===true&&row?.capturedBeforeStart===true&&
   /^20\d{6}$/.test(String(row?.date))&&Number.isInteger(row?.venue)&&row.venue>=1&&row.venue<=24&&
   Number.isInteger(row?.race)&&row.race>=1&&row.race<=12&&Array.isArray(order)&&order.length===6&&
   order.every(n=>Number.isInteger(n)&&n>=1&&n<=6)&&new Set(order).size===6&&
   Array.isArray(rates)&&rates.length===6&&rates.every(n=>typeof n==='number'&&Number.isFinite(n)&&n>=0&&n<=10);
  if(!valid){excluded++;continue;}
  const key=[row.date,row.venue,row.race].join(':');
  if(seen.has(key)) throw new Error('duplicate race: '+key);
  seen.add(key);
  const winner=order[0], neighbors=[winner-1,winner+1].filter(n=>n>=1&&n<=6);
  // Race is high if ANY adjacent boat has strong pre-race national win rate.
  const group=neighbors.some(n=>rates[n-1]>=threshold)?groups.high:groups.low;
  group.races++;
  if(neighbors.includes(order[1]))group.neighborSecond++;
  if(neighbors.includes(order[1])||neighbors.includes(order[2]))group.neighborPodium++;
 }
 for(const group of Object.values(groups)){
  group.neighborPodiumRate=group.races?group.neighborPodium/group.races:null;
  group.neighborSecondRate=group.races?group.neighborSecond/group.races:null;
 }
 return {scope:'DESCRIPTIVE_OFFLINE_ONLY',threshold,eligible:seen.size,excluded,groups,
  warning:'Grouping is conditional on the observed winner (future information). It cannot be used as a pre-race predictor. Compare with non-adjacent boats, venue, course and ST before interpreting.'};
}
