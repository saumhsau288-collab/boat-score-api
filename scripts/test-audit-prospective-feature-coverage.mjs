import test from 'node:test';import assert from 'node:assert/strict';
import {auditProspectiveFeatureCoverage} from './audit-prospective-feature-coverage.mjs';
test('counts missing ST/motor/exhibition without filling nulls',()=>{
 const racers=Array.from({length:6},(_,i)=>({boat:i+1,nationalWinRate:6,averageStartTiming:i===0?null:0.14,motorTwoRate:null,exhibitionTime:6.8}));
 const r=auditProspectiveFeatureCoverage([{racers}]);
 assert.equal(r.features.nationalWinRate.completeRaces,1);
 assert.equal(r.features.averageStartTiming.present,5);
 assert.equal(r.features.averageStartTiming.completeRaces,0);
 assert.equal(r.features.motorTwoRate.present,0);
 assert.equal(r.features.exhibitionTime.completeRaces,1);
});
