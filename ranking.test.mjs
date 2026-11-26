import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const code=readFileSync(new URL('./worker.js',import.meta.url),'utf8');
const begin=code.indexOf('function buildMorningRaceInputs(');
const end=code.indexOf('\nfunction classifyDailyRaceCandidates(',begin);
assert.ok(begin>=0&&end>begin,'Ranking function not found');
const rankStart=code.indexOf('function rankTrifectaCandidates(');
const rankEnd=code.indexOf('\nfunction parseOfficialFinishOrder(',rankStart);
assert.ok(rankStart>=0&&rankEnd>rankStart,'Shared trifecta ranking function not found');
const score=vm.runInNewContext(code.slice(rankStart,rankEnd)+'\n'+code.slice(begin,end)+'\nbuildMorningRaceInputs');
const row=(boat,local=6)=>({boat,nationwide:{winRate:6+boat/10,secondPlaceRate:30+boat,thirdPlaceRate:50+boat},local:{winRate:local},motor:{secondPlaceRate:40+boat}});
const official=rows=>({verified:true,statsVerified:true,statsByBoat:rows});
const date='20261116';
let result=score(date,12,1,official(Array.from({length:6},(_,i)=>row(i+1))));
assert.equal(result.ready,true);
assert.equal(result.method,'average_national_local_winrate70_motor30_unvalidated');
assert.equal(result.placeRateTieBreakVerified,true);
assert.ok(result.missingInputs.includes('course'));
assert.ok(result.missingInputs.includes('start'));
assert.ok(result.missingInputs.includes('last50'));
assert.ok(result.missingInputs.includes('weather'));
// The provisional morning score is not a fully calibrated course/ST model.
assert.match(result.method,/unvalidated/);

assert.equal(result.rankedScores.length,6);
// The average, not a sum of independent national/local rank points, controls the racer component.
const avgRows=Array.from({length:6},(_,i)=>({...row(i+1),
  nationwide:{...row(i+1).nationwide,winRate:i===0?8:i===1?7:5,secondPlaceRate:null,thirdPlaceRate:null},
  local:{winRate:i===0?4:i===1?7:5},motor:{secondPlaceRate:40}}));
const avgResult=score(date,12,1,official(avgRows));
assert.equal(avgResult.ready,true);
assert.ok(avgResult.rankedScores.find(x=>x.boat===2).score>avgResult.rankedScores.find(x=>x.boat===1).score,
  'National 7/local 7 (average 7) must outrank national 8/local 4 (average 6)');
// A strong racer on an outside boat must beat a weak racer on the inside
// in the provisional morning screen when motor quality is equal.
const strengthRows=Array.from({length:6},(_,i)=>({
 boat:i+1,nationwide:{winRate:i===3?8:i===0?3:5,secondPlaceRate:35,thirdPlaceRate:55},
 local:{winRate:i===3?8:i===0?3:5},motor:{secondPlaceRate:40}
}));
const strength=score(date,12,1,official(strengthRows));
assert.equal(strength.ready,true);
assert.ok(strength.rankedScores.find(x=>x.boat===4).score>strength.rankedScores.find(x=>x.boat===1).score,
 'High racer win-rate on boat 4 must outrank low racer win-rate on boat 1');
result=score(date,12,1,official(Array.from({length:6},(_,i)=>row(i+1,i===0?null:6))));
assert.equal(result.method,'national_winrate70_motor30_screening_unvalidated');
assert.ok(result.missingInputs.includes('local'));
result=score(date,12,1,official(Array.from({length:6},(_,i)=>({...row(i+1),nationwide:{...row(i+1).nationwide,thirdPlaceRate:i===0?null:51+i}}))));
assert.equal(result.placeRateTieBreakVerified,false);
assert.ok(result.missingInputs.includes('placeRates'));
result=score(date,12,1,official(Array.from({length:6},(_,i)=>({...row(i+1),motor:{secondPlaceRate:i===0?null:41+i}}))));
assert.equal(result.ready,false);
assert.equal(result.reason,'invalid_or_missing_morning_metrics');
console.log('Provisional ranking regression checks passed');
