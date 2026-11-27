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
const raceTimes=["08:35","09:01","09:27","09:53","10:22","10:51","11:19","11:56","12:29","12:58","13:33","14:14"];
const table=(values)=>'<table><tr><th>レース</th>'+values.map((_,i)=>'<th>'+(i+1)+'R</th>').join('')+'</tr><tr><th>締切予定時刻</th>'+values.map(t=>'<td>'+t+'</td>').join('')+'</tr></table>';
const html=table(raceTimes)+'<script>締切予定時刻 21:00</script>';
for(let race=1;race<=12;race++){
 const expected=new Date(Date.UTC(2026,10,23,Number(raceTimes[race-1].slice(0,2))-9,Number(raceTimes[race-1].slice(3)))).toISOString();
 assert.equal(parseDeadline(html,'20261123',race),expected,'Race '+race+' deadline must use its own column');
}
assert.equal(parseDeadline(table(raceTimes.map((t,i)=>i===1?'08:35':t)),'20261123',2),null,'Duplicated/non-increasing cutoff times are invalid');
assert.equal(parseDeadline(table(raceTimes)+'<table><tr><th>レース</th>'+raceTimes.map((_,i)=>'<th>'+(i+1)+'R</th>').join('')+'</tr><tr><th>締切予定時刻</th>'+raceTimes.map((t,i)=>'<td>'+(i===0?'08:36':t)+'</td>').join('')+'</tr></table>','20261123',1),null,'Conflicting tables are invalid');
assert.equal(parseDeadline('<div>締切予定時刻 12:15</div>','20261123',1),null,'Unscoped deadline is invalid');
assert.equal(parseDeadline(html,'20261123',13),null,'Invalid race number is rejected');
assert.equal(parseDeadline('<div>12:15</div>','20261123',1),null);
assert.equal(parseDeadline('<div>締切予定時刻 25:15</div>','20261123',1),null);
console.log('Production official cutoff parser: labeled JST time, ambiguity and missing evidence checks passed.');


// Exercise the production scheduled handler with an isolated in-memory KV.
// Neither official upstream services nor the deployed Worker are modified.
const schedulerStart=src.indexOf('  async scheduled(event,env,ctx) {');
const schedulerEnd=src.indexOf('\n  async fetch(request,env)',schedulerStart);
assert.ok(schedulerStart>=0&&schedulerEnd>schedulerStart);
const schedulerSource=src.slice(schedulerStart,schedulerEnd).trim().replace(/,$/,'');
const calls=[],saved=new Map(),callDetails=[];
let failMode=null;
const run=mode=>async(...args)=>{calls.push(mode);callDetails.push({mode,today:mode==='result'?args[2]:null});if(failMode===mode)throw Error('fixture collection failure');};
const scheduler=vm.runInNewContext('({'+schedulerSource+'}).scheduled',{
 jstDateFromUtc:d=>new Date(d.getTime()+9*3600000).toISOString().slice(0,10).replace(/-/g,''),
 runScheduledMorning:run('morning'),runScheduledBeforeArchive:run('before'),runScheduledResultArchive:run('result'),
 console:{error(){}}
});
const env={MORNING_KV:{async put(key,value){saved.set(key,JSON.parse(value));}}};
async function trigger(iso,mode,date,expectFailure=false){
 const callsBefore=calls.length;
 let pending;
 await scheduler({scheduledTime:Date.parse(iso),cron:'provider normalized expression'},env,{waitUntil(p){pending=p;}});
 assert.ok(pending,'Scheduled collector must register asynchronous work');
 if(expectFailure)await assert.rejects(pending,/fixture collection failure/);else await pending;
 assert.deepEqual(calls.slice(callsBefore),mode==='morning'?['morning','before']:mode==='before'?(expectFailure?['before']:['before','result']):[mode]);
 if(mode==='before')assert.equal(callDetails.slice(callsBefore).find(x=>x.mode==='result')?.today,true,'Before scheduler must collect only due same-day results');
 if(mode==='result')assert.equal(callDetails.slice(callsBefore).find(x=>x.mode==='result')?.today,undefined,'Nightly recovery must retain yesterday result mode');
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
console.log('Production scheduler: UTC/JST routing, same-day and previous-day result archives, health and failure recording passed.');

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
const beforeEnd=src.indexOf('\nfunction buildArchiveInventory(',beforeStart);
assert.ok(beforeStart>=0&&beforeEnd>beforeStart);
const fixtureNow=Date.now(),fixtureDate=new Date(fixtureNow+9*3600000).toISOString().slice(0,10).replace(/-/g,'');
const cutoff=new Date(fixtureNow+840000).toISOString();
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
 extractOfficialWeather:()=>({verified:true}),
  validSavedMorningRecord:()=>false
});
await collectBefore({MORNING_KV:fixtureKV},fixtureNow);
const beforeKey='before-archive:v1:'+fixtureDate;
let partialState=JSON.parse(partialStore.get(beforeKey));
assert.equal(Object.keys(partialState.records).length,0);
assert.equal(partialState.partialRecords['1:1'].exhibition.data.verified,true);
assert.equal(partialState.partialRecords['1:1'].start,undefined);
assert.equal(partialState.lastScan.eligibleCount,1,'14-minute-before-cutoff fixture must be eligible under 15-minute collection window');
assert.equal(partialState.failures['1:1'].details.start,false);
const firstCapture=partialState.partialRecords['1:1'].exhibition.capturedAt;
fullCapture=true;
await collectBefore({MORNING_KV:fixtureKV},fixtureNow);
partialState=JSON.parse(partialStore.get(beforeKey));
assert.equal(Object.keys(partialState.records).length,1,'Second full capture must save; failure='+JSON.stringify(partialState.failures['1:1']||null));
assert.equal(partialState.partialRecords['1:1'].exhibition.capturedAt,firstCapture);
assert.equal(partialState.failures['1:1'],undefined);
assert.equal(partialState.attempts['1:1'],2);
console.log('Before archive retains independently verified partial data, retries, and promotes only complete captures.');


