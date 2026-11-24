import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeRacerName,matchRecent50Racers} from './boat-score-2-recent50-identity.js';
const official = Array.from({length:6},(_,i)=>({boat:i+1,name:['船岡 洋一郎','仲谷 颯仁','桑原 悠','吉田 拡郎','峰竜太','竹田和哉'][i],racerId:String(4001+i)}));
const recent = official.map(r=>({name:r.name,racerId:r.racerId}));
test('normalizes whitespace',()=>assert.equal(normalizeRacerName('船岡　洋一郎'),'船岡洋一郎'));
test('six verified by ID',()=>assert.equal(matchRecent50Racers(official,recent).verified,true));
test('unique truncated name',()=>{const r=recent.map(x=>({...x,racerId:null}));r[0].name='船岡洋一';const result=matchRecent50Racers(official,r);assert.equal(result.verified,true);assert.equal(result.matches[0].method,'unique_suffix_omission')});
test('reject conflicting registration number',()=>{const r=recent.map(x=>({...x}));r[0].racerId='9999';assert.equal(matchRecent50Racers(official,r).verified,false)});
test('reject duplicate candidates',()=>{const r=recent.map(x=>({...x,racerId:null}));r.push({name:'船岡洋一'});r[0].name='船岡洋一';assert.equal(matchRecent50Racers(official,r).verified,false)});

test('accepts exact four-character Japanese names',()=>{
 const o=official.map(r=>({...r}));
 o[0].name='松尾 充';
 const r=o.map(x=>({name:x.name,racerId:null}));
 const result=matchRecent50Racers(o,r);
 assert.equal(result.verified,true);
 assert.equal(result.matches[0].method,'exact_name');
});
test('does not fabricate missing Makulabo rows',()=>{
 const result=matchRecent50Racers(official,[]);
 assert.equal(result.verified,false);
 assert.equal(result.matches.length,6);
});
