import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync('worker.js','utf8');
const start=source.indexOf('function validSavedMorningRecord('),end=source.indexOf('// Separate, bounded official result archive',start);
assert.ok(start>=0&&end>start);
const date='20261126',now=new Date('2026-11-26T00:00:00Z');
const row=race=>({date,venue:20,race,ready:true,officialVerified:true,statsVerified:true,capturedAt:'2026-11-25T23:00:00Z',deadlineAt:new Date(Date.parse('2026-11-26T04:00:00Z')+(race-1)*30*60000).toISOString(),rankedScores:[1,2,3,4,5,6].map(boat=>({boat,score:7-boat})),predictedOrder:[1,2,3,4,5,6]});
const records=Array.from({length:12},(_,i)=>row(i+1));delete records[9].predictedOrder;
let state={date,venues:[20],completedVenues:[20],attempts:{20:1},records},fetched=[];
class FixedDate extends Date{constructor(...a){super(...(a.length?a:[now.getTime()]));}static now(){return now.getTime();}}
const ctx=vm.createContext({Date:FixedDate,jstDateFromUtc:()=>date,officialScheduleVenueCandidates:async()=>[20],mapOfficialLimited:async(items,limit,fn)=>Promise.all(items.map(fn)),fetchOfficialRacers:async(d,v,r)=>{fetched.push(r);return {racers:[],statsByBoat:[]}},buildMorningRaceInputs:(d,v,r)=>row(r),rankTrifectaCandidates:()=>({ready:true,main:[],upset:[]}),matchOfficialCourseStats:()=>null,officialCourseData:{},classifyDailyRaceCandidates:()=>({main:[],upset:[],chaos:[]}),rankMorningBoatOne:()=>[]});
vm.runInContext(source.slice(start,end),ctx);
const env={MORNING_KV:{get:async()=>JSON.stringify(state),put:async(k,v)=>{state=JSON.parse(v)}}};
await ctx.runScheduledMorning(env,now.getTime());
assert.deepEqual(fetched,[10]);assert.equal(state.records.length,12);assert.equal(state.invalidMorningRecords.length,1);assert.equal(state.status,'completed');assert.deepEqual(state.records.find(x=>x.race===10).predictedOrder,[1,2,3,4,5,6]);
assert.equal(ctx.validSavedMorningRecord({...row(1),capturedAt:'2026-11-26T05:00:00Z'},date),false);
assert.equal(ctx.validSavedMorningRecord({...row(1),predictedOrder:[1,1,3,4,5,6]},date),false);
// A duplicated deadline must trigger recovery of both affected races.
state={date,venues:[20],completedVenues:[20],attempts:{20:1},records:Array.from({length:12},(_,i)=>row(i+1))};
state.records[1].deadlineAt=state.records[0].deadlineAt;
fetched=[];
await ctx.runScheduledMorning(env,now.getTime());
assert.deepEqual(fetched,[1,2]);assert.equal(state.records.length,12);assert.equal(state.invalidMorningRecords.length,2);
assert.equal(state.status,'completed');
console.log('Morning recovery regression passed');
