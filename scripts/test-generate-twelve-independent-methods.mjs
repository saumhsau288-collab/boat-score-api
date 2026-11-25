import test from 'node:test';
import assert from 'node:assert/strict';
import {generateTwelveIndependentMethods,METHOD_IDS,METHOD_VERSION} from './generate-twelve-independent-methods.mjs';
const racers=Array.from({length:6},(_,i)=>({
 boat:i+1,course:i+1,nationalRate:7-i*.5,localRate:i===0?0:6.8-i*.4,
 averageST:.13+i*.01,motor2Rate:30+i*5,exhibitionTime:6.8-i*.03,
 last50CoursePodiumRate:20+i*10
}));
test('generates all twelve independently versioned method decisions',()=>{
 const out=generateTwelveIndependentMethods({racers});
 assert.equal(out.version,METHOD_VERSION);
 assert.deepEqual(Object.keys(out.methods),METHOD_IDS);
 for(const [id,v] of Object.entries(out.methods)){
  assert.equal(v.ruleVersion,METHOD_VERSION,id);
  assert.equal(v.status,'predicted',id);
  assert.equal(v.trifecta.length,3,id);
  assert.equal(new Set(v.trifecta).size,3,id);
 }
 assert.deepEqual(out.methods['favorite-1'].trifecta,[1,2,3]);
 assert.equal(out.methods['upset-1'].trifecta[1],1);
 assert.equal(out.methods['upset-2'].trifecta[2],1);
 assert.ok(!out.methods['upset-3'].trifecta.includes(1));
 assert.ok(out.methods['upset-4'].trifecta[0]>=4);
});
test('local rate zero falls back to national, never adds them',()=>{
 const out=generateTwelveIndependentMethods({racers});
 assert.equal(out.methods['favorite-1'].trifecta[0],1);
});
test('missing exhibition or last50 abstains without fabricated predictions',()=>{
 const partial=racers.map(({exhibitionTime,last50CoursePodiumRate,...r})=>r);
 const out=generateTwelveIndependentMethods({racers:partial});
 for(const id of ['favorite-5','favorite-6','upset-6'])assert.equal(out.methods[id].status,'abstain');
 assert.equal(out.methods['favorite-1'].status,'predicted');
});
test('missing ability abstains for all methods requiring it',()=>{
 const out=generateTwelveIndependentMethods({racers:racers.map(({nationalRate,...r})=>r)});
 assert.ok(METHOD_IDS.every(id=>out.methods[id].status==='abstain'));
});
test('requires distinct boats and entry courses',()=>{
 assert.throws(()=>generateTwelveIndependentMethods({racers:[...racers.slice(0,5),{...racers[5],course:1}]}));
});
