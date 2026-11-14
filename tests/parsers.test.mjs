import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync('worker.js','utf8').replace('export default {','const workerExport = {');
const context=vm.createContext({URL,Response,Request,Headers,AbortSignal,fetch:()=>{throw Error('Network disabled in unit tests')}});
vm.runInContext(source,context,{filename:'worker.js'});
const parse=vm.runInContext('extractOfficialBoatRows',context);
const heat=vm.runInContext('parseLast50Heatmap',context);
const finishParser=vm.runInContext('parseOfficialFinishOrder',context);
const rankTrifecta=vm.runInContext('rankTrifectaCandidates',context);
const validSix=[1,2,3,4,5,6].map((boat)=>({boat,score:35-boat*3}));
const picks=rankTrifecta(validSix);
assert.equal(picks.ready,true);
assert.equal(picks.main.length,6);
assert.equal(picks.upset.length,6);
const pickKeys=[...picks.main,...picks.upset].map(row=>Array.from(row).join('-'));
assert.equal(new Set(pickKeys).size,12);
assert.ok(picks.upset.every(row=>row[0]>=4));
assert.ok([...picks.main,...picks.upset].every(row=>new Set(row).size===3&&row.every(boat=>boat>=1&&boat<=6)));
assert.equal(rankTrifecta(validSix.slice(0,5)).ready,false);
assert.equal(rankTrifecta(validSix.map((row,i)=>i===5?{boat:1,score:10}:row)).ready,false);
assert.equal(rankTrifecta(validSix.map((row,i)=>i===0?{boat:1,score:NaN}:row)).ready,false);
const finishTable='<table><tr><th>着順</th><th>艇番</th></tr>'+
 [3,1,5,2,4,6].map((boat,i)=>'<tr><td>'+(i+1)+'</td><td>'+boat+'</td></tr>').join('')+'</table>';
assert.equal(finishParser(finishTable).verified,true);
assert.equal(Array.from(finishParser(finishTable).finishOrder).join('-'),'3-1-5-2-4-6');
const officialHeaderTable=finishTable.replace('<th>着順</th><th>艇番</th>','<th>着</th><th>枠</th>');
assert.equal(finishParser(officialHeaderTable).verified,true);
const nestedHeaderTable=officialHeaderTable.replace('<th>着</th><th>枠</th>','<th class="rank"><span>着</span></th><th scope="col"><span>枠</span></th>');
assert.equal(finishParser(nestedHeaderTable).verified,true);
assert.equal(Array.from(finishParser(nestedHeaderTable).finishOrder).join('-'),'3-1-5-2-4-6');
assert.equal(Array.from(finishParser(officialHeaderTable).finishOrder).join('-'),'3-1-5-2-4-6');
const wideDigits='０１２３４５６７８９';
const wideFinish=finishTable.replace(/<td>[1-6]<\/td>/g,cell=>cell.replace(/[0-9]/g,d=>wideDigits[Number(d)]));
assert.equal(finishParser(wideFinish).verified,true);
assert.equal(Array.from(finishParser(wideFinish).finishOrder).join('-'),'3-1-5-2-4-6');
assert.equal(finishParser(finishTable.replace('<td>6</td></tr>','<td>3</td></tr>')).verified,false);
assert.equal(finishParser('<table><tr><th>着順</th><th>艇番</th></tr><tr><td>1</td><td>3</td></tr></table>').verified,false);


const incidentTable='<table><tr><th>着</th><th>枠</th><th>ボートレーサー</th></tr>'+
  [['１',2],['２',6],['３',5],['４',4],['落',3],['妨',1]]
    .map(row=>'<tr><td>'+row[0]+'</td><td>'+row[1]+'</td><td>選手</td></tr>').join('')+'</table>';
const incidentResult=finishParser(incidentTable);
assert.equal(incidentResult.verified,false);
assert.equal(incidentResult.podiumVerified,true);
assert.equal(Array.from(incidentResult.podium).join('-'),'2-6-5');
assert.equal(incidentResult.finishOrder.length,0);
const duplicateIncident=finishParser(incidentTable.replace('<td>妨</td><td>1</td>','<td>妨</td><td>2</td>'));
assert.equal(duplicateIncident.podiumVerified,false);
assert.equal(finishParser(finishTable).podiumVerified,true);

