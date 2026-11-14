import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync('worker.js','utf8').replace('export default {','const workerExport = {');
const context=vm.createContext({URL,Response,Request,Headers,AbortSignal,fetch:()=>{throw Error('Network disabled in unit tests')}});
vm.runInContext(source,context,{filename:'worker.js'});
const parse=vm.runInContext('extractOfficialBoatRows',context);
const heat=vm.runInContext('parseLast50Heatmap',context);

const weatherParser=vm.runInContext('extractOfficialWeather',context);
const weather=weatherParser('<div>水面気象情報 16:03現在 気温 9.0℃ 雨 風速 1m 水温 13.0℃ 波高 1cm</div>');
assert.equal(weather.verified,true);
assert.equal(weather.windSpeed,1);
assert.equal(weather.waveHeight,1);
assert.equal(weather.windDirectionVerified,false);
assert.equal(weatherParser('<div>水面気象情報 風速 100m 波高 1cm</div>').verified,false);
const startParser=vm.runInContext('extractOfficialStartExhibition',context);
const startTable='<table><tr><th>スタート展示</th></tr>'+
  Array.from({length:6},(_,i)=>'<tr><td colspan="3"><div>'+(i+1)+'</div><span>.'+String(i+1).padStart(2,'0')+'</span></td></tr>').join('')+'</table>';
assert.equal(startParser(startTable).verified,true);
assert.equal(startParser(startTable).rows[0].startTiming,0.01);
assert.equal(startParser(startTable).rows[5].course,6);
assert.equal(startParser(startTable.replace('<div>6</div>','<div>5</div>')).verified,false);
const exhibitionParser=vm.runInContext('extractOfficialExhibition',context);
const exhibitionHtml='<table><tr><th>展示<br>タイム</th><th>チルト</th></tr>'+
  Array.from({length:6},(_,i)=>'<tr><td>'+(i+1)+'</td><td></td><td>選手'+(i+1)+'</td><td>52.0kg</td><td>6.58</td><td>0.0</td></tr>').join('')+'</table>';
assert.equal(exhibitionParser(exhibitionHtml).verified,true);
assert.equal(exhibitionParser(exhibitionHtml).rows[0].exhibitionTime,6.58);
const stats=vm.runInContext('extractOfficialBoatStats',context);
const officialStatRows='<table>'+Array.from({length:6},(_,i)=>'<tr><td>'+(i+1)+'</td><td></td><td>400'+(i+1)+' / B1 選手'+(i+1)+'</td><td>F0 L0 0.18</td><td>3.77 11.43 28.57</td><td>2.25 0.00 12.50</td><td>35 19.61 37.25</td><td>27 26.92 48.08</td><td><a href="/owpc/pc/data/racersearch/profile?toban=400'+(i+1)+'">選手'+(i+1)+'</a></td></tr>').join('')+'</table>';
assert.equal(stats(officialStatRows).verified,true);
assert.equal(stats(officialStatRows).rows[0].motor.secondPlaceRate,19.61);
assert.equal(stats(officialStatRows.replace('19.61','119.61')).verified,false);

const row=(boat,id,name)=>'<tr><td>'+boat+'</td><td><a href="/owpc/pc/data/racersearch/profile?toban='+id+'">'+name+'</a></td></tr>';
const official='<table>'+Array.from({length:6},(_,i)=>row(i+1,4001+i,'選手'+(i+1))).join('')+'</table>';
assert.equal(parse(official).verified,true);
assert.equal(parse(official).racers.length,6);
assert.equal(parse(official.replace('<td>1</td>','<td>１</td>')).verified,true);
assert.equal(parse(official.replace('toban=4006','toban=4001')).verified,false);
assert.equal(parse(official.replace('<td>6</td>','<td>5</td>')).verified,false);
const heatRow=(boat,name,counts)=>{const n=counts.reduce((a,b)=>a+b,0);const avg=(counts.reduce((a,b,i)=>a+b*(i+1),0)/n).toFixed(2);return '<tr>'+[boat,name,...counts,n,avg].map(x=>'<td>'+x+'</td>').join('')+'</tr>';};
const good='<h2>枠番別ヒートマップ</h2><table>'+Array.from({length:6},(_,i)=>heatRow(i+1,'選手'+(i+1),[10,10,10,10,5,5])).join('')+'</table>';
assert.equal(heat(good).verified,true);
assert.equal(heat(good.replace('<td>50</td>','<td>49</td>')).verified,false);
assert.equal(heat(good.replace('<td>3.10</td>','<td>1.00</td>')).verified,false);
assert.equal(heat('<p>ログインしてください</p>').verified,false);
console.log('Boat Score 2 synthetic parser tests passed');

