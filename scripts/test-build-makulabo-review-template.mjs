import assert from 'node:assert/strict';
import {buildMakulaboReviewTemplate as build} from './build-makulabo-review-template.mjs';
const snapshot={date:'20261120',venue:18,race:1};
const candidates=Array.from({length:6},(_,i)=>({boat:i+1,manualReviewRequired:i===2,
 sameLabelledBoat:true,identityEvidence:i===2?'abbreviated_name_review_required':'exact_name',
 officialRacerId:String(4001+i),officialName:'選手名前'+(i+1),sourceName:i===2?'選手名前':'選手名前'+(i+1)}));
const template=build(snapshot,{status:'identity_review_required',candidates});
assert.equal(template.status,'review_template');
assert.equal(template.approvals.length,1);
assert.equal(template.approvals[0].boat,3);
assert.equal(template.approvals[0].reviewed,false);
assert.equal(build(snapshot,{status:'identity_review_required',candidates:candidates.slice(1)}).status,'unavailable');
assert.equal(build(snapshot,{status:'identity_review_required',candidates:candidates.map(x=>x.boat===3?{...x,sameLabelledBoat:false}:x)}).status,'unavailable');
console.log('Makulabo unapproved review template tests passed');
