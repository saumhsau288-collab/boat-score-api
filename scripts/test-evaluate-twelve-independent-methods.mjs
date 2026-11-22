import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluateTwelveIndependentMethods} from './evaluate-twelve-independent-methods.mjs';
const names=[...Array.from({length:6},(_,i)=>'favorite-'+(i+1)),...Array.from({length:6},(_,i)=>'upset-'+(i+1))];
const methods=Object.fromEntries(names.map((m,i)=>[m,{ruleVersion:'frozen-v1',trifecta:i===0||i===6?[1,2,3]:[2,1,3]}]));
const p={date:'20261122',venue:2,race:3,preRaceVerified:true,ruleVersionsFrozen:true,savedBeforeStart:true,methods};
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
 assert.equal(out.totals.races,0);assert.equal(out.totals.missingMethods,1);
});
test('unverified pre-race evidence is excluded',()=>{
 assert.equal(evaluateTwelveIndependentMethods([{...p,preRaceVerified:false}],[r]).totals.excluded,1);
});