const officialUrl='https://www.boatrace.jp/owpc/pc/race/racelist?rno=1&jcd=01&hd=20261113';
const makulaboUrl='https://makulabo-jp.com/data/01/1?hd=20261113';
const fetchCalls=[];
const mockFetch=async url=>{
  const target=String(url); fetchCalls.push(target);
  if(target===makulaboUrl) return new Response(good,{status:200,headers:{'content-type':'text/html'}});
  if(target===officialUrl) return new Response(official,{status:200,headers:{'content-type':'text/html'}});
  throw Error('Unexpected fetch URL: '+target);
};
const ctx2=vm.createContext({URL,Response,Request,Headers,AbortSignal,fetch:mockFetch});
vm.runInContext(source,ctx2,{filename:'worker.js'});
const worker=vm.runInContext('workerExport',ctx2);
const response=await worker.fetch(new Request('https://example.com/api/makulabo/heatmap?date=20261113&venue=1&race=1'));
assert.equal(response.status,200);
const payload=await response.json();
assert.equal(payload.last50Verified,true);
assert.equal(payload.last50ByBoat.length,6);
assert.equal(payload.dataReadyForPrediction,false);
assert.equal(fetchCalls.length,2);
const invalid=await worker.fetch(new Request('https://example.com/api/makulabo/heatmap?date=20261113&venue=25&race=1'));
assert.equal(invalid.status,400);
assert.equal(fetchCalls.length,2);
const loadingCtx=vm.createContext({URL,Response,Request,Headers,AbortSignal,
  fetch:async url=>{
    assert.equal(String(url),makulaboUrl);
    return new Response('<h2>桐生 1 R</h2><div>ヒートマップ 読み込み中</div>',{status:200,headers:{'content-type':'text/html'}});
  }});
vm.runInContext(source,loadingCtx,{filename:'worker.js'});
const loadingWorker=vm.runInContext('workerExport',loadingCtx);
const loadingResponse=await loadingWorker.fetch(new Request('https://example.com/api/makulabo/heatmap?date=20261113&venue=1&race=1'));
const loadingPayload=await loadingResponse.json();
assert.equal(loadingPayload.reason,'heatmap_requires_client_side_rendering');
assert.equal(loadingPayload.last50Verified,false);
assert.equal(loadingPayload.dataReadyForPrediction,false);
const officialEndpoint=await worker.fetch(new Request('https://example.com/api/official/racers?date=20261113&venue=1&race=1'));
assert.equal(officialEndpoint.status,200);
const officialPayload=await officialEndpoint.json();
assert.equal(officialPayload.racersByBoatVerified,true);
assert.equal(officialPayload.racersByBoat.length,6);
assert.equal(officialPayload.dataReadyForPrediction,false);
const beforeUrl='https://www.boatrace.jp/owpc/pc/race/beforeinfo?rno=1&jcd=01&hd=20261113';
const beforeTable='<table><tr><th>展示<br>タイム</th><th>チルト</th></tr>'+
  Array.from({length:6},(_,i)=>'<tr><td>'+(i+1)+'</td><td></td><td>選手'+(i+1)+'</td><td>52.0kg</td><td>6.58</td><td>0.0</td></tr>').join('')+'</table>';
const beforeStart='<table><tr><th>スタート展示</th></tr>'+
  Array.from({length:6},(_,i)=>'<tr><td colspan="3">'+(i+1)+' .0'+(i+1)+'</td></tr>').join('')+'</table>';
