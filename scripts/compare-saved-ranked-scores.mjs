#!/usr/bin/env node
// Research-only diagnostic. Never interprets matching as authenticated forecast accuracy.
import fs from 'node:fs';
export function compareSavedRankedScores(results,captures){
 if(!Array.isArray(results?.results)||!Array.isArray(captures?.records))throw Error('results_and_records_required');
 const byKey=new Map();
 const key=r=>[r.date,r.venue,r.race].join(':');
 for(const r of captures.records){
  if(r?.httpStatus!==200||r?.response?.ready!==true)continue;
  const k=key(r);if(!byKey.has(k))byKey.set(k,[]);byKey.get(k).push(r);
 }
 const rows=results.results.map(r=>{
  const records=byKey.get(key(r))??[];
  const validFinish=Array.isArray(r.finishOrder)&&r.finishOrder.length===6&&new Set(r.finishOrder).size===6&&r.finishOrder.every(n=>Number.isInteger(n)&&n>=1&&n<=6);
  const scored=records.filter(c=>{const a=c.response?.rankedScores;return Array.isArray(a)&&a.length===6&&new Set(a.map(x=>x?.boat)).size===6&&a.every(x=>Number.isInteger(x?.boat)&&x.boat>=1&&x.boat<=6&&typeof x.score==='number'&&Number.isFinite(x.score));});
  const selected=scored.length===1?scored[0]:null;
  const ranking=selected?[...selected.response.rankedScores].sort((a,b)=>b.score-a.score||a.boat-b.boat).map(x=>x.boat):null;
  const tiedTop=selected?selected.response.rankedScores.filter(x=>x.score===Math.max(...selected.response.rankedScores.map(y=>y.score))).length>1:false;
  return {date:r.date,venue:r.venue,race:r.race,validFinish,matchingReadyCaptures:records.length,validRankedScoreCaptures:scored.length,
   topScoreBoat:ranking?.[0]??null,actualFirstBoat:validFinish?r.finishOrder[0]:null,
   diagnosticTopScoreFirst:validFinish&&ranking&&!tiedTop?ranking[0]===r.finishOrder[0]:null,
   topScoreTie:tiedTop,modelMode:selected?.response?.predictionMode??null,
   authenticatedBeforeRace:false,eligibleForCalibration:false};
 });
 const comparable=rows.filter(r=>r.diagnosticTopScoreFirst!==null);
 return {officialResults:rows.length,comparable:comparable.length,diagnosticTopScoreFirstMatches:comparable.filter(r=>r.diagnosticTopScoreFirst).length,
  independentlyAuthenticated:0,eligibleForCalibration:0,rows,
  warning:'Post-hoc diagnostic only; rankedScores alone cannot authenticate feature provenance, timing, or estimate deployable forecast accuracy.'};
}
if(process.argv[1]&&import.meta.url===new URL('file://'+process.argv[1]).href){
 const [results,captures]=process.argv.slice(2);
 if(!results||!captures)throw Error('Usage: node scripts/compare-saved-ranked-scores.mjs official-results.json raw-captures.json');
 console.log(JSON.stringify(compareSavedRankedScores(JSON.parse(fs.readFileSync(results,'utf8')),JSON.parse(fs.readFileSync(captures,'utf8'))),null,2));
}
