import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync('worker.js','utf8');
const start=source.indexOf('function summarizeArchivedRanks('),end=source.indexOf('async function readRankAuditWindows(',start);
assert.ok(start>=0&&end>start);
const context=vm.createContext({});
vm.runInContext(source.slice(start,end),context);
const {summarizeArchivedRanks:daily,summarizeRankAuditWindow:window}=context;
const date='20261124', capturedAt='2026-11-24T08:00:00+09:00',deadlineAt='2026-11-24T10:00:00+09:00';
const make=(race,extra={})=>({date,venue:2,race,capturedAt,deadlineAt,ready:true,officialVerified:true,statsVerified:true,rankedScores:[1,2,3,4,5,6].map(boat=>({boat,score:7-boat})),method:'test',...extra});
const finish=(race,finishOrder)=>({date,venue:2,race,verified:true,finishOrder});
const audit=daily(date,{records:[make(1),make(2),make(3),make(4,{capturedAt:deadlineAt}),make(1),make(5,{rankedScores:[]}),make(6,{capturedAt:null})]},{records:{'2:1':finish(1,[1,2,3,4,5,6]),'2:2':finish(2,[2,1,3,4,5,6])}});
assert.equal(audit.matched,2);assert.equal(audit.firstRankWins,1);assert.equal(audit.firstRankWinRate,.5);assert.equal(audit.missingResult,1);assert.equal(audit.excluded,4);
assert.equal(audit.rankByFinish[0][0],1);assert.equal(audit.rankByFinish[0][1],1);
for(const row of audit.rankByFinish)assert.equal(row.reduce((a,b)=>a+b,0),2);
for(const days of [7,14,30]){
 const aggregate=window(date,days,[{date,audit},{date:'20261123',audit:null}]);
 assert.equal(aggregate.matched,2);assert.equal(aggregate.firstRankWinRate,.5);assert.equal(aggregate.availableDays,1);assert.equal(aggregate.missingDays.length,1);assert.equal(aggregate.byVenue['2'].matched,2);assert.equal(aggregate.byModel['model:test'].firstRankWins,1);
}
const empty=window(date,7,[{date,audit:null}]);assert.equal(empty.firstRankWinRate,null);assert.equal(empty.matched,0);
console.log('Rank archive audit regression checks passed');