const weatherParser=vm.runInContext('extractOfficialWeather',context);
const weather=weatherParser('<div>水面気象情報 16:03現在 気温 9.0℃ 雨 風速 1m 水温 13.0℃ 波高 1cm</div>');
assert.equal(weather.verified,true);
assert.equal(weather.windSpeed,1);
assert.equal(weather.waveHeight,1);
assert.equal(weather.windDirectionVerified,false);
const weatherWithDirection=weatherParser('<div>水面気象情報 風向 北北東 風速 3m 波高 2cm</div>');
assert.equal(weatherWithDirection.verified,true);
assert.equal(weatherWithDirection.windDirection,'北北東');
assert.equal(weatherWithDirection.windDirectionVerified,true);
const colonDirection=weatherParser('<div>水面気象情報 風向：南南西、風速 4m 波高 3cm</div>');
assert.equal(colonDirection.verified,true);
assert.equal(colonDirection.windDirection,'南南西');
assert.equal(colonDirection.windDirectionVerified,true);
assert.equal(weatherParser('<div>水面気象情報 風向 不明 風速 3m 波高 2cm</div>').windDirectionVerified,false);
assert.equal(weatherParser('<div>水面気象情報 風向 北北東 風速 100m 波高 2cm</div>').windDirectionVerified,false);
assert.equal(weatherParser('<div>水面気象情報 風向 北北東 風速 100m 波高 2cm</div>').windDirection,null);
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
// Regression fixture transcribed from the publicly visible 2026-11-10 Gamagori 2R heatmap.
// The 1st boat has only four runs; empty finish cells represent zero.
const publishedHeatRows=[
 [1,'高村諒',[1,0,0,1,0,2],4,4.25],
 [2,'麻生慎介',[8,12,14,9,3,3],49,2.92],
 [3,'川口貴久',[7,14,5,10,10,3],49,3.22],
 [4,'本田愛',[1,7,5,8,14,14],49,4.41],
 [5,'鈴木結平',[0,1,1,6,10,29],47,5.38],
 [6,'三浦洋次',[0,5,6,7,23,8],49,4.47]
];
const publishedHtml='<h3>枠番別ヒートマップ</h3><table>'+
 publishedHeatRows.map(([boat,name,counts,runs,average])=>
 '<tr>'+[boat,name,...counts.map(n=>n===0?'':n),runs,average.toFixed(2)].map(v=>'<td>'+v+'</td>').join('')+'</tr>').join('')+'</table>';
const publishedParsed=heat(publishedHtml);
assert.equal(publishedParsed.verified,true);
assert.equal(publishedParsed.rows.length,6);
assert.equal(publishedParsed.rows[0].runs,4);
assert.equal(publishedParsed.rows[0].counts[1],0);
assert.equal(publishedParsed.rows[4].runs,47);
assert.equal(heat(publishedHtml.replace('<td>4.25</td>','<td>4.30</td>')).verified,false);
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
const mismatchCtxIdentity=vm.createContext({URL,Response,Request,Headers,AbortSignal,
  fetch:async url=>{
    if(String(url)===makulaboUrl)return new Response(good.replace('選手1','別の選手'),{status:200,headers:{'content-type':'text/html'}});
    if(String(url)===officialUrl)return new Response(official,{status:200,headers:{'content-type':'text/html'}});
    throw Error('Unexpected mismatch URL: '+url);
  }});
vm.runInContext(source,mismatchCtxIdentity,{filename:'worker.js'});
const mismatchWorkerIdentity=vm.runInContext('workerExport',mismatchCtxIdentity);
const mismatchResponseIdentity=await mismatchWorkerIdentity.fetch(new Request('https://example.com/api/makulabo/heatmap?date=20261113&venue=1&race=1'));
assert.equal(mismatchResponseIdentity.status,200);
const mismatchPayloadIdentity=await mismatchResponseIdentity.json();
assert.equal(mismatchPayloadIdentity.last50Verified,false);
assert.equal(mismatchPayloadIdentity.last50ByBoat.length,0);
assert.equal(mismatchPayloadIdentity.dataReadyForPrediction,false);
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
assert.equal(beforePayload.weatherVerified,false);
assert.equal(beforePayload.windDirectionVerified,false);
assert.equal(beforePayload.exhibitionByBoat.length,6);
assert.equal(beforePayload.startByCourse.length,6);
assert.equal(beforePayload.dataReadyForPrediction,false);
const beforeWeatherCtx=vm.createContext({URL,Response,Request,Headers,AbortSignal,
  fetch:async url=>{
    assert.equal(String(url),beforeUrl);
    return new Response(beforeTable+beforeStart+'<div>水面気象情報 風向：西北西、風速 2m 波高 4cm</div>',{status:200});
  }});