const ctx3=vm.createContext({URL,Response,Request,Headers,AbortSignal,
  fetch:async url=>{assert.equal(String(url),beforeUrl);return new Response(beforeTable+beforeStart,{status:200});}});
vm.runInContext(source,ctx3,{filename:'worker.js'});
const beforeWorker=vm.runInContext('workerExport',ctx3);
const beforeResponse=await beforeWorker.fetch(new Request('https://example.com/api/official/beforeinfo?date=20261113&venue=1&race=1'));
assert.equal(beforeResponse.status,200);
const beforePayload=await beforeResponse.json();
assert.equal(beforePayload.exhibitionVerified,true);
assert.equal(beforePayload.startVerified,true);
assert.equal(beforePayload.exhibitionByBoat.length,6);
assert.equal(beforePayload.startByCourse.length,6);
assert.equal(beforePayload.dataReadyForPrediction,false);
const combinedRacelist='<table>'+Array.from({length:6},(_,i)=>
  '<tr><td>'+(i+1)+'</td><td></td><td>400'+(i+1)+' / B1 選手'+(i+1)+'</td>'+
  '<td>F0 L0 0.18</td><td>3.77 11.43 28.57</td><td>2.25 0.00 12.50</td>'+
  '<td>35 19.61 37.25</td><td>27 26.92 48.08</td>'+
  '<td><a href="/owpc/pc/data/racersearch/profile?toban=400'+(i+1)+'">選手'+(i+1)+'</a></td></tr>').join('')+'</table>';
const combinedBefore=beforeTable+beforeStart+
  '<div>水面気象情報 16:03現在 気温 9.0℃ 風速 1m 水温 13.0℃ 波高 1cm</div>';
const combinedFetch=async url=>{
  if(String(url)===officialUrl)return new Response(combinedRacelist,{status:200});
  if(String(url)===beforeUrl)return new Response(combinedBefore,{status:200});
  throw Error('Unexpected combined URL: '+url);
};
const ctx4=vm.createContext({URL,Response,Request,Headers,AbortSignal,fetch:combinedFetch});
vm.runInContext(source,ctx4,{filename:'worker.js'});
const combinedWorker=vm.runInContext('workerExport',ctx4);
const combinedResponse=await combinedWorker.fetch(new Request('https://example.com/api/official/race-data?date=20261113&venue=1&race=1'));
assert.equal(combinedResponse.status,200);
const combinedPayload=await combinedResponse.json();
assert.equal(combinedPayload.status,'official_sources_verified');
assert.equal(combinedPayload.racersVerified,true);
assert.equal(combinedPayload.statsVerified,true);
assert.equal(combinedPayload.exhibitionVerified,true);
assert.equal(combinedPayload.startVerified,true);
assert.equal(combinedPayload.weatherVerified,true);
assert.equal(combinedPayload.dataReadyForPrediction,false);
const mismatchCtx=vm.createContext({URL,Response,Request,Headers,AbortSignal,
  fetch:async url=>{
    if(String(url)===officialUrl)return new Response(combinedRacelist,{status:200});
    if(String(url)===beforeUrl)return new Response(combinedBefore.replace('選手1','別人'),{status:200});
    throw Error('Unexpected mismatch URL: '+url);
  }});
vm.runInContext(source,mismatchCtx,{filename:'worker.js'});
const mismatchWorker=vm.runInContext('workerExport',mismatchCtx);
const mismatchResponse=await mismatchWorker.fetch(new Request('https://example.com/api/official/race-data?date=20261113&venue=1&race=1'));
const mismatchPayload=await mismatchResponse.json();
assert.equal(mismatchPayload.exhibitionVerified,false);
assert.equal(mismatchPayload.exhibitionByBoat.length,0);
assert.equal(mismatchPayload.dataReadyForPrediction,false);
const missingStartCtx=vm.createContext({URL,Response,Request,Headers,AbortSignal,
  fetch:async url=>{
    if(String(url)===officialUrl)return new Response(combinedRacelist,{status:200});
    if(String(url)===beforeUrl)return new Response(combinedBefore.replace('<td colspan="3">6 .06</td>','<td colspan="3">5 .06</td>'),{status:200});
    throw Error('Unexpected start URL: '+url);
  }});
