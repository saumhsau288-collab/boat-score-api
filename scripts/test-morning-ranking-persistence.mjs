import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const src=fs.readFileSync(new URL('../worker.js',import.meta.url),'utf8');
const from=src.indexOf('function classifyDailyRaceCandidates(');
const to=src.indexOf('\nfunction summarizeHistoricalOuterFollow(',from);
assert.ok(from>=0&&to>from,'Production morning ranking function must be present');
const classify=vm.runInNewContext(src.slice(from,to)+'\nclassifyDailyRaceCandidates;');
const boats=[1,2,3,4,5,6].map((boat,i)=>({boat,score:30-i*5}));
const row={date:'20261123',venue:1,race:1,officialVerified:true,statsVerified:true,rankedScores:boats,capturedAt:'2026-11-22T23:00:00.000Z',deadlineAt:'2026-11-22T23:15:00.000Z'};
const outcome=classify([row]);
const predictions=[...outcome.main,...outcome.upset,...outcome.chaos];
assert.equal(predictions.length,1,'One verified race should be ranked once');
assert.equal(predictions[0].predictedOrder.join(','),'1,2,3,4,5,6','Predicted order must persist in saved morning ranking');
assert.equal(predictions[0].date,'20261123');
assert.equal(predictions[0].capturedAt,row.capturedAt,'Original prediction capture time must be retained');
assert.equal(predictions[0].deadlineAt,row.deadlineAt,'Verified deadline must persist without being inferred');
assert.equal(classify([{...row,deadlineAt:null}]).main[0].deadlineAt,null,'Missing deadline must not be invented');
assert.equal(predictions[0].status,'provisional_not_calibrated');
assert.equal(classify([{...row,statsVerified:false}]).main.length,0,'Unverified metrics must not be ranked');
console.log('Production morning ranking persists 6-boat predictedOrder and capture timestamp; unverified records held.');

// Test the actual production parser, not a duplicated implementation.
const parserStart=src.indexOf('function extractOfficialRaceDeadline(');
const parserEnd=src.indexOf('\nfunction buildMorningRaceInputs(',parserStart);
assert.ok(parserStart>=0&&parserEnd>parserStart,'Official deadline parser must be present');
const parseDeadline=vm.runInNewContext(src.slice(parserStart,parserEnd)+'\nextractOfficialRaceDeadline;');
const html='<div>締切予定時刻 12:15</div><script>締切予定時刻 21:00</script>';
assert.equal(parseDeadline(html,'20261123'),'2026-11-23T03:15:00.000Z');
assert.equal(parseDeadline('<div>締切予定時刻 12:15 締切予定時刻 12:20</div>','20261123'),null);
assert.equal(parseDeadline('<div>12:15</div>','20261123'),null);
assert.equal(parseDeadline('<div>締切予定時刻 25:15</div>','20261123'),null);
console.log('Production official cutoff parser: labeled JST time, ambiguity and missing evidence checks passed.');
