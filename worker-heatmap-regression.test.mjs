import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
const source=readFileSync(new URL('./worker.js',import.meta.url),'utf8');
const context=vm.createContext({});
vm.runInContext(source.replace('export default {','const worker = {'),context);
const row=(counts)=>'<tr><td>1</td><td>山田太郎</td>'+counts.map(x=>'<td>'+x+'</td>').join('')+'</tr>';
const page=(rows)=>'枠番別ヒートマップ <table>'+rows.join('')+'</table>';
const extract=(rows)=>context.extractHeatmapRows(page(rows)).find(r=>r.name==='山田太郎');
test('explicit zero remains zero',()=>{assert.deepEqual(Array.from(extract([row([0,2,3,4,5,6])]).counts),[0,2,3,4,5,6]);});
test('blank is not zero',()=>{assert.equal(extract([row(['',2,3,4,5,6])]).counts,null);});
test('duplicate rows are rejected',()=>{const r=row([0,2,3,4,5,6]);assert.equal(extract([r,r]).reason,'duplicate_rows');});

test('unverified official identity is rejected',()=>{assert.equal(context.verifyHeatmapBoats(page([row([0,2,3,4,5,6])]),{verified:false,racers:[]}).length,0);});
test('official fetch failure is not treated as verified',async()=>{
 context.URL=URL; context.AbortSignal=AbortSignal;
 context.fetch=async()=>{throw new Error('network unavailable');};
 const result=await context.fetchOfficialRacers('20261124','07','1');
 assert.equal(result.verified,false);
 assert.equal(result.racers.length,0);
});
test('non HTML response is rejected',async()=>{
 context.URL=URL; context.AbortSignal=AbortSignal;
 context.fetch=async()=>({ok:true,headers:{get:()=> 'application/json'}});
 const result=await context.fetchOfficialRacers('20261124','07','1');
 assert.equal(result.verified,false);
 assert.equal(result.reason,'invalid_content_type');
});
