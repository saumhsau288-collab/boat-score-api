import assert from 'node:assert/strict';
import {auditResponseShape} from './audit-capture-response-shapes.mjs';
const c={date:'20261118',authenticatedBeforeRace:false,records:[
 {response:{ready:true,main:[],scoreInputsByBoat:[],meta:{recent50Coverage:0}}},
 {response:{ready:true,upset:[],meta:{recent50Coverage:1,exhibitionStatus:'missing'}}},
 {response:{ready:false,scoreInputsByBoat:[]}}]};
const a=auditResponseShape(c);
assert.equal(a.readyResponsesInspected,2);
assert.equal(a.topLevelKeys.scoreInputsByBoat,1);
assert.equal(a.nestedKeys['meta.recent50Coverage'],2);
assert.equal(a.topLevelKeys.upset,1);
assert.equal(a.scoreInputValuesExtracted,false);
assert.equal(a.accuracyCalculationPermitted,false);
assert.throws(()=>auditResponseShape({...c,authenticatedBeforeRace:true}));
console.log('response shape tests passed');
