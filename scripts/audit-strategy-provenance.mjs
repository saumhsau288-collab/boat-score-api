// Research-only verification of provenance for 12 separately reasoned strategies.
// Ticket position alone is NOT evidence of a distinct strategy.
const validIds=xs=>Array.isArray(xs)&&xs.length===6&&xs.every(x=>typeof x==='string'&&/^[a-z][a-z0-9_-]{2,63}$/.test(x));
export function auditStrategyProvenance(record){
 const main=record?.mainStrategyIds,upset=record?.upsetStrategyIds;
 if(!validIds(main)||!validIds(upset))
  return {status:'missing_strategy_provenance',distinctStrategies:false};
 const all=[...main,...upset];
 if(new Set(all).size!==12)
  return {status:'duplicate_strategy_ids',distinctStrategies:false};
 const versions=record?.strategyVersions;
 if(!versions||typeof versions!=='object'||Array.isArray(versions)||
    all.some(id=>typeof versions[id]!=='string'||!/^v[0-9]+(?:\.[0-9]+)*$/.test(versions[id])))
  return {status:'missing_strategy_versions',distinctStrategies:false};
 return {status:'declared_distinct_strategy_ids',distinctStrategies:false,
  strategyIds:all,warning:'Unique IDs and versions are metadata only. Distinct algorithms must be independently code-reviewed and tested.'};
}
