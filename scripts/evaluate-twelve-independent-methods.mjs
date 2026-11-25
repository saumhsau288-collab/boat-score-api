// Research-only: evaluate independently generated predictions per method.
// No method rules are inferred here. Input authenticity requires external review.
const favorite=Array.from({length:6},(_,i)=>'favorite-'+(i+1));
const upset=Array.from({length:6},(_,i)=>'upset-'+(i+1));
const methods=[...favorite,...upset];
const validTriple=t=>Array.isArray(t)&&t.length===3&&new Set(t).size===3&&t.every(n=>Number.isInteger(n)&&n>=1&&n<=6);
const validFinish=o=>Array.isArray(o)&&o.length===6&&new Set(o).size===6&&o.every(n=>Number.isInteger(n)&&n>=1&&n<=6);
const validTime=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(s)&&Number.isFinite(Date.parse(s));
const key=r=>[r?.date,r?.venue,r?.race].join('|');
const rate=(hits,races)=>races?hits/races:null;
export function evaluateTwelveIndependentMethods(predictions,results){
 if(!Array.isArray(predictions)||!Array.isArray(results))throw new TypeError('arrays required');
 const index=new Map();
 for(const r of results){const k=key(r);if(index.has(k))throw new Error('duplicate result '+k);index.set(k,r);}
 const counts=Object.fromEntries(methods.map(m=>[m,{evaluated:0,hits:0,missing:0,rate:null}]));
 const totals={races:0,eligibleRaces:0,favoriteRaces:0,upsetRaces:0,favoriteAny:0,upsetAny:0,anyTwelve:0,uniquePicksTotal:0,missingMethods:0,excluded:0};
 const seen=new Set();
 for(const p of predictions){
  const k=key(p);if(seen.has(k))throw new Error('duplicate prediction '+k);seen.add(k);
  const r=index.get(k);
  if(!r||r.resultVerified!==true||!validFinish(r.finishOrder)){totals.excluded++;continue;}
  if(p.preRaceVerified!==true||p.ruleVersionsFrozen!==true||p.savedBeforeStart!==true||!validTime(p.capturedAt)||!validTime(p.predictedAt)||!validTime(p.writtenAt)||!validTime(p.scheduledStartAt)||!(Date.parse(p.capturedAt)<=Date.parse(p.predictedAt)&&Date.parse(p.predictedAt)<=Date.parse(p.writtenAt)&&Date.parse(p.writtenAt)<Date.parse(p.scheduledStartAt))){totals.excluded++;continue;}
  totals.eligibleRaces++;
  const actual=r.finishOrder.slice(0,3).join('-');
  const picks={};
  for(const m of methods){
   const entry=p.methods?.[m];
   if(!validTriple(entry?.trifecta)||typeof entry?.ruleVersion!=='string'||!entry.ruleVersion.trim()){counts[m].missing++;totals.missingMethods++;continue;}
   const triple=entry.trifecta.join('-');picks[m]=triple;
   counts[m].evaluated++;counts[m].hits+=Number(triple===actual);
  }
  const favComplete=favorite.every(m=>m in picks),upComplete=upset.every(m=>m in picks);
  if(favComplete){totals.favoriteRaces++;totals.favoriteAny+=Number(favorite.some(m=>picks[m]===actual));}
  if(upComplete){totals.upsetRaces++;totals.upsetAny+=Number(upset.some(m=>picks[m]===actual));}
  if(favComplete&&upComplete){
   totals.races++;totals.anyTwelve+=Number(methods.some(m=>picks[m]===actual));
   totals.uniquePicksTotal+=new Set(Object.values(picks)).size;
  }
 }
 for(const m of methods)counts[m].rate=rate(counts[m].hits,counts[m].evaluated);
 return {methods:counts,totals,coverage:{favoriteSix:rate(totals.favoriteAny,totals.favoriteRaces),upsetSix:rate(totals.upsetAny,totals.upsetRaces),allTwelve:rate(totals.anyTwelve,totals.races)},warning:'Per-method denominators may differ. Six/twelve coverage uses complete groups only. Flags and timestamps are assertions, not independently authenticated evidence.'};
}
