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
let snapshot;
try { snapshot=await fetchJson('/api/morning/snapshot?date='+date); }
catch(error) {
 const report={date,mode:'saved_morning_main_only',status:'snapshot_unavailable',shortlist:0,eligible:0,held:[],
  holdReasons:{snapshot_unavailable:1},stats:{},details:[],error:String(error?.message||error),
  caveat:'No saved morning snapshot was available. No prediction accuracy can be inferred.'};
 const fs=await import('node:fs');
 const file='morning-inner-favorites-'+date+'.json';
 fs.writeFileSync(file,JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({file,status:report.status,eligible:0,holdReasons:report.holdReasons}));
 process.exit(0);
}
if(!Array.isArray(snapshot?.categories?.main))throw Error('Saved morning snapshot has no valid MAIN category');
const main=snapshot.categories.main;
const stats={},details=[],held=[];
const coverage={status:snapshot.status||'unknown',eligibleRecords:snapshot.eligible??null,
 venues:Array.isArray(snapshot.venues)?snapshot.venues.length:null,
 completedVenues:Array.isArray(snapshot.completedVenues)?snapshot.completedVenues.length:null,
 failedVenues:Array.isArray(snapshot.failedVenues)?snapshot.failedVenues.length:null,
 exhaustedVenues:Array.isArray(snapshot.exhaustedVenues)?snapshot.exhaustedVenues.length:null,
 scheduleLastCheck:snapshot.scheduleLastCheck||'unknown'};
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
 const scoreRows=item.rankedScores;
 const scoresValid=Array.isArray(scoreRows)&&scoreRows.length===6&&new Set(scoreRows.map(x=>x.boat)).size===6&&
  scoreRows.every(x=>Number.isInteger(x.boat)&&x.boat>=1&&x.boat<=6&&Number.isFinite(x.score));
 const byBoat=scoresValid?new Map(scoreRows.map(x=>[x.boat,x.score])):null;
 const captureValid=typeof item.capturedAt==='string'&&!Number.isNaN(Date.parse(item.capturedAt));
 // Cron collects only 08:00–08:59 JST; reject any late or backdated capture.
 const captureMs=captureValid?Date.parse(item.capturedAt):NaN;
 const windowStart=Date.parse(date.slice(0,4)+'-'+date.slice(4,6)+'-'+date.slice(6,8)+'T08:00:00+09:00');
 const captureInMorningWindow=captureValid&&captureMs>=windowStart&&captureMs<windowStart+60*60*1000;
 const orderValid=Array.isArray(order)&&order.length===6&&new Set(order).size===6&&
  order.every(x=>Number.isInteger(x)&&x>=1&&x<=6);
 if(!captureValid||!captureInMorningWindow||!orderValid||!scoresValid){
  const missing=[...(!captureValid?['capture']:!captureInMorningWindow?['outside_8am_window']:[]),...(!orderValid?['order']:[]),...(!scoresValid?['scores']:[])];
  held.push({key,reason:'missing_'+missing.join('_'),
   capturedAtPresent:Boolean(item.capturedAt),orderPresent:Array.isArray(order),
   scoresPresent:Array.isArray(scoreRows),orderCount:Array.isArray(order)?order.length:null,
   snapshotFields:Object.keys(item).sort()});continue;
 }
 const groupName=order[0]===1?(order[1]<=3?'boat1_first_inner_second':'boat1_first_outer_second'):(order[0]<=3?(order[1]<=3?'boat2or3_first_inner_second':'boat2or3_first_outer_second'):'not_inner_first');
 // Inner strength is evaluated only from the immutable saved per-boat morning scores.
 // Do not use reconstructed scores from the official pages after the race.
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
 const innerTopTwoCount=order.slice(0,2).filter(x=>x<=3).length;
 const innerScores=[1,2,3].map(boat=>byBoat.get(boat));
 const outerScores=[4,5,6].map(boat=>byBoat.get(boat));
 const innerOuterGap=Math.max(...innerScores)-Math.max(...outerScores);
 const topInner=[...innerScores].sort((a,b)=>b-a);
 const highInnerPair=innerTopTwoCount===2&&topInner[1]>Math.max(...outerScores);
 for(const name of ['all_main',groupName,'lead_ge_6'+(Number(item.lead)>=6?'_yes':'_no'),
    'inner_top2_count_'+innerTopTwoCount,
    highInnerPair?'inner_pair_above_all_outer':'not_inner_pair_above_all_outer',
    'inner_outer_gap_'+(innerOuterGap>=5?'at_least_5':innerOuterGap>=0?'zero_to_5':'below_zero')]){
  const g=group(name);g.eligible++;for(const [k,v] of Object.entries(flags))if(v)g[k]++;
 }
 details.push({key,group:groupName,lead:item.lead,innerTopTwoCount,innerOuterGap,highInnerPair,rankedScores:scoreRows,predictedOrder:order,actual:actual.slice(0,3),referenceSixPicks:picks,flags});
}
const holdReasons=Object.fromEntries([...new Set(held.map(x=>x.reason))].map(k=>[k,held.filter(x=>x.reason===k).length]));
if(main.length===0)held.push({key:date,reason:'empty_main_shortlist',coverage});
const finalHoldReasons=Object.fromEntries([...new Set(held.map(x=>x.reason))].map(k=>[k,held.filter(x=>x.reason===k).length]));
const result={date,holdReasons:finalHoldReasons,coverage,mode:'saved_morning_main_only',snapshotStatus:snapshot.status,shortlist:main.length,eligible:details.length,held,
 caveat:'This evaluates saved ranked order and a transparent reference six-pick formula, NOT the app independent six methods. Inner strength uses saved raw scores for top-two ranking and the two-high-inner versus all outer threshold; neither is a calibrated winning probability. Only snapshots captured 08:00–08:59 JST on the target race date are eligible; this does not guarantee every race was collected before its own deadline.',
 stats,details};
const fs=await import('node:fs');
const file='morning-inner-favorites-'+date+'.json';
fs.writeFileSync(file,JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({file,shortlist:main.length,eligible:details.length,held:held.length,holdReasons:finalHoldReasons,coverage,stats},null,2));
