import assert from 'node:assert/strict';
import {auditInsideStartHistoryReadiness} from './audit-inside-start-history-readiness.mjs';
const boats=Array.from({length:6},(_,i)=>({boat:i+1,entryCourse:i+1,racerForm:.5,start:.5,motor:.5,recent50:.5,exhibitionWeather:.5}));
const valid={date:'20261118',venue:12,race:1,boats,actual:[1,2,3],verifiedPreRace:true,verifiedOfficialResult:true,officialResultSourceUrl:'https://www.boatrace.jp/owpc/pc/race/raceresult?rno=1&jcd=12&hd=20261118',preRaceSourceUrl:'https://www.boatrace.jp/owpc/pc/race/racelist?rno=1&jcd=12&hd=20261118',startMetricSource:'pre_race_average_or_exhibition',capturedAt:'2026-11-18T01:00:00Z',cutoffAt:'2026-11-18T02:00:00Z'};
const r=auditInsideStartHistoryReadiness([valid,{...valid,race:2,boats:boats.map(b=>({...b,start:NaN}))},{...valid,race:1}]);
assert.equal(r.total,3);assert.equal(r.readyForManualVerification,0);assert.equal(r.blocked,3);
assert.equal(r.missing.normalized_pre_race_metrics,1);assert.equal(r.missing.duplicate_race,2);
assert.equal(r.approvedForDeployment,false);assert.equal(r.verifiedHistoricalAccuracy,false);
console.log('Research readiness structure tests passed (synthetic records, not source authentication)');
