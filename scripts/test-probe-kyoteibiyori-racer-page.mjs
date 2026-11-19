import assert from 'node:assert/strict';
import {inspectRacerPageHtml,probePublicRacerPage} from './probe-kyoteibiyori-racer-page.mjs';
const html='<html><body>データ取得中です。 ※集計期間は直近6カ月です。<script src="/assets/racer.js"></script></body></html>';
const inspected=inspectRacerPageHtml(html);
assert.equal(inspected.loadingMessagePresent,true);
assert.equal(inspected.recentSixMonthDisclaimer,true);
assert.equal(inspected.sameOriginScriptCount,1);
assert.equal(inspected.automatedRegistrationSearchConfirmed,false);
const report=await probePublicRacerPage('20261119',{fetchImpl:async(url,options)=>{
 assert.match(url,/hiduke=20261119/);
 assert.equal(options.redirect,'error');
 return {ok:true,status:200,headers:{get:()=> 'text/html; charset=utf-8'},text:async()=>html};
}});
assert.equal(report.eligibleForHistoricalScoreReplay,false);
assert.throws(()=>probePublicRacerPage('20260230'),/Invalid calendar date/);
await assert.rejects(()=>probePublicRacerPage('20261119',{fetchImpl:async()=>({ok:false,status:403,headers:{get:()=> 'text/html'}})}),/Unexpected page response/);
console.log('Kyoteibiyori public racer page probe tests passed');