// Inventory must distinguish old incomplete evidence, partial captures and
// absent schedules, and must not count malformed six-boat records.
const invStart=src.indexOf('function buildArchiveInventory(');
const invEnd=src.indexOf('\nconst workerHandler = {',invStart);
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


// Multi-selection is constrained to permitted boats at each position,
// never repeats a boat within an order, and never changes the original scores.
const scenarioStart=src.indexOf('function enumerateScenarioOrders(');
const scenarioEnd=src.indexOf('\n(function(){',scenarioStart);
assert.ok(scenarioStart>=0&&scenarioEnd>scenarioStart);
const {scenarioRank,enumerate}=vm.runInNewContext(src.slice(scenarioStart,scenarioEnd)+'\n({scenarioRank:rankScenarioCombinations,enumerate:enumerateScenarioOrders});');
const originalScores=JSON.stringify(boats);
for(const [fixed,expected] of [
 [[[1],[],[]],20],[[[],[4],[]],20],[[[],[],[6]],20],
 [[[2],[],[6]],4],[[[1],[2],[3]],1],
 [[[1,2],[3,4],[4,5,6]],10],
 [[[1,2],[1,2],[]],8],
 [[[1,2,3,4,5,6],[],[]],120]
]){
 const result=scenarioRank(boats,fixed),picks=[...result.main,...result.upset];
 assert.equal(result.ready,true);
 assert.equal(result.total,expected);
 assert.equal(enumerate(fixed).length,expected);
 assert.equal(picks.length,Math.min(12,expected));
 assert.equal(result.main.length,Math.min(6,expected));
 assert.equal(new Set(picks.map(x=>x.join('-'))).size,picks.length);
 assert.ok(picks.every(x=>new Set(x).size===3&&fixed.every((b,i)=>!b.length||b.includes(x[i]))));
}
assert.equal(scenarioRank(boats,[[1],[1],[]]).ready,false);
assert.equal(scenarioRank(boats,[[1,2],[1,2],[1,2]]).ready,false);
assert.equal(scenarioRank(boats,[[],[],[]]).ready,false);
assert.equal(enumerate([[],[],[]]).length,120);
assert.equal(scenarioRank(boats,[[7],[],[]]).ready,false);
assert.equal(scenarioRank(boats,[[1,1],[],[]]).ready,false);
assert.equal(scenarioRank(boats.slice(0,5),[[1],[],[]]).ready,false);
assert.equal(JSON.stringify(boats),originalScores);
console.log('Independent scenario multi-selection: valid overlap, impossible conditions, candidate counts and no mutation passed.');

