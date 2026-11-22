// Evaluate immutable pre-race trifecta selections against separately verified official finishes.
// Never generate or repair picks using the finish. Missing evidence is "not_evaluable", not a loss.
import fs from 'node:fs';
import {isValidMorningCaptureTimestamp} from './evaluate-morning-ranking-history.mjs';
const validPick=x=>typeof x==='string'&&/^[1-6]-[1-6]-[1-6]$/.test(x)&&new Set(x.split('-')).size===3;
export function evaluateSavedTrifectaSelections(records,officialResults){
 if(!Array.isArray(records)||!Array.isArray(officialResults))throw Error('Expected arrays');
 const official=new Map();
 for(const r of officialResults){
  const key=[r.date,r.venue,r.race].join(':');
  if(!/^20\d{6}$/.test(String(r.date))||!Number.isInteger(r.venue)||r.venue<1||r.venue>24||
   !Number.isInteger(r.race)||r.race<1||r.race>12||r.resultVerified!==true||
   !Array.isArray(r.officialFinish)||r.officialFinish.length!==6||
   new Set(r.officialFinish).size!==6||!r.officialFinish.every(x=>Number.isInteger(x)&&x>=1&&x<=6)||
   official.has(key))throw Error('Invalid or duplicate verified result');
  official.set(key,r);
 }
 const seen=new Set(),rows=[],totals={saved:0,evaluable:0,hits:0,misses:0,notEvaluable:0,firstBoatHits:0,firstTwoExactHits:0};
 for(const p of records){
  const key=[p.date,p.venue,p.race,p.method].join(':');
  if(!/^20\d{6}$/.test(String(p.date))||!Number.isInteger(p.venue)||p.venue<1||p.venue>24||
   !Number.isInteger(p.race)||p.race<1||p.race>12||typeof p.method!=='string'||!p.method||
   !['main','upset'].includes(p.category)||seen.has(key))throw Error('Invalid or duplicate saved prediction');
  seen.add(key);totals.saved++;
  const result=official.get([p.date,p.venue,p.race].join(':'));
  const picks=p.picks;
  const validPicks=Array.isArray(picks)&&picks.length===6&&new Set(picks).size===6&&picks.every(validPick);
  const validCapture=isValidMorningCaptureTimestamp(p.capturedAt);
  // The deadline must be recorded before the race. A post-race capture cannot qualify.
  const validDeadline=isValidMorningCaptureTimestamp(p.deadlineAt)&&validCapture&&Date.parse(p.capturedAt)<Date.parse(p.deadlineAt);
  const reason=!validPicks?'missing_or_invalid_saved_six_picks':!validDeadline?'missing_or_late_pre_race_evidence':!result?'missing_verified_result':null;
  if(reason){totals.notEvaluable++;rows.push({key,status:'not_evaluable',reason});continue;}
  const finish=result.officialFinish;
  const answer=finish.slice(0,3).join('-');
  const hit=picks.includes(answer);
  totals.evaluable++;totals[hit?'hits':'misses']++;
  if(picks.some(x=>x.startsWith(finish[0]+'-')))totals.firstBoatHits++;
  if(picks.some(x=>x.startsWith(finish[0]+'-'+finish[1]+'-')))totals.firstTwoExactHits++;
  rows.push({key,status:hit?'hit':'miss',actual:answer,firstBoatCovered:picks.some(x=>x.startsWith(finish[0]+'-')),firstTwoCovered:picks.some(x=>x.startsWith(finish[0]+'-'+finish[1]+'-'))});
 }
 return {totals,hitRate:totals.evaluable?totals.hits/totals.evaluable:null,rows,note:'Only immutable, timestamped pre-deadline picks and verified results are evaluated; no retroactive picks.'};
}
if(process.argv[1]&&import.meta.url===new URL('file://'+process.argv[1]).href){
 if(process.argv.length!==4)throw Error('Usage: node scripts/evaluate-saved-trifecta-selections.mjs saved-picks.json verified-results.json');
 console.log(JSON.stringify(evaluateSavedTrifectaSelections(JSON.parse(fs.readFileSync(process.argv[2],'utf8')),JSON.parse(fs.readFileSync(process.argv[3],'utf8'))),null,2));
}
