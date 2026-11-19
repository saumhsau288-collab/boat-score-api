import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectMakulaboApiResponse} from './boat-score-2-makulabo-api-adapter.js';
const racers=Array.from({length:6},(_,i)=>({boat:i+1,racerId:String(4001+i),name:'選手'+(i+1)}));
const rows=racers.map(r=>({boat:r.boat,name:r.name,counts:[1,1,1,1,1,1],runs:6}));
const payload={status:'fetched',officialRacersInspection:{verified:true,racers},heatmapRows:rows};
test('matches six extracted heatmap rows but does not claim recent50 readiness',()=>{
 const result=inspectMakulaboApiResponse(payload);
 assert.equal(result.status,'heatmap_matched');
 assert.equal(result.racers.length,6);
 assert.equal(result.recent50Ready,false);
});
test('rejects fetched response with missing or unverified official data',()=>{
 assert.equal(inspectMakulaboApiResponse({status:'fetched',heatmapRows:rows}).reason,'official_six_not_verified');
 assert.equal(inspectMakulaboApiResponse({status:'error'}).status,'unavailable');
});
test('rejects missing heatmap rows and mismatched names',()=>{
 assert.equal(inspectMakulaboApiResponse({...payload,heatmapRows:rows.slice(1)}).reason,'heatmap_six_not_extracted');
 const bad=rows.map(r=>({...r}));
 bad[0].name='不明な選手';
 assert.equal(inspectMakulaboApiResponse({...payload,heatmapRows:bad}).status,'unverified');
});

const headers=['枠','選手','1 着','2 着','3 着','4 着','5 着','6 着','走','平均'];
const finishTable={headers,rows:rows.map(r=>[String(r.boat),r.name,...r.counts.map(String),'6','3.50'])};
test('bridges labelled finish columns into matched racer rates',()=>{
 const result=inspectMakulaboApiResponse({...payload,finishTable});
 assert.equal(result.status,'heatmap_matched');
 assert.equal(result.racers[0].firstPlaceRate,16.67);
 assert.equal(result.racers[0].top2Rate,33.33);
 assert.equal(result.racers[0].top3Rate,50);
 assert.equal(result.recent50Ready,false);
});
test('rejects mislabeled or contradictory source table',()=>{
 const reordered={...finishTable,headers:[...headers.slice(0,2),'2 着','1 着',...headers.slice(4)]};
 assert.equal(inspectMakulaboApiResponse({...payload,finishTable:reordered}).reason,'unverified_finish_headers');
 const wrong={...finishTable,rows:finishTable.rows.map(r=>[...r])};
 wrong.rows[0][2]='2';
 wrong.rows[0][8]='7';
 assert.equal(inspectMakulaboApiResponse({...payload,finishTable:wrong}).reason,'labelled_row_mismatch');
});
