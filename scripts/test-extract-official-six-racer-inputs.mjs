import assert from 'node:assert/strict';
import {extractOfficialSixRacerInputs} from './extract-official-six-racer-inputs.mjs';
const racers=Array.from({length:6},(_,i)=>({boat:i+1,racerId:String(4001+i)}));
const stats=racers.map(r=>({...r,nationwide:{winRate:6},local:{winRate:0},motor:{secondPlaceRate:35},averageST:.15}));
const data={racersVerified:true,statsVerified:true,racersByBoat:racers,statsByBoat:stats};
let result=extractOfficialSixRacerInputs(data,'morning');
assert.equal(result.rows.length,6);
assert.equal(result.rows[0].localWinRate,0);
assert.equal(result.rows[0].recent50WinRate,null);
assert.equal(result.missing.recent50WinRate,6);
assert.equal(result.complete,false);
assert.equal(result.authenticated,false);
const changed={...data,statsByBoat:stats.map(r=>({...r}))};changed.statsByBoat[0].racerId='9999';
assert.equal(extractOfficialSixRacerInputs(changed).status,'official_six_racer_identity_unverified');
const noStats={...data,statsVerified:false};
assert.equal(extractOfficialSixRacerInputs(noStats).rows.length,0);
const before={...data,exhibitionVerified:true,startVerified:true,
 exhibitionByBoat:racers.map(r=>({boat:r.boat,exhibitionTime:6.8})),
 startByCourse:racers.map(r=>({boat:r.boat,course:r.boat,startTiming:.11}))};
result=extractOfficialSixRacerInputs(before,'pre_cutoff');
assert.equal(result.rows[0].course,1);
assert.equal(result.rows[0].exhibitionTime,6.8);
assert.equal(result.rows[0].exhibitionStartTiming,.11);
assert.equal(result.missing.exhibitionScore,6);
assert.equal(result.complete,false);
console.log('PASS: official six-racer source extraction (synthetic only)');