vm.runInContext(source,beforeWeatherCtx,{filename:'worker.js'});
const beforeWeatherWorker=vm.runInContext('workerExport',beforeWeatherCtx);
const beforeWeatherResponse=await beforeWeatherWorker.fetch(new Request('https://example.com/api/official/beforeinfo?date=20261113&venue=1&race=1'));
assert.equal(beforeWeatherResponse.status,200);
const beforeWeatherPayload=await beforeWeatherResponse.json();
assert.equal(beforeWeatherPayload.weatherVerified,true);
assert.equal(beforeWeatherPayload.windDirectionVerified,true);
assert.equal(beforeWeatherPayload.weather.windDirection,'西北西');
assert.equal(beforeWeatherPayload.weather.windSpeed,2);
assert.equal(beforeWeatherPayload.weather.waveHeight,4);
assert.equal(beforeWeatherPayload.dataReadyForPrediction,false);
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
assert.equal(combinedPayload.windDirectionVerified,false);
assert.equal(combinedPayload.missingInputs.length,1);
assert.equal(combinedPayload.missingInputs[0],'windDirection');
assert.equal(combinedPayload.weather.windDirection,null);
assert.equal(combinedPayload.dataReadyForPrediction,false);
const directionalCtx=vm.createContext({URL,Response,Request,Headers,AbortSignal,
  fetch:async url=>{
    if(String(url)===officialUrl)return new Response(combinedRacelist,{status:200});
    if(String(url)===beforeUrl)return new Response(combinedBefore.replace('風速 1m','風向 北東 風速 1m'),{status:200});
    throw Error('Unexpected directional URL: '+url);
  }});
vm.runInContext(source,directionalCtx,{filename:'worker.js'});
const directionalWorker=vm.runInContext('workerExport',directionalCtx);
const directionalResponse=await directionalWorker.fetch(new Request('https://example.com/api/official/race-data?date=20261113&venue=1&race=1'));
assert.equal(directionalResponse.status,200);
const directionalPayload=await directionalResponse.json();
assert.equal(directionalPayload.weatherVerified,true);
assert.equal(directionalPayload.windDirectionVerified,true);
assert.equal(directionalPayload.missingInputs.length,0);
assert.equal(directionalPayload.weather.windDirection,'北東');
assert.equal(directionalPayload.dataReadyForPrediction,false);
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
assert.match(screenshotHtml,/id="checkRaceData"/);
assert.match(screenshotHtml,/id="raceDataStatus"/);
assert.ok(screenshotHtml.includes("document.getElementById('last50Comparison').replaceChildren()"));
assert.ok(screenshotHtml.includes('公式データ・6艇比較'));
assert.ok(screenshotHtml.includes('水面気象・確認状況'));
assert.ok(screenshotHtml.includes('公式データの不足項目：'));
assert.ok(screenshotHtml.includes('まくらぼの不足項目：'));
assert.ok(screenshotHtml.includes('ログイン・会員登録が必要な可能性'));
assert.ok(screenshotHtml.includes('ページ内で追加読み込みが必要'));
assert.ok(screenshotHtml.includes('取得ページにヒートマップが見つかりません'));
assert.ok(screenshotHtml.includes('取得できませんでした（通信または取得先の制限）'));
assert.ok(screenshotHtml.includes('直近50走の確認ができません'));
assert.ok(screenshotHtml.includes('ヒートマップの確認ができません'));

