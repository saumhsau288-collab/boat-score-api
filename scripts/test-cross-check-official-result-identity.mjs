import assert from 'node:assert/strict';
import {crossCheckOfficialResultIdentity as check} from './cross-check-official-result-identity.mjs';
const racers=Array.from({length:6},(_,i)=>({boat:i+1,racerId:String(4001+i),sourceVerified:true}));
const snapshot={status:'captured_research_inputs',source:'verified_official_metrics',date:'20261121',venue:1,race:1,racers};
const parsed={status:'parsed_needs_independent_review',date:'20261121',venue:1,race:1,
 racers:racers.map((r,i)=>({boat:r.boat,racerId:r.racerId,finish:i+1,resultStatus:null,actualEntryCourse:i+1}))};
assert.equal(check(snapshot,parsed).status,'official_racelist_result_identity_matched');
assert.equal(check(snapshot,parsed).independentResultVerification,false);
assert.equal(check(snapshot,{...parsed,race:2}).status,'held');
assert.equal(check(snapshot,{...parsed,racers:parsed.racers.map((r,i)=>i===0?{...r,racerId:'9999'}:r)}).status,'held');
assert.equal(check(snapshot,{...parsed,racers:parsed.racers.slice(1)}).status,'held');
assert.equal(check(snapshot,{...parsed,status:'not_saved'}).status,'held');
console.log('Official racelist/result racer identity cross-check tests passed');
