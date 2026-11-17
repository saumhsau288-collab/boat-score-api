import assert from 'node:assert/strict';
import {validateHistoricalRow,studyHistoricalWeights} from './historical-partial-weight-study.mjs';
const mk=(date,race)=>({date,venue:23,race,asOf:date.slice(0,4)+'-'+date.slice(4,6)+'-'+date.slice(6)+'T08:00:00+09:00',asOfVerified:true,capturedBeforeStart:true,resultVerified:true,finishOrder:[1,2,3,4,5,6],racers:Array.from({length:6},(_,i)=>({boat:i+1,racerId:String(4000+i),name:'r'+i,sourceVerified:true,nationalWinRate:9-i,localWinRate:8-i,motorTwoWinRate:70-i}))});
// UTC date differs for 08:00 JST; only local source-date must match.
assert.ok(validateHistoricalRow(mk('20261116',1)));
assert.equal(validateHistoricalRow({...mk('20261116',1),capturedBeforeStart:false}),null);
assert.equal(studyHistoricalWeights([mk('20261116',1)]).status,'insufficient_verified_historical_inputs');
const rows=['20261113','20261114','20261115','20261116'].flatMap(d=>Array.from({length:12},(_,i)=>mk(d,i+1)));
assert.equal(studyHistoricalWeights(rows,{minTrain:24,minTest:12}).status,'evaluated');
assert.equal(studyHistoricalWeights([...rows,rows[0]],{minTrain:24,minTest:12}).status,'duplicate_races');
console.log('Historical partial-weight tests passed');
