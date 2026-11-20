import assert from 'node:assert/strict';
import {runSavedMakulaboResearch as run} from './run-saved-makulabo-research.mjs';
const racers=Array.from({length:6},(_,i)=>({boat:i+1,racerId:String(4001+i),
 name:'選手'+(i+1),sourceVerified:true,nationalWinRate:6,localWinRate:5,motorTwoWinRate:40}));
const snapshot={status:'captured_research_inputs',source:'verified_official_metrics',
 date:'20261120',venue:18,race:1,racers};
const tr=(cells,tag)=>'<tr>'+cells.map(x=>'<'+tag+'>'+x+'</'+tag+'>').join('')+'</tr>';
const headers=['枠','選手','1 着','2 着','3 着','4 着','5 着','6 着','走','平均'];
const rows=racers.map(r=>[String(r.boat),r.name,'24','10','6','4','0','5','49','2.20']);
const html='<table>'+tr(headers,'th')+rows.map(r=>tr(r,'td')).join('')+'</table>';
const result=run(snapshot,html);
assert.equal(result.status,'makulabo_identity_joined',JSON.stringify(result));
assert.equal(result.racers.length,6);
assert.equal(result.racers[0].runs,49);
assert.equal(result.racers[0].firstPlaceRate,48.98);
assert.equal(result.morningScoreApplied,false);
assert.equal(result.eligibleForCalibration,false);
assert.equal(run(snapshot,html.replace('選手1','不明')).status,'held');
assert.equal(run(snapshot,html.replace('49','invalid')).status,'held');
assert.equal(run(snapshot,'').status,'held');
console.log('Offline Makulabo official snapshot runner tests passed');
