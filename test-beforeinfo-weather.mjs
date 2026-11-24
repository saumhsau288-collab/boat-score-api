import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
const source=readFileSync(new URL('./worker.js',import.meta.url),'utf8');
const a=source.indexOf('function extractOfficialWeather(');
const b=source.indexOf('function extractOfficialStartExhibition(',a);
assert.ok(a>=0&&b>a);
const parse=vm.runInNewContext(source.slice(a,b)+'\nextractOfficialWeather');
const page=(body)=>'<section>水面気象情報 '+body+'</section>';
test('explicit text direction',()=>assert.equal(parse(page('風向 北東 風速 3m 波高 2cm')).windDirection,'北東'));
test('image alt direction',()=>assert.equal(parse(page('<img alt="北東"> 風速 3m 波高 2cm')).windDirection,'北東'));
test('zero is valid',()=>{const r=parse(page('風速 0m 波高 0cm'));assert.equal(r.verified,true);assert.equal(r.windSpeed,0);assert.equal(r.waveHeight,0);});
test('missing speed is not zero',()=>assert.equal(parse(page('波高 0cm')).verified,false));
test('icon alone does not identify direction',()=>assert.equal(parse(page('<img src="north.png"> 風速 3m 波高 2cm')).windDirection,null));
test('conflicting image directions are rejected',()=>assert.equal(parse(page('<img alt="北"><img alt="南"> 風速 3m 波高 2cm')).windDirection,null));
test('out of range speed rejected',()=>assert.equal(parse(page('風速 99m 波高 2cm')).verified,false));

const cacheStart=source.indexOf('const verifiedBeforeinfoCache=');
const cacheEnd=source.indexOf('// Short-lived per-isolate deduplication',cacheStart);
assert.ok(cacheStart>=0&&cacheEnd>cacheStart);
const cache=vm.runInNewContext(source.slice(cacheStart,cacheEnd)+'\n({saveVerifiedBeforeinfo,getVerifiedBeforeinfo,readSharedVerifiedBeforeinfo,writeSharedVerifiedBeforeinfo})');
const six={verified:true,rows:Array.from({length:6},(_,i)=>({boat:i+1}))};
const weather={verified:true,windDirectionVerified:true,windDirection:'北東',windSpeed:0,waveHeight:0};
test('memory cache preserves verified weather and exact race',()=>{
 cache.saveVerifiedBeforeinfo('20261124',7,1,six,six,weather);
 assert.equal(cache.getVerifiedBeforeinfo('20261124',7,1).weather.windSpeed,0);
 assert.equal(cache.getVerifiedBeforeinfo('20261124',7,2),null);
 assert.equal(cache.getVerifiedBeforeinfo('20261124',8,1),null);
});
test('unverified weather is not cached',()=>{
 cache.saveVerifiedBeforeinfo('20261124',7,3,six,six,{verified:false});
 assert.equal(cache.getVerifiedBeforeinfo('20261124',7,3).weather,null);
});
test('shared cache preserves weather and rejects expired records',async()=>{
 const store=new Map();
 const env={MORNING_KV:{put:async(k,v)=>store.set(k,v),get:async(k)=>store.get(k)}};
 await cache.writeSharedVerifiedBeforeinfo(env,'20261124',7,1,six,six,weather);
 const item=await cache.readSharedVerifiedBeforeinfo(env,'20261124',7,1);
 assert.equal(item.weather.windDirection,'北東');
 assert.equal(item.weather.waveHeight,0);
 const key=[...store.keys()][0], old=JSON.parse(store.get(key));
 old.savedAt-=121000;store.set(key,JSON.stringify(old));
 assert.equal(await cache.readSharedVerifiedBeforeinfo(env,'20261124',7,1),null);
});

const stA=source.indexOf('function extractOfficialStartExhibition(');
const stB=source.indexOf('function extractOfficialExhibition(',stA);
assert.ok(stA>=0&&stB>stA);
const parseStart=vm.runInNewContext(source.slice(stA,stB)+'\nextractOfficialStartExhibition');
const startPage=(boats,values)=>'<table><tr><th>スタート展示</th></tr>'+boats.map((boat,i)=>'<tr><td>'+boat+'</td><td>'+values[i]+'</td></tr>').join('')+'</table>';
test('start exhibition preserves course order distinct from boat number',()=>{
 const r=parseStart(startPage([1,3,2,4,6,5],['.12','.08','.19','.15','.10','.20']));
 assert.equal(r.verified,true);
 assert.equal(r.rows[1].boat,3);
 assert.equal(r.rows[1].course,2);
 assert.equal(r.rows[1].startTiming,.08);
});
test('duplicate boat in start exhibition is rejected',()=>{
 assert.equal(parseStart(startPage([1,2,3,4,5,5],Array(6).fill('.12'))).verified,false);
});
test('missing start timing is not zero',()=>{
 assert.equal(parseStart(startPage([1,2,3,4,5,6],['.12','.08','','.15','.10','.20'])).verified,false);
});
test('explicit flying start remains distinct from normal ST',()=>{
 const r=parseStart(startPage([1,2,3,4,5,6],['F.01','.08','.19','.15','.10','.20']));
 assert.equal(r.verified,true);
 assert.equal(r.rows[0].startTiming,'F.01');
});
