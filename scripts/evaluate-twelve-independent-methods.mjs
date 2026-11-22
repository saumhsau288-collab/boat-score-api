// Research-only audit of twelve separately generated, frozen method predictions.
// Does not generate predictions, infer method definitions, or claim prospective validity.
const methods=[...Array.from({length:6},(_,i)=>'favorite-'+(i+1)),...Array.from({length:6},(_,i)=>'upset-'+(i+1))];
const validTriple=t=>Array.isArray(t)&&t.length===3&&new Set(t).size===3&&t.every(n=>Number.isInteger(n)&&n>=1&&n<=6);
const key=r=>[r?.date,r?.venue,r?.race].join('|');
export function evaluateTwelveIndependentMethods(predictions,results){
 if(!Array.isArray(predictions)||!Array.isArray(results))throw new TypeError('arrays required');
 const index=new Map();
 for(const r of results){const k=key(r);if(index.has(k))throw new Error('duplicate result '+k);index.set(k,r);}
 const counts=Object.fromEntries(methods.map(m=>[m,{evaluated:0,hits:0,rate:null}]));
 const totals={races:0,favoriteAny:0,upsetAny:0,anyTwelve:0,uniquePicksTotal:0,missingMethods:0,excluded:0};
 const seen=new Set();
 for(const p of predictions){
  const k=key(p);if(seen.has(k))throw new Error('duplicate prediction '+k);seen.add(k);
  const r=index.get(k);
  if(!r||r.resultVerified!==true||!Array.isArray(r.finishOrder)||r.finishOrder.length!==6||new Set(r.finishOrder).size!==6){totals.excluded++;continue;}
  if(p.preRaceVerified!==true||p.ruleVersionsFrozen!==true||p.savedBeforeStart!==true){totals.excluded++;continue;}
  if(!p.methods||typeof p.methods!=='object'||methods.some(m=>!validTriple(p.methods[m]?.trifecta)||typeof p.methods[m]?.ruleVersion!=='string'||!p.methods[m].ruleVersion.trim())){totals.missingMethods++;continue;}
  totals.races++;
  const actual=r.finishOrder.slice(0,3).join('-');
  let favorite=false,upset=false;const unique=new Set();
  for(const m of methods){
   const triple=p.methods[m].trifecta.join('-');unique.add(triple);
   const hit=triple===actual;counts[m].evaluated++;counts[m].hits+=Number(hit);
   if(hit){if(m.startsWith('favorite-'))favorite=true;else upset=true;}
  }
  totals.favoriteAny+=Number(favorite);totals.upsetAny+=Number(upset);totals.anyTwelve+=Number(favorite||upset);totals.uniquePicksTotal+=unique.size;
 }
 for(const m of methods)counts[m].rate=counts[m].evaluated?counts[m].hits/counts[m].evaluated:null;
 return {methods:counts,totals,coverage:{favoriteSix:totals.races?totals.favoriteAny/totals.races:null,upsetSix:totals.races?totals.upsetAny/totals.races:null,allTwelve:totals.races?totals.anyTwelve/totals.races:null},warning:'Admission flags are assertions, not independently authenticated evidence. Method rules and real pre-race provenance must be verified before claiming predictive accuracy.'};
}