assert.ok(screenshotHtml.includes('data.missingInputs'));
assert.ok(screenshotHtml.includes("windDirection:'風向'"));
assert.ok(screenshotHtml.includes("data.weatherVerified===true?data.weather:null"));
assert.ok(screenshotHtml.includes('風向は公式データから確認できるまで未確認'));
assert.ok(screenshotHtml.includes('風速5m/s以上'));
assert.ok(screenshotHtml.includes('波高5cm以上'));
assert.ok(screenshotHtml.includes('風や波の条件を推測で補いません'));
assert.ok(screenshotHtml.includes('艇ごとの有利不利や着順を推定するものではありません'));

assert.ok(screenshotHtml.includes('totals.filter(other=>other.total>row.total).length'));
assert.ok(screenshotHtml.includes('同点なら同順位です'));
assert.ok(screenshotHtml.includes("['艇','展示進入','直近走数'"));
assert.ok(screenshotHtml.includes('row.course,row.sampleRuns'));
assert.ok(screenshotHtml.includes('展示進入と直近走数は参考表示のみで加点しません'));
assert.ok(screenshotHtml.includes('展示進入の枠なり変更：'));
assert.ok(screenshotHtml.includes('展示進入と本番進入は異なる可能性があります'));
assert.ok(screenshotHtml.includes('直近50走に満たない艇：'));
assert.ok(screenshotHtml.includes('走数が少ない成績の解釈には注意が必要です'));
assert.ok(screenshotHtml.includes('本命・逆転・穴の候補判定：保留'));
assert.ok(screenshotHtml.includes('直近走数30走未満の艇あり'));
assert.ok(screenshotHtml.includes('展示進入変更あり'));
assert.ok(screenshotHtml.includes('風向・風速・波高の確認不足'));
assert.ok(screenshotHtml.includes('仮説の検討対象：5指標首位'));
assert.ok(screenshotHtml.includes('着順予測ではありません'));
assert.ok(screenshotHtml.includes('過去レース照合用記録：日付 '));
assert.ok(screenshotHtml.includes('確定着順 未照合'));
assert.ok(screenshotHtml.includes('この記録は画面表示のみで保存されません'));
assert.ok(screenshotHtml.includes('このレースの公式確定着順と照合'));
assert.ok(screenshotHtml.includes("result.podiumVerified!==true"));
assert.ok(screenshotHtml.includes('5指標首位艇の1着一致：'));
assert.ok(screenshotHtml.includes('保存済み分析がないため一致判定は保留'));
assert.ok(screenshotHtml.includes('現在の再計算値を過去の予想として扱いません'));
assert.ok(screenshotHtml.includes('保存時点の5指標首位艇の1着一致：'));
assert.ok(screenshotHtml.includes('端末に保存した分析記録を一覧表示'));
assert.ok(screenshotHtml.includes("key.startsWith('boatScore2:snapshot:')"));
assert.ok(screenshotHtml.includes('records.slice(0,30)'));
assert.ok(screenshotHtml.includes('保存済み最大30レースを公式結果と参考照合'));
assert.ok(screenshotHtml.includes('const selected=records.slice(0,30)'));
assert.ok(screenshotHtml.includes('outerChecked++'));
assert.ok(screenshotHtml.includes('detailRows.push('));
assert.ok(screenshotHtml.includes('レース別結果：'));
assert.ok(screenshotHtml.includes('同点首位 '));
assert.ok(screenshotHtml.includes('tiedChecked++'));
assert.ok(screenshotHtml.includes('保留（公式着順未確認）'));
assert.ok(screenshotHtml.includes('保留（保存点数が不正）'));
assert.ok(screenshotHtml.includes('result.podium.join'))
assert.ok(screenshotHtml.includes('正式な事前予想的中率ではありません'));
assert.ok(screenshotHtml.includes('判定保留') || screenshotHtml.includes('／保留'));
assert.ok(screenshotHtml.includes('保存済みの有効な分析記録はありません'));
assert.ok(screenshotHtml.includes('saved.rankedScores.filter'));
assert.ok(screenshotHtml.includes('事前予想の的中率としては未検証です'));
assert.ok(screenshotHtml.includes('モーター2連率'));
assert.ok(screenshotHtml.includes("'1着率','3連対率'"));
assert.ok(screenshotHtml.includes('row.counts[0]/row.runs*100'));
assert.ok(screenshotHtml.includes('参考比較（直近走数ベース）'));
assert.ok(screenshotHtml.includes('枠・相手関係・展示・風などを反映した予想順位ではありません'));
assert.ok(screenshotHtml.includes('const sortedByFirst='));
assert.ok(screenshotHtml.includes('const sortedByTop3='));
assert.ok(screenshotHtml.includes('実験的な5指標比較（予想ではありません）'));
assert.ok(screenshotHtml.includes('公式データの艇番・選手ID・進入の対応を確認できません'));
assert.ok(screenshotHtml.includes('公式の出走表・勝率とモーター・展示・進入/STのいずれかが未確認'));
assert.ok(screenshotHtml.includes('stat.motor.secondPlaceRate<=100'));
assert.ok(screenshotHtml.includes('st.startTiming>=0&&st.startTiming<=1'));

