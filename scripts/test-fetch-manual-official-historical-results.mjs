import assert from 'node:assert/strict';
import {fetchManualOfficialHistoricalResults as fetchResults, parseExplicitRaceSelection} from './fetch-manual-official-historical-results.mjs';
const html='<html>'+('official result page '.repeat(10))+'</html>';
const got=await fetchResults({date:'20261118',venue:1,races:[3,7]},{fetchImpl:async(url,opts)=>{
 assert.match(url,/boatrace\.jp\/owpc\/pc\/race\/raceresult/);
 assert.equal(opts.redirect,'error');
 return {ok:true,headers:{get:()=> 'text/html; charset=utf-8'},text:async()=>html};
}});
assert.equal(got.targets,2);
assert.equal(got.pages[0].status,'raw_html_saved');
assert.equal(got.pages[0].sha256.length,64);
assert.equal(got.pages[0].attempts,1);
assert.equal(got.eligibleForHistoricalReplay,0);
await assert.rejects(()=>fetchResults({date:'20260230',venue:1,races:[1]}),/Invalid explicit/);
await assert.rejects(()=>fetchResults({date:'20261118',venue:1,races:[3,3]}),/Invalid explicit/);
const failed=await fetchResults({date:'20261118',venue:1,races:[1]},{fetchImpl:async()=>{throw Error('offline timeout')}});
assert.equal(failed.pages[0].status,'fetch_failed');
assert.equal(failed.pages[0].attempts,3);
let calls=0;
const recovered=await fetchResults({date:'20261118',venue:1,races:[1]},{fetchImpl:async()=>{
 calls++;
 if(calls<3)throw Error('transient network failure');
 return {ok:true,status:200,headers:{get:()=> 'text/html; charset=utf-8'},text:async()=>html};
}});
assert.equal(calls,3);
assert.equal(recovered.pages[0].status,'raw_html_saved');
assert.equal(recovered.pages[0].attempts,3);
assert.deepEqual(parseExplicitRaceSelection('2,3,'),[2,3]);
assert.deepEqual(parseExplicitRaceSelection(' 2, 3, '),[2,3]);
assert.deepEqual(parseExplicitRaceSelection('2,3,,'),[2,3]);
for(const invalid of ['',',','2,,3','2,2','13','0','1,unexpected']){
 assert.throws(()=>parseExplicitRaceSelection(invalid),/Invalid explicit/);
}
console.log('Manual historical official result fetch tests passed');
