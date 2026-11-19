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