const courseTrial=vm.runInNewContext(src.slice(scenarioStart,scenarioEnd)+'\nrankInnerWinnerCourseTrial;');
const courseStarts=[1,2,3,4,5,6].map((boat,i)=>({boat,course:boat,st:[.12,.14,.15,.12,.08,.04][i]}));
const courseEx=[1,2,3,4,5,6].map(boat=>({boat,time:6.8}));
const positionRecent=[1,2,3,4,5,6].map(boat=>({boat,secondPoints:boat,thirdPoints:7-boat}));
const ctrial=courseTrial(boats,[[1],[],[]],{start:courseStarts,exhibition:courseEx},positionRecent);
assert.equal(ctrial.ready,true);
assert.equal(ctrial.total,20);
assert.equal(ctrial.numeric,true);
assert.equal(ctrial.recentOK,true);
assert.equal(ctrial.signals.length,4);
assert.ok(ctrial.signals.some(x=>x.course===4)&&ctrial.signals.some(x=>x.course===5)&&ctrial.signals.some(x=>x.course===6));
assert.equal(new Set([...ctrial.main,...ctrial.upset].map(x=>x.join('-'))).size,12);
assert.ok([...ctrial.main,...ctrial.upset].every(x=>x[0]===1&&new Set(x).size===3));
const flTrial=courseTrial(boats,[[1],[],[]],{start:courseStarts.map(x=>x.boat===2?{...x,st:'F.01'}:x),exhibition:courseEx},null);
assert.equal(flTrial.ready,true);
assert.equal(flTrial.numeric,false);
assert.equal(flTrial.signals.length,0);
assert.equal(flTrial.recentOK,false);
assert.equal(courseTrial(boats,[[1,2],[],[]],{start:courseStarts},null).ready,false);
assert.equal(courseTrial(boats,[[1],[],[]],{start:courseStarts.slice(0,5)},null).ready,false);
const constrained=courseTrial(boats,[[1],[3,4],[4,5,6]],{start:courseStarts,exhibition:courseEx},positionRecent);
assert.equal(constrained.total,5);
assert.equal(constrained.main.length,5);
assert.equal(constrained.upset.length,0);
assert.equal(JSON.stringify(boats),originalScores);
console.log('Conditional course research trial: position-specific recent points, numeric ST gates, fixed constraints and no mutation passed.');

const makeScenarioRecord=vm.runInNewContext(src.slice(scenarioStart,scenarioEnd)+'\nbuildScenarioResearchRecord;');
const recordInput={date:'20261126',venue:12,race:1,rankedScores:boats,method:'average_national_local_winrate70_motor30_unvalidated',scenarioEvidence:{generatedAt:'2026-11-26T01:00:00Z',deadlineAt:'2026-11-26T01:05:00Z',start:courseStarts,exhibition:courseEx},startAdjustmentApplied:true,exhibitionAdjustmentApplied:true};
const recordConditions=[[1],[],[]],recordPicks=scenarioRank(boats,recordConditions);
const goodRecord=makeScenarioRecord(recordInput,recordConditions,recordPicks,ctrial,boats,positionRecent,'2026-11-26T01:00:02Z');
assert.equal(goodRecord.serverResponseBeforeDeadline,true);
assert.equal(goodRecord.deviceTimeConsistent,true);
assert.equal(goodRecord.source,'device_record_not_server_attested');
assert.equal(goodRecord.baseline.main.length,6);
assert.equal(goodRecord.research.main.length,6);
assert.equal(makeScenarioRecord(recordInput,recordConditions,recordPicks,ctrial,boats,null,'2026-11-26T01:05:00Z').deviceTimeConsistent,false);
assert.equal(makeScenarioRecord({...recordInput,scenarioEvidence:{...recordInput.scenarioEvidence,generatedAt:'2026-11-26T01:05:00Z'}},recordConditions,recordPicks,ctrial,boats,null,'2026-11-26T01:05:01Z').serverResponseBeforeDeadline,false);
assert.equal(makeScenarioRecord({...recordInput,scenarioEvidence:{}},recordConditions,recordPicks,ctrial,boats,null,'2026-11-26T01:00:02Z').serverResponseBeforeDeadline,false);
assert.equal(makeScenarioRecord(recordInput,recordConditions,recordPicks,ctrial,boats,null,'2026-11-26T00:59:50Z').deviceTimeConsistent,false);
assert.equal(makeScenarioRecord({...recordInput,date:'20261125'},recordConditions,recordPicks,ctrial,boats,null,'2026-11-26T01:00:02Z').serverResponseBeforeDeadline,false);
console.log('Scenario research record: timing provenance, missing deadline, late record and date mismatch checks passed.');

