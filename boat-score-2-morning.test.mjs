import assert from 'node:assert/strict';
import {morningRacerScore,morningRaceScore,morningShortlists} from './boat-score-2-morning.js';
const make=(boat,n)=>({boat,nationalWinRate:n,localWinRate:n,motorTwoWinRate:50,recent50WinRate:50});
const race=ns=>ns.map((n,i)=>make(i+1,n));
assert.equal(morningRacerScore(make(1,10)).status,'evaluated');
assert.equal(morningRacerScore({...make(1,10),localWinRate:undefined}).status,'insufficient_data');
assert.equal(morningRacerScore({...make(1,10),motorTwoWinRate:120}).status,'invalid_data');
assert.equal(morningRaceScore(race([9,5,4,4,3,2])).category,'favorite');
assert.equal(morningRaceScore(race([3,5,5,9,4,3])).category,'upset_candidate');
assert.equal(morningRaceScore(race([6,6,6,6,6,6])).category,'uncertain');
const close=morningRaceScore(race([6,6,6,6,6,6]));
assert.equal(close.closeAbilityReview.status,'review');
assert.equal(close.closeAbilityReview.slowDash,'unknown');
assert.equal(close.closeAbilityReview.affectsScore,false);
assert.equal(close.closeAbilityReview.affectsRanking,false);
assert.deepEqual(close.ranked.map(x=>x.boat),[1,2,3,4,5,6]);
assert.equal(morningRaceScore(race([9,5,4,4,3,2])).closeAbilityReview.status,'not_flagged');
assert.equal(morningRaceScore(race([9,5,4,4,3,2]).slice(1)).status,'invalid_race');
const list=morningShortlists([{venue:'01',race:1,racers:race([9,5,4,4,3,2])},{venue:'01',race:2,racers:[]}]);
assert.equal(list.eligible,1);assert.equal(list.excluded,1);assert.equal(list.favorites.length,1);
const morningBatch=morningShortlists([
 {venue:'01',date:'20261121',race:1,racers:race([9,5,4,4,3,2])},
 {venue:'02',date:'20261121',race:2,racers:race([6,6,6,6,6,6])},
 {venue:'03',date:'20261121',race:3,racers:race([3,5,5,9,4,3])}
]);
assert.equal(morningBatch.eligible,3);
assert.equal(morningBatch.favorites[0].closeAbilityReview.status,'not_flagged');
assert.equal(morningBatch.uncertain[0].closeAbilityReview.status,'review');
assert.equal(morningBatch.upsets[0].closeAbilityReview.affectsRanking,false);
assert.equal(morningBatch.uncertain[0].closeAbilityReview.actualEntryCourse,'unknown');
assert.equal(list.favorites[0].closeAbilityReview.affectsScore,false);
console.log('Morning preliminary scoring tests passed');
