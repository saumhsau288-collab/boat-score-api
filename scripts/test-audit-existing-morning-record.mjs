import assert from 'node:assert/strict';
import {auditExistingMorningRecord} from './audit-existing-morning-record.mjs';
const legacy={ready:true,officialVerified:true,statsVerified:true,rankedScores:Array.from({length:6},(_,i)=>({boat:i+1,score:60-i}))};
const check=auditExistingMorningRecord(legacy);
assert.equal(check.eligibleForStrictBacktest,false);
assert.equal(check.canReuseAsHistoricalRanking,true);
assert.deepEqual(check.missing,['six_racer_ids','six_main_tickets','per_race_capture_timestamp','verified_cutoff_timestamp']);
assert.equal(auditExistingMorningRecord({ready:false}).canReuseAsHistoricalRanking,false);
console.log('Legacy morning record audit tests passed');