const auditSelect=vm.runInNewContext(src.slice(scenarioStart,scenarioEnd)+'\nselectScenarioAuditRecords;');
const auditSummarize=vm.runInNewContext(src.slice(scenarioStart,scenarioEnd)+'\nsummarizeScenarioAudit;');
const newRecord={...goodRecord,generatedAt:'2026-11-26T01:01:00Z',recordedAt:'2026-11-26T01:01:02Z'};
const secondRecord={...goodRecord,race:2};
const thirdRecord={...goodRecord,race:3};
const excludedResearch={...goodRecord,race:4,research:{ready:false}};
const olderResearch={...goodRecord,race:4,generatedAt:'2026-11-26T00:59:00Z',recordedAt:'2026-11-26T00:59:02Z'};
const auditSelected=auditSelect([goodRecord,newRecord,secondRecord,thirdRecord,olderResearch,excludedResearch,{...goodRecord,race:5,conditions:[[1],[2],[]]},{...goodRecord,race:6,recordedAt:'2026-11-26T01:05:01Z'}],'20261126');
assert.equal(auditSelected.records.length,3);
assert.equal(auditSelected.records[0].recordedAt,newRecord.recordedAt);
assert.equal(auditSelected.excluded.duplicates,2);
assert.equal(auditSelected.excluded.otherConditions,1);
assert.equal(auditSelected.excluded.invalid,1);
assert.equal(auditSelected.excluded.researchUnavailable,1);
const auditOrder=[...newRecord.baseline.main[0],...[1,2,3,4,5,6].filter(b=>!newRecord.baseline.main[0].includes(b))];
const auditResults=new Map([['12:1',{date:'20261126',venue:12,race:1,verified:true,finishOrder:auditOrder}],['12:2',{date:'20261126',venue:12,race:2,verified:true,finishOrder:[2,1,3,4,5,6]}],['12:3',{date:'20261125',venue:12,race:3,verified:true,finishOrder:[1,2,3,4,5,6]}]]);
const audited=auditSummarize(auditSelected.records,auditResults);
assert.equal(audited.overall.n,2);
assert.equal(audited.conditional.n,1);
assert.equal(audited.pending.length,1);
assert.equal(audited.overall.baseline.main,1);
assert.equal(audited.conditional.baseline.secondTop,1);
assert.equal(audited.conditional.baseline.thirdTop,1);
assert.equal(audited.conditional.baseline.course[auditOrder[1]-1].actual2,1);
assert.equal(audited.conditional.baseline.course[auditOrder[2]-1].thirdCover,1);
assert.equal(audited.details.length,2);
assert.equal(auditSummarize([goodRecord],new Map([['12:1',{date:'20261126',venue:12,race:1,verified:true,finishOrder:[1,1,3,4,5,6]}]])).overall.n,0);
console.log('Scenario result audit: latest record per race, paired selection, verified results, conditional denominators and course coverage passed.');

const oneRankStart=src.indexOf('function rankMorningBoatOne('),oneRankEnd=src.indexOf('function classifyDailyRaceCandidates(',oneRankStart);
assert.ok(oneRankStart>=0&&oneRankEnd>oneRankStart);
const oneRank=vm.runInNewContext(src.slice(oneRankStart,oneRankEnd)+'\nrankMorningBoatOne;');
const oneRow=(venue,race,one)=>{const rankedScores=[1,2,3,4,5,6].map(boat=>({boat,score:boat===1?one:40-boat}));return {date:'20261126',venue,race,ready:true,officialVerified:true,statsVerified:true,capturedAt:'2026-11-25T23:05:00Z',deadlineAt:'2026-11-26T01:00:00Z',rankedScores,predictedOrder:rankedScores.slice().sort((a,b)=>b.score-a.score||a.boat-b.boat).map(x=>x.boat)};};
const oneRows=Array.from({length:24},(_,i)=>oneRow(i+1,1,30+i));
const oneResults=oneRank([...oneRows,oneRow(24,1,100),{...oneRow(1,2,100),capturedAt:null},{...oneRow(1,3,100),predictedOrder:null},{...oneRow(1,4,100),capturedAt:'2026-11-26T01:00:00Z'},{...oneRow(1,5,100),date:'20261125'}],'20261126');
assert.equal(oneResults.length,20);
assert.equal(oneResults[0].venue,24);
assert.equal(oneResults[0].score,15);
assert.equal(oneResults[19].venue,5);
assert.equal(oneResults.every(x=>x.verifiedProbability===false),true);
assert.equal(oneRank([], '20261126').length,0);
assert.equal(oneRank([oneRow(1,1,30)],'20261126').length,1);
assert.equal(JSON.stringify(oneRows[0]),JSON.stringify(oneRow(1,1,30)));
console.log('Independent morning boat-one ranking: ordering, maximum 20, deduplication and predeadline evidence passed.');

