import assert from 'node:assert/strict';
import {fetchManualOfficialHistoricalResults as fetchResults} from './fetch-manual-official-historical-results.mjs';
const html='<html>'+('official result page '.repeat(10))+'</html>';
const got=await fetchResults({date:'20261118',venue:1,races:[3,7]},{fetchImpl:async(url,opts)=>{
 assert.match(url,/boatrace\.jp\/owpc\/pc\/race\/raceresult/);
 assert.equal(opts.redirect,'error');
 return {ok:true,headers:{get:()=> 'text/html; charset=utf-8'},text:async()=>html};
}});
assert.equal(got.targets,2);
assert.equal(got.pages[0].status,'raw_html_saved');
assert.equal(got.pages[0].sha256.length,64);
assert.equal(got.eligibleForHistoricalReplay,0);
await assert.rejects(()=>fetchResults({date:'20260230',venue:1,races:[1]}),/Invalid explicit/);
await assert.rejects(()=>fetchResults({date:'20261118',venue:1,races:[3,3]}),/Invalid explicit/);
const failed=await fetchResults({date:'20261118',venue:1,races:[1]},{fetchImpl:async()=>{throw Error('offline timeout')}});
assert.equal(failed.pages[0].status,'fetch_failed');
console.log('Manual historical official result fetch tests passed');
