import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluateTwelveIndependentMethods} from './evaluate-twelve-independent-methods.mjs';
const names=[...Array.from({length:6},(_,i)=>'favorite-'+(i+1)),...Array.from({length:6},(_,i)=>'upset-'+(i+1))];
const methods=Object.fromEntries(names.map((m,i)=>[m,{ruleVersion:'frozen-v1',trifecta:i===0||i===6?[1,2,3]:[2,1,3]}]));
const p={date:'20261122',venue:2,race:3,preRaceVerified:true,ruleVersionsFrozen:true,savedBeforeStart:true,capturedAt:'2026-11-22T10:00:00+09:00',predictedAt:'2026-11-22T10:02:00+09:00',writtenAt:'2026-11-22T10:03:00+09:00',scheduledStartAt:'2026-11-22T10:10:00+09:00',methods};
const r={date:'20261122',venue:2,race:3,resultVerified:true,finishOrder:[1,2,3,4,5,6]};
test('reports twelve independent method rates and deduplicated six/twelve coverage',()=>{
 const out=evaluateTwelveIndependentMethods([p],[r]);
 assert.equal(out.methods['favorite-1'].hits,1);
 assert.equal(out.methods['upset-1'].hits,1);
 assert.equal(out.methods['favorite-2'].hits,0);
 assert.equal(out.coverage.allTwelve,1);
 assert.equal(out.totals.uniquePicksTotal,2);
});
test('rejects incomplete methods without silently substituting picks',()=>{
 const out=evaluateTwelveIndependentMethods([{...p,methods:{...methods,'upset-6':undefined}}],[r]);
 assert.equal(out.totals.races,0);assert.equal(out.totals.missingMethods,1);assert.equal(out.methods['favorite-1'].evaluated,1);assert.equal(out.coverage.favoriteSix,1);assert.equal(out.coverage.upsetSix,null);
});
test('unverified pre-race evidence is excluded',()=>{
 assert.equal(evaluateTwelveIndependentMethods([{...p,preRaceVerified:false}],[r]).totals.excluded,1);
});

test('rejects fabricated late write times',()=>{
 const out=evaluateTwelveIndependentMethods([{...p,writtenAt:'2026-11-22T10:11:00+09:00'}],[r]);
 assert.equal(out.totals.excluded,1);assert.equal(out.totals.races,0);
});
test('rejects malformed official finish order',()=>{
 const out=evaluateTwelveIndependentMethods([p],[{...r,finishOrder:[1,2,3,4,5,7]}]);
 assert.equal(out.totals.excluded,1);
});

test('different per-method denominators are reported without treating missing as a miss',()=>{
 const incomplete={...p,methods:{...methods,'favorite-2':undefined}};
 const out=evaluateTwelveIndependentMethods([p,{...incomplete,race:4}],[r,{...r,race:4}]);
 assert.equal(out.methods['favorite-1'].evaluated,2);
 assert.equal(out.methods['favorite-2'].evaluated,1);
 assert.equal(out.methods['favorite-2'].missing,1);
 assert.equal(out.totals.favoriteRaces,1);
 assert.equal(out.totals.upsetRaces,2);
 assert.equal(out.totals.races,1);
});
