// Descriptive top-three patterns. Boat numbers are frame numbers, not verified entry courses.
export function auditTopThreeSandwich(records) {
 if(!Array.isArray(records))throw new TypeError('records must be an array');
 const names=['innerOuterInner','outerInnerOuter','outerOuterInner','outerInnerInner','innerOuterOuter'];
 const patterns=Object.fromEntries(names.map(n=>[n,{count:0,examples:[]}]));
 const seen=new Set();let eligible=0,excluded=0,outerWinnerRaces=0,innerWinnerRaces=0;
 for(const r of records){
  const o=r?.finishOrder;
  const valid=r?.resultVerified===true&&/^20\d{6}$/.test(String(r?.date))&&Number.isInteger(r?.venue)&&r.venue>=1&&r.venue<=24&&Number.isInteger(r?.race)&&r.race>=1&&r.race<=12&&Array.isArray(o)&&o.length===6&&new Set(o).size===6&&o.every(n=>Number.isInteger(n)&&n>=1&&n<=6);
  if(!valid){excluded++;continue;}
  const key=[r.date,r.venue,r.race].join(':');if(seen.has(key))throw new Error('duplicate race '+key);seen.add(key);eligible++;
  const inner=n=>n===1||n===2,outer=n=>n>=4;
  const [a,b,c]=o;
  if(outer(a))outerWinnerRaces++;
  if(inner(a))innerWinnerRaces++;
  const hits={
   innerOuterInner:inner(a)&&outer(b)&&inner(c),
   outerInnerOuter:outer(a)&&inner(b)&&outer(c),
   outerOuterInner:outer(a)&&outer(b)&&inner(c),
   outerInnerInner:outer(a)&&inner(b)&&inner(c),
   innerOuterOuter:inner(a)&&outer(b)&&outer(c)
  };
  for(const [name,hit] of Object.entries(hits))if(hit){patterns[name].count++;if(patterns[name].examples.length<3)patterns[name].examples.push(o.slice(0,3).join('-'));}
 }
 for(const [name,p] of Object.entries(patterns)){
  p.rate=eligible?p.count/eligible:null;
  const denominator=name.startsWith('outer')?outerWinnerRaces:innerWinnerRaces;
  p.conditionedOnWinnerRaces=denominator;
  p.rateGivenWinnerGroup=denominator?p.count/denominator:null;
 }
 return {eligible,excluded,outerWinnerRaces,innerWinnerRaces,patterns,warning:'Descriptive frame-number top-three patterns; not actual entry-course positions, and not a pre-race prediction.'};
}