assert.ok(screenshotHtml.includes('String(stat.racerId)===String(racer.racerId)'));
assert.ok(screenshotHtml.includes('new Set(data.startByCourse.map(row=>row.course)).size===6'));

assert.ok(screenshotHtml.includes('5指標比較は未表示：公式データの数値'));
assert.ok(screenshotHtml.includes('まくらぼ直近50走が未確認のため'));
assert.ok(screenshotHtml.includes('まくらぼ直近50走の集計が不整合です'));

assert.ok(screenshotHtml.includes('scroll.appendChild(table);comparison.appendChild(scroll)'));

assert.ok(screenshotHtml.includes('同値は同点順位の平均点を付与'));
assert.ok(screenshotHtml.includes('全国勝率点'));
assert.ok(screenshotHtml.includes('展示ST点'));
assert.ok(screenshotHtml.includes('直近3連対点'));
assert.ok(screenshotHtml.includes('scoreScroll.appendChild(table);comparison.appendChild(scoreScroll)'));

assert.ok(screenshotHtml.includes('ordered[end][key]===ordered[i][key]'));
assert.ok(screenshotHtml.includes('points.set(ordered[j].boat,averagePoints)'));

assert.ok(screenshotHtml.includes('data.statsVerified===true&&data.exhibitionVerified===true&&data.startVerified===true'));
assert.ok(screenshotHtml.includes('買い目には使わないでください'));
assert.ok(screenshotHtml.includes("['win',false],['motor',false],['time',true],['st',true],['top3',false]"));

assert.ok(screenshotHtml.includes('Number.isInteger(row.runs)&&row.runs>0'));
assert.ok(screenshotHtml.includes('row.counts.reduce((sum,n)=>sum+n,0)===row.runs'));
assert.ok(screenshotHtml.includes('new Set(makulabo.last50ByBoat.map(row=>row.boat)).size===6'));

assert.ok(screenshotHtml.includes('(row.counts[0]+row.counts[1]+row.counts[2])/row.runs*100'));

assert.ok(screenshotHtml.includes('展示STは本番のSTではありません'));
assert.ok(screenshotHtml.includes("data.statsVerified===true?data.statsByBoat:[]"));

assert.ok(screenshotHtml.includes("function clearOfficialRacerAutofill()"));

assert.ok(screenshotHtml.includes("'/api/official/race-data?'"));
assert.ok(screenshotHtml.includes("['選手',data.racersVerified]"));
assert.ok(screenshotHtml.includes("['まくらぼ50走',makulabo?.last50Verified]"));
assert.ok(screenshotHtml.includes("['まくらぼヒートマップ',makulabo?.heatmapReadyForAnalysis]"));
assert.ok(screenshotHtml.includes("不足項目があるため予想は保留"));

