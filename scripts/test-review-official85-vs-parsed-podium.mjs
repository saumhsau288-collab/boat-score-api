import assert from 'node:assert/strict';
import {scoreResearchOfficial85,compareResearchOfficialBaseline}
 from './compare-research-official-baseline.mjs';
import {reviewOfficial85VsParsedPodium as review}
 from './review-official85-vs-parsed-podium.mjs';

const racers=Array.from({length:6},(_,i)=>({
 boat:i+1,racerId:String(4001+i),name:'Racer '+(i+1),sourceVerified:true,
 nationalWinRate:9-i,localWinRate:i===0?0:9-i,motorTwoWinRate:50
}));
const snapshot={status:'captured_research_inputs',source:'verified_official_metrics',
 date:'20261120',venue:1,race:5,racers};
const result={status:'official_racelist_result_identity_matched',
 parsedStatus:'parsed_needs_independent_review',date:'20261120',venue:1,race:5,
 parsedPodium:[2,4,1],
 identityCheck:{status:'official_racelist_result_identity_matched'},
 independentResultVerification:false,eligibleForCalibration:false};
const scored=scoreResearchOfficial85(snapshot);
assert.equal(scored.status,'official_85_component_scored');
assert.equal(scored.rows.length,6);
assert.deepEqual(scored.rows.map(r=>r.boat),[1,2,3,4,5,6]);
assert.equal(scored.rows[0].officialComponentScore85,70.5);
assert.equal(scored.rows[0].localRateFallbackApplied,true);
const reviewed=review(snapshot,result);
assert.equal(reviewed.status,'research_only_podium_compared');
assert.deepEqual(reviewed.scoreRanking,[1,2,3,4,5,6]);
assert.deepEqual(reviewed.actualPodiumScoreRanks,[2,4,1]);
assert.equal(reviewed.top3Overlap,2);
assert.equal(reviewed.winnerScoreRank,2);
assert.equal(reviewed.secondScoreRank,4);
assert.equal(reviewed.thirdScoreRank,1);
assert.equal(reviewed.highestScoreWon,false);
assert.equal(reviewed.exactTop3Order,false);
assert.equal(reviewed.eligibleForCalibration,false);
assert.equal(reviewed.authenticatedHistoricalPrediction,false);
assert.equal(review({...snapshot,racers:racers.slice(1)},result).status,'held');
assert.equal(review(snapshot,{...result,race:6}).reason,'race_identity_mismatch');
assert.equal(review(snapshot,{...result,parsedPodium:[2,2,1]}).reason,'valid_three_boat_podium_required');
assert.equal(review(snapshot,{...result,parsedPodium:[2,4,7]}).reason,'valid_three_boat_podium_required');
assert.equal(review(snapshot,{...result,identityCheck:null}).reason,'identity_matched_parsed_podium_required');
assert.equal(review(snapshot,{...result,parsedPodium:[1,2,3]}).exactTop3Order,true);
const finish={status:'descriptive_finish_comparison',racers:racers.map(x=>({
 boat:x.boat,runs:50,firstPlaceRate:20,top2Rate:40,top3Rate:60}))};
const previous=compareResearchOfficialBaseline(snapshot,finish);
assert.equal(previous.status,'research_official_component_comparison');
assert.deepEqual(previous.rows.map(x=>x.officialComponentScore85),
 scored.rows.map(x=>x.officialComponentScore85));
console.log('Independent official 85-point parsed podium comparison tests passed');
