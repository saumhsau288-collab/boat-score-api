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


// Exercise the production scheduled handler with an isolated in-memory KV.
// Neither official upstream services nor the deployed Worker are modified.
const schedulerStart=src.indexOf('  async scheduled(event,env,ctx) {');
const schedulerEnd=src.indexOf('\n  async fetch(request,env)',schedulerStart);
assert.ok(schedulerStart>=0&&schedulerEnd>schedulerStart);
const schedulerSource=src.slice(schedulerStart,schedulerEnd).trim().replace(/,$/,'');
const calls=[],saved=new Map();
let failMode=null;
const run=mode=>async()=>{calls.push(mode);if(failMode===mode)throw Error('fixture collection failure');};
const scheduler=vm.runInNewContext('({'+schedulerSource+'}).scheduled',{
 jstDateFromUtc:d=>new Date(d.getTime()+9*3600000).toISOString().slice(0,10).replace(/-/g,''),
 runScheduledMorning:run('morning'),runScheduledBeforeArchive:run('before'),runScheduledResultArchive:run('result'),
 console:{error(){}}
});
const env={MORNING_KV:{async put(key,value){saved.set(key,JSON.parse(value));}}};
async function trigger(iso,mode,date,expectFailure=false){
 let pending;
 await scheduler({scheduledTime:Date.parse(iso),cron:'provider normalized expression'},env,{waitUntil(p){pending=p;}});
 assert.ok(pending,'Scheduled collector must register asynchronous work');
 if(expectFailure)await assert.rejects(pending,/fixture collection failure/);else await pending;
 assert.equal(calls.at(-1),mode);
 const health=saved.get('scheduler-health:v1:'+mode+':'+date);
 assert.equal(health.status,expectFailure?'failed':'finished');
 assert.equal(health.date,date);
 assert.equal(health.scheduledAt,iso);
 assert.ok(health.finishedAt);
 if(expectFailure)assert.equal(health.error,'fixture collection failure');
}
await trigger('2026-11-24T23:00:00.000Z','morning','20261125');
await trigger('2026-11-25T00:05:00.000Z','before','20261125');
await trigger('2026-11-25T14:55:00.000Z','before','20261125');
await trigger('2026-11-25T15:00:00.000Z','result','20261125');
await trigger('2026-11-25T22:55:00.000Z','result','20261125');
failMode='before';
await trigger('2026-11-25T04:00:00.000Z','before','20261125',true);
console.log('Production scheduler: UTC/JST routing, previous-day result archive, health and failure recording passed.');

// Read the production API handler with a fixture containing original and legacy rows.
const recordsStart=src.indexOf("if(u.pathname==='/api/research/morning-records'){");
const recordsEnd=src.indexOf("if(u.pathname==='/api/research/scheduler-health'){",recordsStart);
assert.ok(recordsStart>=0&&recordsEnd>recordsStart);
const original={...row,ready:true,predictedOrder:[1,2,3,4,5,6],method:'fixture'};
const legacy={...original,race:2,capturedAt:null,predictedOrder:null};
const rejected={...original,race:3,statsVerified:false};
const originalJSON=JSON.stringify({date:row.date,records:[original,legacy,rejected]});
const fixtureEnv={MORNING_KV:{async get(){return originalJSON;}}};
const handler=vm.runInNewContext('(async (request,env,u)=>{'+src.slice(recordsStart,recordsEnd)+'})',{
 reply:(_request,data,status=200)=>({data,status})
});
const response=await handler({method:'GET'},fixtureEnv,new URL('https://example.invalid/api/research/morning-records?date='+row.date));
assert.equal(response.status,200);
assert.equal(response.data.records.length,2);
assert.equal(response.data.records[0].capturedAt,original.capturedAt);
assert.equal(response.data.records[1].capturedAt,null);
assert.equal(response.data.records[1].predictedOrder,null);
assert.equal(response.data.records[0].rankedScores.length,6);
assert.equal((await handler({method:'POST'},fixtureEnv,new URL('https://example.invalid/api/research/morning-records?date='+row.date))).status,405);
console.log('Archived research API: original records preserved, unverified rows excluded, legacy timestamps not invented.');


