import assert from 'node:assert/strict';
import {describeFiveRaceFollowerWinRates} from './describe-five-race-follower-winrates.mjs';
const rows=describeFiveRaceFollowerWinRates();
assert.equal(rows.length,5);
assert.equal(rows.filter(r=>r.secondIsTopWinRateFollower).length,1);
assert.deepEqual(rows.map(r=>r.topWinRateFollower),[6,5,1,6,6]);
assert(rows.every(r=>r.provenance.includes('not_authenticated_pre_race')));
console.log('Five retrospective race comparisons validated; top-win-rate follower second in 1/5.');
