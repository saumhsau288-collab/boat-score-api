import test from 'node:test';
import assert from 'node:assert/strict';
import {summarizeRetrospectiveFinishRanks} from './research-retrospective-finish-ranks.mjs';
const record=(race,podium,ranking=[1,2,3,4,5,6])=>({
 status:'research_only_podium_compared',date:'20261118',venue:1,race,
 eligibleForCalibration:false,authenticatedHistoricalPrediction:false,
 scoreRanking:ranking,parsedPodium:podium,
 actualPodiumScoreRanks:podium.map(n=>ranking.indexOf(n)+1)
});
test('counts finish score ranks and actual winner conditional pairs',()=>{
 const x=summarizeRetrospectiveFinishRanks([record(1,[5,6,1]),record(2,[5,2,6])]);
 assert.equal(x.compared,2);
 assert.equal(x.positions[1].rankCounts[5],1);
 assert.equal(x.positions[2].rankCounts[5],1);
 const pair=x.conditionalPairs.find(p=>p.winner===5&&p.candidate===6);
 assert.equal(pair.starts,2);assert.equal(pair.second,1);assert.equal(pair.third,1);
 assert.equal(x.eligibleForCalibration,false);
});
test('rejects duplicate, inconsistent rank, and claimed authenticated prediction',()=>{
 const a=record(1,[5,6,1]);
 const x=summarizeRetrospectiveFinishRanks([a,a,{...record(2,[1,2,3]),actualPodiumScoreRanks:[3,2,1]},
  {...record(3,[1,2,3]),authenticatedHistoricalPrediction:true}]);
 assert.equal(x.compared,1);
 assert.equal(x.held.duplicate_race,1);
 assert.equal(x.held.invalid_ranking_or_podium,1);
 assert.equal(x.held.not_research_only_review,1);
});

test('invalid retrospective row does not suppress valid same-race row',()=>{
 const good=record(4,[5,6,1]);
 const bad={...good,actualPodiumScoreRanks:[1,1,1]};
 const x=summarizeRetrospectiveFinishRanks([bad,good]);
 assert.equal(x.held.invalid_ranking_or_podium,1);
 assert.equal(x.held.duplicate_race??0,0);
 assert.equal(x.compared,1);
});