vm.runInContext(source,missingStartCtx,{filename:'worker.js'});
const missingStartWorker=vm.runInContext('workerExport',missingStartCtx);
const missingStartResponse=await missingStartWorker.fetch(new Request('https://example.com/api/official/race-data?date=20261113&venue=1&race=1'));
const missingStartPayload=await missingStartResponse.json();
assert.equal(missingStartPayload.startVerified,false);
assert.equal(missingStartPayload.startByCourse.length,0);
assert.equal(missingStartPayload.dataReadyForPrediction,false);
const reviewedRows=Array.from({length:6},(_,i)=>({boat:i+1,racerId:String(4001+i),sampleSize:10,finishCounts:[2,2,2,2,1,1]}));
const reviewUrl='https://example.com/api/makulabo/screenshot-review';
const reviewRequest=rows=>new Request(reviewUrl,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({date:'20261113',venue:1,race:1,rows})});
const acceptedReview=await combinedWorker.fetch(reviewRequest(reviewedRows));
const acceptedReviewPayload=await acceptedReview.json();
assert.equal(acceptedReviewPayload.identityVerified,true);
assert.equal(acceptedReviewPayload.rows.length,6);
assert.equal(acceptedReviewPayload.makulaboLast50Verified,false);
const wrongReview=reviewedRows.map((r,i)=>i===0?{...r,racerId:'9999'}:r);
const rejectedReview=await combinedWorker.fetch(reviewRequest(wrongReview));
const rejectedReviewPayload=await rejectedReview.json();
assert.equal(rejectedReviewPayload.identityVerified,false);
assert.equal(rejectedReviewPayload.rows.length,0);
const invalidReview=await combinedWorker.fetch(reviewRequest(reviewedRows.map((r,i)=>i===0?{...r,sampleSize:50}:r)));
assert.equal(invalidReview.status,400);
const screenshotPage=await combinedWorker.fetch(new Request('https://example.com/tools/makulabo-screenshot'));
assert.equal(screenshotPage.status,200);
assert.match(screenshotPage.headers.get('content-type'),/text\/html/);
const screenshotHtml=await screenshotPage.text();
assert.match(screenshotHtml,/type="file" accept="image\/\*"/);
assert.match(screenshotHtml,/\/api\/makulabo\/screenshot-review/);
assert.match(screenshotHtml,/URL\.createObjectURL/);
assert.match(screenshotHtml,/画像はサーバーへ送信しません/);
assert.match(screenshotHtml,/id="zoomIn"/);
assert.match(screenshotHtml,/id="zoomOut"/);
assert.match(screenshotHtml,/id="zoomReset"/);
assert.match(screenshotHtml,/Math\.min\(4,/);
assert.match(screenshotHtml,/touch-action:pan-x pan-y/);
assert.match(screenshotHtml,/id="fillRacers"/);
assert.match(screenshotHtml,/\/api\/official\/racers\?/);
assert.match(screenshotHtml,/racersByBoatVerified!==true/);
assert.match(screenshotHtml,/racerId/);
const badCombined=await combinedWorker.fetch(new Request('https://example.com/api/official/race-data?date=20261113&venue=99&race=1'));
assert.equal(badCombined.status,400);
const invalidBefore=await beforeWorker.fetch(new Request('https://example.com/api/official/beforeinfo?date=20261113&venue=25&race=1'));
assert.equal(invalidBefore.status,400);
const invalidOfficial=await worker.fetch(new Request('https://example.com/api/official/racers?date=20261113&venue=99&race=1'));
assert.equal(invalidOfficial.status,400);
assert.equal(fetchCalls.length,3);
console.log('Boat Score 2 mocked endpoint tests passed');