assert.match(screenshotHtml,/\/api\/official\/racers\?/);
assert.match(screenshotHtml,/racersByBoatVerified!==true/);
assert.match(screenshotHtml,/racerId/);
assert.match(screenshotHtml,/id="set50"/);
assert.match(screenshotHtml,/id="countStatus"/);
assert.match(screenshotHtml,/着順合計/);
assert.match(screenshotHtml,/count===total/);
assert.match(screenshotHtml,/着順回数の合計と走数が一致しません/);
assert.match(screenshotHtml,/r\.finishCounts\.reduce/);
assert.match(screenshotHtml,/公式選手番号：6艇一致/);
const inlineScripts=[...screenshotHtml.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)].map(m=>m[1]);
assert.equal(inlineScripts.length,1,'Screenshot page should have one inline script');
for(const script of inlineScripts)new vm.Script(script,{filename:'screenshot-review-inline.js'});
const venueOptions=[...screenshotHtml.matchAll(/<option value="(\d+)">([^<]+)<\/option>/g)];
assert.equal(venueOptions.length,24);
assert.deepEqual(venueOptions.map(m=>Number(m[1])),Array.from({length:24},(_,i)=>i+1));
assert.equal(venueOptions[0][2],'桐生');
assert.equal(venueOptions[15][2],'児島');
assert.equal(venueOptions[23][2],'大村');
assert.match(screenshotHtml,/grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
assert.match(screenshotHtml,/document\.createElement\('fieldset'\)/);
assert.match(screenshotHtml,/rows\.appendChild\(card\)/);
assert.doesNotMatch(screenshotHtml,/<tbody id="rows">/);
assert.ok(screenshotHtml.includes("timeZone:'Asia/Tokyo'"));
assert.ok(screenshotHtml.includes("document.getElementById('date').value=japanToday"));
assert.ok(screenshotHtml.includes('id="checkVenue"'));
assert.ok(screenshotHtml.includes("document.getElementById('checkVenue').addEventListener"));
assert.ok(screenshotHtml.includes("非開催とは断定できません"));
assert.ok(screenshotHtml.includes("race:'1'"));
assert.ok(screenshotHtml.includes('id="checkAllVenues"'));
assert.ok(screenshotHtml.includes('id="checkSchedule"'));
assert.ok(screenshotHtml.includes('id="scheduleStatus"'));
assert.ok(screenshotHtml.includes("document.getElementById('checkSchedule').addEventListener"));
assert.ok(screenshotHtml.includes("'/api/official/schedule?'"));
assert.ok(screenshotHtml.includes("開催確定や選択制限には使用しません"));
assert.ok(screenshotHtml.includes("日付が変更されました。開催一覧の候補を再確認してください"));

assert.ok(screenshotHtml.includes("offset+=4"));
assert.ok(screenshotHtml.includes("Promise.all(batch.map"));
assert.ok(screenshotHtml.includes("未確認は非開催を意味しません"));
assert.ok(screenshotHtml.includes("o.disabled=false"));
assert.ok(screenshotHtml.includes("finally{button.disabled=false}"));
assert.ok(screenshotHtml.includes("button.disabled=true"));
assert.ok(screenshotHtml.includes("document.getElementById('date').addEventListener('input'"));
assert.ok(screenshotHtml.includes("日付が変更されました。24場を再確認してください"));
assert.ok(screenshotHtml.includes("日付が変更されました。開催情報は未確認です"));
assert.ok(screenshotHtml.includes('let venueCheckVersion=0'));
assert.ok(screenshotHtml.includes('venueCheckVersion++;'));
assert.ok(screenshotHtml.includes('const currentCheck=++venueCheckVersion'));
assert.ok(screenshotHtml.includes('if(currentCheck!==venueCheckVersion)return'));
assert.ok(screenshotHtml.includes("function clearOfficialRacerAutofill()"));
assert.ok(screenshotHtml.includes("input.dataset.officialAutofilled==='true'"));
assert.ok(screenshotHtml.includes("['date','venue','race']"));
assert.ok(screenshotHtml.includes("input.dataset.officialAutofilled='true'"));
assert.ok(screenshotHtml.includes('let racerFillVersion=0'));
assert.ok(screenshotHtml.includes('const fillVersion=++racerFillVersion'));
assert.ok(screenshotHtml.includes('if(fillVersion!==racerFillVersion'));
assert.ok(screenshotHtml.includes('racerFillVersion++;delete input.dataset.officialAutofilled'));
assert.ok(screenshotHtml.includes('id="showConfirmedOnly"'));
assert.ok(screenshotHtml.includes('function filterConfirmedVenues()'));
assert.ok(screenshotHtml.includes("const hide=only&&!option.textContent.includes('（公式1R確認済）')"));
assert.ok(screenshotHtml.includes('option.hidden=hide;option.disabled=hide'));
assert.ok(screenshotHtml.includes("filterConfirmedVenues();"));
const scheduleUrl='https://www.boatrace.jp/owpc/pc/race/index?hd=20261113';
let scheduleFetchCount=0;
const scheduleCtx=vm.createContext({URL,Response,Request,Headers,AbortSignal,fetch:async url=>{
  assert.equal(String(url),scheduleUrl);scheduleFetchCount++;
  return new Response('<h3>11月13日のレース情報</h3><a href="/owpc/pc/race/racelist?jcd=16&amp;hd=20261113">児島</a><a href="/owpc/pc/race/racelist?jcd=01&amp;hd=20261113">桐生</a><a href="/owpc/pc/race/racelist?jcd=16&amp;hd=20261113">重複</a><a href="/owpc/pc/race/racelist?jcd=24&amp;hd=20261112">別日</a>');
}});
vm.runInContext(source,scheduleCtx,{filename:'worker.js'});
const scheduleWorker=vm.runInContext('workerExport',scheduleCtx);
const scheduleResponse=await scheduleWorker.fetch(new Request('https://example.com/api/official/schedule?date=20261113'));
assert.equal(scheduleResponse.status,200);
const scheduleData=await scheduleResponse.json();
assert.equal(scheduleData.verified,false);
assert.deepEqual(scheduleData.venues,[1,16]);
assert.equal(scheduleData.linkCount,4);
const mismatchedScheduleCtx=vm.createContext({URL,Response,Request,Headers,AbortSignal,fetch:async()=>new Response('<h3>11月12日のレース情報</h3><a href="/owpc/pc/race/racelist?jcd=16&amp;hd=20261113">児島</a>')});
vm.runInContext(source,mismatchedScheduleCtx,{filename:'worker.js'});
const mismatchedScheduleWorker=vm.runInContext('workerExport',mismatchedScheduleCtx);
const mismatchedScheduleResponse=await mismatchedScheduleWorker.fetch(new Request('https://example.com/api/official/schedule?date=20261113'));
const mismatchedScheduleData=await mismatchedScheduleResponse.json();
assert.equal(mismatchedScheduleData.verified,false);
assert.deepEqual(mismatchedScheduleData.venues,[]);
assert.match(mismatchedScheduleData.reason,/heading does not match/);
const invalidSchedule=await scheduleWorker.fetch(new Request('https://example.com/api/official/schedule?date=invalid'));
assert.equal(invalidSchedule.status,400);
assert.equal(scheduleFetchCount,1);
const badCombined=await combinedWorker.fetch(new Request('https://example.com/api/official/race-data?date=20261113&venue=99&race=1'));
assert.equal(badCombined.status,400);
const invalidBefore=await beforeWorker.fetch(new Request('https://example.com/api/official/beforeinfo?date=20261113&venue=25&race=1'));
assert.equal(invalidBefore.status,400);
const invalidOfficial=await worker.fetch(new Request('https://example.com/api/official/racers?date=20261113&venue=99&race=1'));
assert.equal(invalidOfficial.status,400);
assert.equal(fetchCalls.length,3);
console.log('Boat Score 2 mocked endpoint tests passed');

assert.ok(source.includes('diagnostics:{upstreamStatus:upstream.status'));
assert.ok(source.includes('htmlBytes:html.length'));
assert.ok(source.includes('tableCount:'));
assert.ok(source.includes('hasResultHeading:'));

const resultUrl='https://www.boatrace.jp/owpc/pc/race/raceresult?rno=1&jcd=01&hd=20261113';
const resultContext=vm.createContext({URL,Response,Request,Headers,AbortSignal,
  fetch:async url=>{
    assert.equal(String(url),resultUrl);
    return new Response('<html>'+nestedHeaderTable+'</html>',{status:200,headers:{'content-type':'text/html'}});
  }});
vm.runInContext(source,resultContext,{filename:'worker.js'});
const resultWorker=vm.runInContext('workerExport',resultContext);
const resultResponse=await resultWorker.fetch(new Request('https://example.com/api/official/result?date=20261113&venue=1&race=1'));
assert.equal(resultResponse.status,200);
const resultBody=await resultResponse.json();
assert.equal(resultBody.verified,true);
assert.deepEqual(resultBody.finishOrder,[3,1,5,2,4,6]);
assert.equal(resultBody.diagnostics.upstreamStatus,200);
assert.equal(resultBody.diagnostics.tableCount,1);
assert.equal(resultBody.diagnostics.hasResultHeading,true);
assert.equal(resultBody.dataReadyForPrediction,false);
const resultBadResponse=await resultWorker.fetch(new Request('https://example.com/api/official/result?date=bad&venue=1&race=1'));
assert.equal(resultBadResponse.status,400);
const resultMissingContext=vm.createContext({URL,Response,Request,Headers,AbortSignal,
  fetch:async()=>new Response('<html><p>No result yet</p></html>',{status:200})});
vm.runInContext(source,resultMissingContext,{filename:'worker.js'});
const resultMissingWorker=vm.runInContext('workerExport',resultMissingContext);
const resultMissingResponse=await resultMissingWorker.fetch(new Request('https://example.com/api/official/result?date=20261113&venue=1&race=1'));
const resultMissingBody=await resultMissingResponse.json();
assert.equal(resultMissingBody.verified,false);
assert.equal(resultMissingBody.reason,'result_table_missing');
assert.equal(resultMissingBody.diagnostics.tableCount,0);

const incidentEndpointContext=vm.createContext({URL,Response,Request,Headers,AbortSignal,
  fetch:async url=>{
    assert.equal(String(url),resultUrl);
    return new Response('<html>'+incidentTable+'</html>',{status:200,headers:{'content-type':'text/html'}});
  }});
vm.runInContext(source,incidentEndpointContext,{filename:'worker.js'});
const incidentEndpointWorker=vm.runInContext('workerExport',incidentEndpointContext);
const incidentEndpointResponse=await incidentEndpointWorker.fetch(new Request('https://example.com/api/official/result?date=20261113&venue=1&race=1'));
const incidentEndpointBody=await incidentEndpointResponse.json();
assert.equal(incidentEndpointBody.verified,false);
assert.equal(incidentEndpointBody.podiumVerified,true);
assert.deepEqual(incidentEndpointBody.podium,[2,6,5]);
assert.deepEqual(incidentEndpointBody.finishOrder,[]);
assert.equal(incidentEndpointBody.reason,'result_rows_incomplete_or_nonstandard');
assert.equal(incidentEndpointBody.dataReadyForPrediction,false);

const resultHttpErrorContext=vm.createContext({URL,Response,Request,Headers,AbortSignal,
  fetch:async()=>new Response('Unavailable',{status:503})});
vm.runInContext(source,resultHttpErrorContext,{filename:'worker.js'});
const resultHttpErrorWorker=vm.runInContext('workerExport',resultHttpErrorContext);
const resultHttpErrorResponse=await resultHttpErrorWorker.fetch(new Request('https://example.com/api/official/result?date=20261113&venue=1&race=1'));
const resultHttpErrorBody=await resultHttpErrorResponse.json();
assert.equal(resultHttpErrorBody.verified,false);
assert.equal(resultHttpErrorBody.reason,'official_result_http_error');
assert.equal(resultHttpErrorBody.upstreamStatus,503);
const resultNetworkErrorContext=vm.createContext({URL,Response,Request,Headers,AbortSignal,
  fetch:async()=>{throw Error('Simulated upstream network failure')}});
vm.runInContext(source,resultNetworkErrorContext,{filename:'worker.js'});
const resultNetworkErrorWorker=vm.runInContext('workerExport',resultNetworkErrorContext);
const resultNetworkErrorResponse=await resultNetworkErrorWorker.fetch(new Request('https://example.com/api/official/result?date=20261113&venue=1&race=1'));
const resultNetworkErrorBody=await resultNetworkErrorResponse.json();
assert.equal(resultNetworkErrorBody.verified,false);
assert.equal(resultNetworkErrorBody.reason,'official_result_fetch_failed');
assert.deepEqual(resultNetworkErrorBody.finishOrder,[]);
