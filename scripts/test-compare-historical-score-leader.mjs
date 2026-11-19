import assert from 'node:assert/strict';
import {splitScoreLeaderTickets} from './score-leader-favorite-upset.mjs';
import {compareHistoricalScoreLeaderRaces as compare} from './compare-historical-score-leader.mjs';
const scores=[1,2,3,4,5,6].map(boat=>({boat,score:70-boat}));
const predicted=splitScoreLeaderTickets(scores);
const base={date:'20261118',venue:2,race:2,scores,actualPodium:predicted.main[0]};
const held=compare({races:[base]});
assert.equal(held.totals.evidenceReady,0);
assert.equal(held.rows[0].mainExact,true);
assert(held.rows[0].holdReasons.includes('pre_race_snapshot_not_verified'));
assert(held.rows[0].holdReasons.includes('official_result_not_verified'));
assert(held.rows[0].holdReasons.includes('score_method_not_verified'));
const ready={...base,preRaceSnapshotVerified:true,officialResultVerified:true,scoreMethodVerified:true,
 preRaceSnapshotSourceUrl:'https://example.org/immutable-pre-race-capture.json',
 officialResultSourceUrl:'https://www.boatrace.jp/owpc/pc/race/raceresult?rno=2&jcd=02&hd=20261118',
 preRaceCapturedAt:'2026-11-18T00:00:00Z',officialCutoffAt:'2026-11-18T03:00:00Z'};
const valid=compare({races:[ready]});
assert.equal(valid.totals.evidenceReady,1);
assert.equal(valid.totals.evidenceReadyMainExact,1);
assert.equal(valid.totals.evidenceReadyUpsetExact,0);
assert.equal(valid.eligibleForScoreChange,false);
const upset=compare({races:[{...ready,actualPodium:predicted.upset[3]}]});
assert.equal(upset.totals.evidenceReadyUpsetExact,1);
assert.equal(upset.rows[0].leaderPodium,false);
const duplicates=compare({races:[ready,ready]});
assert.equal(duplicates.totals.evidenceReady,1);
assert.deepEqual(duplicates.rows[1].holdReasons,['duplicate_race']);
assert.equal(compare({races:[{...ready,scores:[]}]}).totals.evidenceReady,0);
assert.equal(compare({races:[{...ready,actualPodium:[1,1,3]}]}).totals.evidenceReady,0);
assert.equal(compare({races:[{...ready,date:'20260230'}]}).totals.evidenceReady,0);
assert.equal(compare({races:[{...ready,date:'20261131'}]}).totals.evidenceReady,0);
assert.equal(compare({races:[{...ready,preRaceCapturedAt:'2026-11-18T04:00:00Z'}]}).totals.evidenceReady,0);
assert.equal(compare({races:[{...ready,officialResultSourceUrl:'https://example.org/fake'}]}).totals.evidenceReady,0);
assert.equal(compare({races:[{...ready,preRaceSnapshotSourceUrl:null}]}).totals.evidenceReady,0);
console.log('Historical score leader comparison tests passed');