const summarizeOne=vm.runInNewContext(src.slice(oneRankStart,oneRankEnd)+'\nsummarizeMorningBoatOne;');
const oneFixture=[oneRow(1,1,55),oneRow(1,2,50),oneRow(1,3,45),oneRow(1,4,40),oneRow(1,5,35)];
const oneSelected=oneRank(oneFixture,'20261126').slice(0,4);
const oneMorning={date:'20261126',records:oneFixture,boatOneRanking:oneSelected,boatOneRankedAt:'2026-11-25T23:15:00Z'};
const oneFinish=(race,order)=>({date:'20261126',venue:1,race,verified:true,finishOrder:order});
const oneArchive={date:'20261126',records:{'1:1':oneFinish(1,[1,2,3,4,5,6]),'1:2':oneFinish(2,[2,1,3,4,5,6]),'1:3':oneFinish(3,[1,1,3,4,5,6]),'1:5':oneFinish(5,[1,3,2,4,5,6])}};
const oneAudit=summarizeOne('20261126',oneMorning,oneArchive);
assert.equal(oneAudit.selected,4);
assert.equal(oneAudit.matched,2);
assert.equal(oneAudit.wins,1);
assert.equal(oneAudit.losses,1);
assert.equal(oneAudit.pending,2);
assert.equal(oneAudit.winRate,.5);
assert.equal(oneAudit.other.matched,1);
assert.equal(oneAudit.other.wins,1);
assert.equal(summarizeOne('20261126',{...oneMorning,boatOneRankedAt:null},oneArchive).excluded,4);
assert.equal(summarizeOne('20261126',{...oneMorning,boatOneRankedAt:'2026-11-26T01:00:00Z'},oneArchive).matched,0);
assert.equal(summarizeOne('20261126',{...oneMorning,boatOneRanking:undefined},oneArchive).status,'ranking_not_saved');
assert.equal(summarizeOne('20261126',{...oneMorning,boatOneRanking:[{...oneSelected[0],score:999}]},oneArchive).excluded,1);
assert.equal(summarizeOne('20261126',{...oneMorning,boatOneRanking:[oneSelected[0],oneSelected[0]]},oneArchive).matched,1);
assert.equal(summarizeOne('20261126',oneMorning,{...oneArchive,date:'20261125'}).matched,0);
console.log('Morning boat-one audit: saved ranking only, cutoff timing, official results, duplicates and separate comparison group passed.');

const officialPosition=vm.runInNewContext(src.slice(scenarioStart,scenarioEnd)+'\nrankOfficialPositionTrial;');
const courseEvidence={start:courseStarts,exhibition:courseEx,courseStats:{ready:true,courseBasis:'verified_exhibition_course',rows:courseStarts.map(x=>({boat:x.boat,course:x.course,racerId:String(4000+x.boat),status:'available',normalFinishes:20,priorStrength:20,pooledRates:[.2,.2,.2],smoothedRates:[.2,x.boat===2?.3:.2,x.boat===3?.3:.2]}))}};
const newOfficial=officialPosition(boats,recordConditions,courseEvidence,positionRecent);
assert.equal(newOfficial.ready,true);
assert.equal(newOfficial.method,'official_position_shrink20_log3_v1');
assert.ok(newOfficial.adjustments.find(x=>x.boat===2).second>0);
assert.equal(newOfficial.adjustments.find(x=>x.boat===2).third,0);
assert.ok(newOfficial.adjustments.find(x=>x.boat===3).third>0);
assert.equal(new Set([...newOfficial.main,...newOfficial.upset].map(x=>x.join('-'))).size,12);
assert.equal(officialPosition(boats,recordConditions,{...courseEvidence,courseStats:{...courseEvidence.courseStats,courseBasis:'assumed_frame_not_verified_course'}},positionRecent).ready,false);
assert.equal(officialPosition(boats,recordConditions,{...courseEvidence,courseStats:{...courseEvidence.courseStats,rows:courseEvidence.courseStats.rows.map((x,i)=>i===0?{...x,normalFinishes:0}:x)}},positionRecent).ready,false);
assert.equal(JSON.stringify(courseTrial(boats,recordConditions,courseEvidence,positionRecent)),JSON.stringify(ctrial));
assert.equal(JSON.stringify(boats),originalScores);
assert.equal(makeScenarioRecord(recordInput,recordConditions,recordPicks,ctrial,boats,positionRecent,'2026-11-26T01:00:02Z',newOfficial).officialPositionTrial.method,newOfficial.method);
console.log('Official position trial: separate second/third adjustments, evidence gate, saved comparison and unchanged existing model passed.');