// Partial verified observations must survive failed full captures, without
// being promoted to complete six-boat pre-deadline evidence.
const beforeStart=src.indexOf('async function runScheduledBeforeArchive(');
const beforeEnd=src.indexOf('\nexport default {',beforeStart);
assert.ok(beforeStart>=0&&beforeEnd>beforeStart);
const fixtureNow=Date.now(),fixtureDate=new Date(fixtureNow+9*3600000).toISOString().slice(0,10).replace(/-/g,'');
const cutoff=new Date(fixtureNow+240000).toISOString();
const partialStore=new Map();
partialStore.set('morning:'+fixtureDate,JSON.stringify({date:fixtureDate,venues:[1],records:Array.from({length:12},(_,i)=>({date:fixtureDate,venue:1,race:i+1,ready:true,deadlineAt:i===0?cutoff:new Date(fixtureNow+3600000).toISOString()}))}));
const fixtureKV={async get(k){return partialStore.get(k)||null;},async put(k,v){partialStore.set(k,v);}};
let fullCapture=false;
const collectBefore=vm.runInNewContext(src.slice(beforeStart,beforeEnd)+'\nrunScheduledBeforeArchive;',{
 jstDateFromUtc:()=>fixtureDate,mapOfficialLimited:async(items,_limit,fn)=>Promise.all(items.map(fn)),
 fetch:async()=>({ok:true,text:async()=>'<fixture>'}),AbortSignal,
 extractOfficialRaceDeadline:()=>cutoff,extractOfficialBoatRows:()=>({verified:true}),
 extractOfficialExhibition:()=>({verified:true,rows:boats,candidateCount:6}),
 extractOfficialStartExhibition:()=>({verified:fullCapture,rows:fullCapture?boats:[],candidateCount:fullCapture?6:0}),
 extractOfficialWeather:()=>({verified:true})
});
await collectBefore({MORNING_KV:fixtureKV},fixtureNow);
const beforeKey='before-archive:v1:'+fixtureDate;
let partialState=JSON.parse(partialStore.get(beforeKey));
assert.equal(Object.keys(partialState.records).length,0);
assert.equal(partialState.partialRecords['1:1'].exhibition.data.verified,true);
assert.equal(partialState.partialRecords['1:1'].start,undefined);
assert.equal(partialState.lastScan.eligibleCount,1);
assert.equal(partialState.failures['1:1'].details.start,false);
const firstCapture=partialState.partialRecords['1:1'].exhibition.capturedAt;
fullCapture=true;
await collectBefore({MORNING_KV:fixtureKV},fixtureNow);
partialState=JSON.parse(partialStore.get(beforeKey));
assert.equal(Object.keys(partialState.records).length,1);
assert.equal(partialState.partialRecords['1:1'].exhibition.capturedAt,firstCapture);
assert.equal(partialState.failures['1:1'],undefined);
assert.equal(partialState.attempts['1:1'],2);
console.log('Before archive retains independently verified partial data, retries, and promotes only complete captures.');


// Inventory must distinguish old incomplete evidence, partial captures and
// absent schedules, and must not count malformed six-boat records.
const invStart=src.indexOf('function buildArchiveInventory(');
const invEnd=src.indexOf('\nexport default {',invStart);
assert.ok(invStart>=0&&invEnd>invStart);
const inventory=vm.runInNewContext(src.slice(invStart,invEnd)+'\nbuildArchiveInventory;');
const invDate='20261125',at='2026-11-25T03:00:00.000Z',end='2026-11-25T03:05:00.000Z';
const baseRow={date:invDate,venue:1,race:1,ready:true,officialVerified:true,statsVerified:true,rankedScores:boats,capturedAt:at,deadlineAt:end,predictedOrder:[1,2,3,4,5,6]};
const savedMorning={date:invDate,venues:[1],records:[baseRow,{...baseRow,race:2,predictedOrder:null},{...baseRow,race:3,statsVerified:false}]};
const full={date:invDate,venue:1,race:1,capturedAt:at,deadlineAt:end,exhibition:{verified:true,rows:boats},start:{verified:true,rows:boats},weather:{verified:true}};
const partial={capturedAt:at,deadlineAt:end,data:{verified:true,rows:boats}};
const savedBefore={date:invDate,venues:[1],records:{'1:1':full,'1:3':{...full,race:3,capturedAt:end}},partialRecords:{'1:2':{exhibition:partial}},failures:{'1:2':{reason:'fixture_missing_start'}}};
const savedResult={date:invDate,venues:[1],records:{'1:1':{date:invDate,venue:1,race:1,verified:true,finishOrder:[1,2,3,4,5,6]},'1:2':{date:invDate,venue:1,race:2,verified:true,finishOrder:[1,2,3,4,5,5]}}};
const inv=inventory(invDate,savedMorning,savedBefore,savedResult,Date.parse(end)+1000);
assert.equal(inv.expected,12);
assert.equal(inv.rows.length,12);
assert.equal(inv.counts.morning,2);
assert.equal(inv.counts.morningOrder,1);
assert.equal(inv.counts.before,1);
assert.equal(inv.counts.exhibition,2);
assert.equal(inv.counts.start,1);
assert.equal(inv.counts.partial,1);
assert.equal(inv.counts.results,1);
assert.equal(inv.counts.complete,1);
assert.equal(inv.rows[1].failures.before,'fixture_missing_start');
assert.ok(inv.rows[1].missing.includes('before_missing'));
assert.equal(inventory(invDate,null,null,null).expected,null);
assert.equal(inventory(invDate,null,null,null).rows.length,0);
console.log('Daily archive inventory distinguishes verified full, partial, missing and unknown schedule data.');
