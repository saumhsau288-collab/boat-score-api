import test from 'node:test';
import assert from 'node:assert/strict';
import {joinMakulaboWithOfficial} from './boat-score-2-makulabo-official-join.js';
const official=Array.from({length:6},(_,i)=>({boat:i+1,racerId:String(4001+i),name:'選手'+(i+1)}));
const parsedRows=official.map(r=>({boat:r.boat,name:r.name,counts:[2,1,1,0,0,0],runs:4}));
test('joins official racer IDs and labelled rates without score changes',()=>{
 const result=joinMakulaboWithOfficial(official,{verified:true,parsedRows:[...parsedRows].reverse()});
 assert.equal(result.verified,true);
 assert.equal(result.racers[0].racerId,'4001');
 assert.equal(result.racers[0].firstPlaceRate,50);
 assert.equal(result.racers[0].top3Rate,100);
 assert.equal(result.scoreChangeApplied,false);
});
test('rejects conflicting boat/name and unverified source',()=>{
 assert.equal(joinMakulaboWithOfficial(official,{verified:false,parsedRows}).verified,false);
 const wrong=parsedRows.map(r=>({...r}));
 wrong[0].boat=6;
 assert.equal(joinMakulaboWithOfficial(official,{verified:true,parsedRows:wrong}).verified,false);
});
