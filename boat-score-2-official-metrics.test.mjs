import assert from 'node:assert/strict';
import {validateOfficialMetrics} from './boat-score-2-official-metrics.js';
const boats=Array.from({length:6},(_,i)=>({
 boat:i+1,racerId:String(4001+i),name:'選手'+(i+1),sourceVerified:true,
 nationalWinRate:6.5,localWinRate:5.8,motorTwoWinRate:38.2
}));
assert.equal(validateOfficialMetrics(boats).verified,true);
assert.equal(validateOfficialMetrics(boats.slice(1)).reason,'six_boats_required');
assert.equal(validateOfficialMetrics(boats.map((b,i)=>i===1?{...b,racerId:'4001'}:b)).reason,'duplicate_boat_or_racer');
assert.equal(validateOfficialMetrics(boats.map((b,i)=>i===1?{...b,sourceVerified:false}:b)).reason,'identity_or_source_unverified');
assert.equal(validateOfficialMetrics(boats.map((b,i)=>i===1?{...b,localWinRate:undefined}:b)).reason,'missing_or_invalid_localWinRate');
assert.equal(validateOfficialMetrics(boats.map((b,i)=>i===1?{...b,motorTwoWinRate:101}:b)).reason,'missing_or_invalid_motorTwoWinRate');
console.log('Official metrics validation tests passed');
