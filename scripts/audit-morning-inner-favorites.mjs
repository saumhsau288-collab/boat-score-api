// Research only: evaluate the saved 8 AM MAIN shortlist, never post-race reconstructed rankings.
// Usage: node scripts/audit-morning-inner-favorites.mjs YYYYMMDD
// Output compares actual verified official finishes with IMMUTABLE saved morning predictedOrder.
// Only the morning MAIN shortlist is eligible; missing snapshots/finishes are held, not imputed.
const date=process.argv[2];
if(!/^20\d{6}$/.test(date||''))throw Error('Usage: node scripts/audit-morning-inner-favorites.mjs YYYYMMDD');
const base='https://boat-score-2-preview.saumh-sau-288.workers.dev';
async function fetchJson(path){
 const res=await fetch(base+path,{signal:AbortSignal.timeout(35000)});
 if(!res.ok)throw Error('HTTP '+res.status);
 return res.json();
}
const snapshot=await fetchJson('/api/morning/snapshot?date='+date);
if(!Array.isArray(snapshot?.categories?.main))throw Error('No verified saved morning MAIN category');
const main=snapshot.categories.main;
const stats={},details=[],held=[];
function group(key){return stats[key]??={eligible:0,winner:0,topTwoOrdered:0,trifectaSix:0,innerTopTwo:0};}
function sixPicks(order){
 // Research-only reference six-pick construction, not a claim to reproduce app's independent 6 methods.
 const first=order.slice(0,3),second=order.slice(0,4),third=order;
 const combos=[];
 for(const a of first)for(const b of second)for(const c of third){
  if(a===b||b===c||a===c)continue;
  const rank=order.indexOf(a)*100+order.indexOf(b)*10+order.indexOf(c);
  combos.push({pick:[a,b,c].join('-'),rank});
 }
 return combos.sort((x,y)=>x.rank-y.rank||x.pick.localeCompare(y.pick)).slice(0,6).map(x=>x.pick);
}
for(const item of main){
 const key=[date,item.venue,item.race].join(':');
 const order=item.predictedOrder;
 const captureValid=typeof item.capturedAt==='string'&&!Number.isNaN(Date.parse(item.capturedAt));
 const orderValid=Array.isArray(order)&&order.length===6&&new Set(order).size===6&&
  order.every(x=>Number.isInteger(x)&&x>=1&&x<=6);
 if(!captureValid||!orderValid){
  held.push({key,reason:!captureValid&&!orderValid?'missing_capture_and_order':!captureValid?'missing_capture':'missing_order',
   capturedAtPresent:Boolean(item.capturedAt),orderPresent:Array.isArray(order),
   orderCount:Array.isArray(order)?order.length:null,
   snapshotFields:Object.keys(item).sort()});continue;
 }
 const groupName=order[0]===1?(order[1]<=3?'boat1_first_inner_second':'boat1_first_outer_second'):(order[0]<=3?(order[1]<=3?'boat2or3_first_inner_second':'boat2or3_first_outer_second'):'not_inner_first');
 // Inner high scorers are approximated by top-ranked boats because the snapshot API
 // does not expose raw per-boat scores. Never claim absolute score thresholds were checked.
 let official;
 try{official=await fetchJson('/api/official/result?date='+date+'&venue='+item.venue+'&race='+item.race);}
 catch(e){held.push({key,reason:'official_result_fetch_failed'});continue;}
 const actual=official?.finishOrder;
 if(official?.verified!==true||!Array.isArray(actual)||actual.length!==6||new Set(actual).size!==6||
   !actual.every(x=>Number.isInteger(x)&&x>=1&&x<=6)){
  held.push({key,reason:'official_finish_unverified'});continue;
 }
 const picks=sixPicks(order),hit=picks.includes(actual.slice(0,3).join('-'));
 const flags={winner:order[0]===actual[0],topTwoOrdered:order[0]===actual[0]&&order[1]===actual[1],trifectaSix:hit,innerTopTwo:actual[0]<=3&&actual[1]<=3};
 for(const name of ['all_main',groupName,'lead_ge_6'+(Number(item.lead)>=6?'_yes':'_no')]){
  const g=group(name);g.eligible++;for(const [k,v] of Object.entries(flags))if(v)g[k]++;
 }
 details.push({key,group:groupName,lead:item.lead,predictedOrder:order,actual:actual.slice(0,3),referenceSixPicks:picks,flags});
}
const holdReasons=Object.fromEntries([...new Set(held.map(x=>x.reason))].map(k=>[k,held.filter(x=>x.reason===k).length]));
const result={date,holdReasons,mode:'saved_morning_main_only',snapshotStatus:snapshot.status,shortlist:main.length,eligible:details.length,held,
 caveat:'This evaluates saved ranked order and a transparent reference six-pick formula, NOT the app independent six methods. Top-two inner strength uses relative rank, NOT absolute raw scores. Morning capturedAt is present but no explicit deadline check is available.',
 stats,details};
const fs=await import('node:fs');
const file='morning-inner-favorites-'+date+'.json';
fs.writeFileSync(file,JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({file,shortlist:main.length,eligible:details.length,held:held.length,holdReasons,stats},null,2));
