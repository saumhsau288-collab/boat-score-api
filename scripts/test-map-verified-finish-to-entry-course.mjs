import assert from 'node:assert/strict';
import {finishOrderByVerifiedEntryCourse as map} from './map-verified-finish-to-entry-course.mjs';
const result={verified:true,finishOrder:[3,1,5,2,4,6]};
const mapping=[{boat:1,entryCourse:2},{boat:2,entryCourse:1},{boat:3,entryCourse:4},
 {boat:4,entryCourse:3},{boat:5,entryCourse:5},{boat:6,entryCourse:6}].map(x=>({...x,verified:true}));
const out=map(result,mapping);
assert.equal(out.status,'mapped');
assert.equal(out.podiumByBoat,'3-1-5');
assert.equal(out.podiumByEntryCourse,'4-2-5');
assert.equal(map(result,mapping.map(x=>({...x,verified:false}))).status,'held');
assert.equal(map(result,mapping.slice(0,5)).status,'held');
assert.equal(map({verified:false,finishOrder:result.finishOrder},mapping).status,'held');
assert.equal(map(result,mapping.map(x=>x.boat===6?{...x,entryCourse:5}:x)).status,'held');
console.log('Verified finish-to-entry-course mapping tests passed');
