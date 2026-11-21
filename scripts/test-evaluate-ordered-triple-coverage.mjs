import test from 'node:test';import assert from 'node:assert/strict';import {evaluateOrderedTripleCoverage} from './evaluate-ordered-triple-coverage.mjs';
const day=(date,finishOrder)=>({date,reports:[{records:[{resultVerified:true,finishOrder}]}]});
test('training only selects patterns, holdout measures coverage',()=>{const r=evaluateOrderedTripleCoverage([day('20261103',[2,1,3,4,5,6]),day('20261101',[1,2,3,4,5,6]),day('20261102',[1,2,3,4,5,6])]);assert.equal(r.topPatterns[0].order,'1-2-3');assert.equal(r.coverage[1].hits,0);assert.equal(r.coverage[20].races,1);});
