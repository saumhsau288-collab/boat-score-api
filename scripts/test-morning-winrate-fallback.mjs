import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

// Test the exact production function without fetching race results or deploying.
const source=fs.readFileSync(new URL('../worker.js',import.meta.url),'utf8');
const start=source.indexOf('function buildMorningRaceInputs(');
const end=source.indexOf('\nfunction classifyDailyRaceCandidates(',start);
assert.ok(start>=0&&end>start,'Morning ranking implementation must be present');
const rankStart=source.indexOf('function rankTrifectaCandidates(');
const rankEnd=source.indexOf('\nfunction parseOfficialFinishOrder(',rankStart);
assert.ok(rankStart>=0&&rankEnd>rankStart,'Trifecta ranking implementation must be present');
const build=vm.runInNewContext(source.slice(rankStart,rankEnd)+'\n'+source.slice(start,end)+'\nbuildMorningRaceInputs;');
const base=[7,6.5,6,5.5,5,4.5].map((rate,i)=>({
 boat:i+1,nationwide:{winRate:rate},local:{winRate:rate},
 motor:{secondPlaceRate:30}
}));
const evaluate=rows=>build('20261122',1,1,{
 verified:true,statsVerified:true,statsByBoat:rows
});
const score=(out,boat)=>out.rankedScores.find(x=>x.boat===boat).score;
const baseline=evaluate(base);
assert.equal(baseline.ready,true);
const zero=evaluate(base.map((r,i)=>i===0?{...r,local:{winRate:0}}:r));
assert.equal(zero.ready,true);
assert.equal(score(zero,1),score(baseline,1),'Local zero must fall back to national rate');
const missing=evaluate(base.map((r,i)=>i===0?{...r,local:{winRate:null}}:r));
assert.equal(missing.ready,true);
assert.equal(score(missing,1),score(baseline,1),'Missing local rate must fall back to national rate');
const reduced=evaluate(base.map((r,i)=>i===0?{...r,local:{winRate:1}}:r));
assert.equal(reduced.ready,true);
assert.ok(score(reduced,1)<score(baseline,1),'Nonzero local rate must affect the average');
const absentNational=evaluate(base.map((r,i)=>i===0?{...r,nationwide:{winRate:null}}:r));
assert.equal(absentNational.ready,false,'Missing national rate must not be invented');
console.log('Morning win-rate regression: zero local, missing local, valid average and missing national passed');
