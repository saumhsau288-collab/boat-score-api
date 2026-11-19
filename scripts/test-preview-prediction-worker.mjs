import assert from 'node:assert/strict';
import worker,{parseRacers,rankRace} from '../research/boat-score-2-preview-worker.mjs';
const racers=Array.from({length:6},(_,i)=>({boat:i+1,racerId:String(4001+i),averageStartTiming:.12+i*.01,nationalWinRate:6.8-i*.3,localWinRate:6.4-i*.2,entryCourse:i+1}));
const html='<table>'+racers.map(r=>'<tr>'+[r.boat,'photo',r.racerId,'0.'+String(Math.round(r.averageStartTiming*100)).padStart(2,'0'),r.nationalWinRate.toFixed(2),r.localWinRate.toFixed(2)].map(v=>'<td rowspan="4">'+v+'</td>').join('')+'</tr>').join('')+'</table>';
const parsed=parseRacers(html);
assert.equal(parsed?.length,6,'Six unique boats and registration IDs required');
assert.deepEqual(parsed.map(x=>x.racerId),racers.map(x=>x.racerId));
const out=rankRace(parsed);
assert.equal(out.ranking.length,6);
assert.equal(out.main.length,6);
assert.equal(out.upset.length,6);
assert.equal(new Set([...out.main,...out.upset].map(x=>x.ticket)).size,12);
assert.equal(parseRacers(html.replace('4001','4002')),null,'Duplicate registration must fail');
assert.equal(parseRacers(html.replace('<td rowspan="4">6</td>','<td rowspan="4">7</td>')),null,'Invalid boat must fail');
const oldFetch=globalThis.fetch;
try{
 let officialRequested='';
 globalThis.fetch=async url=>{officialRequested=String(url);return new Response(html,{status:200,headers:{'content-type':'text/html'}});};
 const good=await worker.fetch(new Request('https://preview.example/api/predict?date=20261119&venue=18&race=2'));
 const json=await good.json();
 assert.equal(json.status,'experimental');
 assert.equal(json.date,'20261119');
 assert.equal(json.venue,18);
 assert.equal(json.race,2);
 assert.equal(json.main.length,6);
 assert.equal(json.upset.length,6);
 assert.ok(officialRequested.includes('hd=20261119'));
 assert.ok(officialRequested.includes('jcd=18'));
 assert.ok(officialRequested.includes('rno=2'));
 for(const bad of ['?date=20261119&venue=18','?date=20261119&race=2','?date=bad&venue=18&race=2','?date=20261119&venue=25&race=2']){
  const response=await worker.fetch(new Request('https://preview.example/api/predict'+bad));
  assert.equal(response.status,400,'Invalid selection must be rejected: '+bad);
 }
 globalThis.fetch=async()=>new Response('<html>no racers</html>',{status:200});
 const withheld=await (await worker.fetch(new Request('https://preview.example/api/predict?date=20261119&venue=18&race=2'))).json();
 assert.equal(withheld.status,'official_features_incomplete');
 assert.deepEqual(withheld.main,[]);
 assert.deepEqual(withheld.upset,[]);
}finally{globalThis.fetch=oldFetch;}
console.log('Preview Worker HTTP route, race selection, withholding and 6+6 tests passed');
