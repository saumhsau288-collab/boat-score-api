import assert from 'node:assert/strict';
import {auditHistoricalTuningReadiness} from './audit-historical-tuning-readiness.mjs';
const r=auditHistoricalTuningReadiness([{date:'20261118',venue:2,race:3,actual:[1,2,3],boats:[]}]);
assert.equal(r.ready,0);assert.equal(r.blocked,1);
assert.ok(r.missing.six_boats);assert.ok(r.missing.pre_cutoff_timing);
assert.ok(r.missing.historical_input_evidence);
const base={date:'20261118',venue:2,race:3,actual:[1,2,3],independentlyVerifiedResult:true,
 officialResultSourceUrl:'https://www.boatrace.jp/owpc/pc/race/raceresult?rno=3&jcd=02&hd=20261118',
 historicalInputProvenanceVerified:true,historicalInputSourceUrl:'https://www.boatrace.jp/owpc/pc/race/racelist?hd=20261118&jcd=02&rno=3',
 historicalInputCapturedAt:'2026-11-18T09:00:00+09:00',officialCutoffAt:'2026-11-18T09:30:00+09:00',
 boats:Array.from({length:6},(_,i)=>({boat:i+1,nationalWinRate:5,localWinRate:5,motorTwoWinRate:40,recent50WinRate:5,exhibitionScore:5}))};
const valid=auditHistoricalTuningReadiness([base]);
assert.equal(valid.missing.official_result_evidence,undefined);
assert.equal(valid.missing.pre_cutoff_timing,undefined);
assert.equal(valid.missing.historical_input_evidence,undefined);
assert.equal(auditHistoricalTuningReadiness([{...base,historicalInputSourceUrl:'https://example.com/capture.json'}]).missing.historical_input_evidence,1);
for(const bad of ['2026-11-18T09:00:00','2026-11-18 09:00:00']){
 assert.equal(auditHistoricalTuningReadiness([{...base,historicalInputCapturedAt:bad}]).missing.pre_cutoff_timing,1);
}
assert.equal(auditHistoricalTuningReadiness([{...base,officialResultSourceUrl:base.officialResultSourceUrl.replace('rno=3','rno=4')}]).missing.official_result_evidence,1);
console.log('Historical tuning readiness audit passed');
