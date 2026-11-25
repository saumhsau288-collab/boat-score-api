import test from 'node:test';import assert from 'node:assert/strict';import {auditTopRatedBoatOneFinishPatterns} from './audit-top-rated-boat-one-finish-patterns.mjs';
const rec=o=>({resultVerified:true,finishOrder:o,racers:Array.from({length:6},(_,i)=>({boat:i+1,nationalWinRate:9-i}))});
test('counts second and third only conditional on boat-one victory',()=>{
 const reports=['20261118','20261119','20261120'].map(date=>({date,reports:[{records:[rec([1,3,2,4,5,6]),rec([2,1,3,4,5,6])]}]}));
 const r=auditTopRatedBoatOneFinishPatterns(reports);
 assert.equal(r.races,6);assert.equal(r.boatOneWins,3);assert.equal(r.secondWhenOneWins[3],3);assert.equal(r.pairWhenOneWins['3-2'],3);assert.equal(r.boatOnePodium,6);
});
