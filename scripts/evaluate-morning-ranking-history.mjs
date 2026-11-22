// Compare immutable morning ranking entries with separately verified official results.
// This evaluates only ranked candidates (up to 20 per category), NOT the 12 independent methods.
import fs from 'node:fs';
const categories=['main','upset','chaos'];
export function isValidMorningCaptureTimestamp(value){
 return typeof value==='string'&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(value)&&
   Number.isFinite(Date.parse(value));
}
export function isCaptureOnMorningDate(value,date){
 if(!isValidMorningCaptureTimestamp(value)||!/^20\d{6}$/.test(String(date)))return false;
 const jstDate=new Date(Date.parse(value)+9*60*60*1000).toISOString().slice(0,10).replace(/-/g,'');
 return jstDate===String(date);
}
export function evaluateMorningRankingHistory(snapshot,results){
 if(!snapshot||!/^20\d{6}$/.test(String(snapshot.date))||!snapshot.categories||
    !Array.isArray(results))throw Error('Invalid snapshot or results');
 const byRace=new Map();
 for(const r of results){
  if(String(r.date)!==String(snapshot.date)||r.resultVerified!==true||
     !Number.isInteger(r.venue)||r.venue<1||r.venue>24||
     !Number.isInteger(r.race)||r.race<1||r.race>12||
     !Array.isArray(r.officialFinish)||r.officialFinish.length!==6||
     new Set(r.officialFinish).size!==6||
     !r.officialFinish.every(x=>Number.isInteger(x)&&x>=1&&x<=6))
    throw Error('Unverified or invalid official result');
  const key=r.venue+':'+r.race;
  if(byRace.has(key))throw Error('Duplicate official result');
  byRace.set(key,r);
 }
 const seen=new Set(),summary={date:snapshot.date,method:'saved_morning_ranked_order_vs_official_result',notTwelveMethods:true,byCategory:{}};
 for(const category of categories){
  const picks=snapshot.categories[category];
  if(!Array.isArray(picks)||picks.length>20)throw Error('Invalid ranking category');
  let matched=0,firstHits=0,topTwoExactHits=0,topThreeExactHits=0,missingPredictionOrder=0,missingCaptureTimestamp=0,notEvaluable=0;
  for(const p of picks){
   if(String(p.date)!==String(snapshot.date)||p.category!==category||
      p.status!=='provisional_not_calibrated'||!Number.isInteger(p.venue)||
      p.venue<1||p.venue>24||!Number.isInteger(p.race)||p.race<1||p.race>12||
      (p.predictedOrder!==undefined&&
       (!Array.isArray(p.predictedOrder)||p.predictedOrder.length!==6||
        new Set(p.predictedOrder).size!==6||
        !p.predictedOrder.every(x=>Number.isInteger(x)&&x>=1&&x<=6))))
    throw Error('Invalid saved morning ranking: '+JSON.stringify({
      category,venue:p?.venue,race:p?.race,date:p?.date,status:p?.status,
      recordedCategory:p?.category,predictedOrder:p?.predictedOrder,
      availableFields:p&&typeof p==='object'?Object.keys(p):[]
    }));
   const key=p.venue+':'+p.race;
   if(seen.has(key))throw Error('Duplicate ranked race');
   // Missing evidence is neither a loss nor a hit, and cannot be reconstructed post-race.
   const noOrder=p.predictedOrder===undefined;
   const noCapture=String(snapshot.date)>='20261123'&&!isCaptureOnMorningDate(p.capturedAt,snapshot.date);
   if(noOrder)missingPredictionOrder++;
   if(noCapture)missingCaptureTimestamp++;
   if(noOrder||noCapture)notEvaluable++;
   seen.add(key);
   if(noOrder||noCapture)continue;
   const result=byRace.get(key);
   if(!result)continue;
   matched++;
   if(p.predictedOrder[0]===result.officialFinish[0])firstHits++;
   if(p.predictedOrder.slice(0,2).every((x,i)=>x===result.officialFinish[i]))topTwoExactHits++;
   if(p.predictedOrder.slice(0,3).every((x,i)=>x===result.officialFinish[i]))topThreeExactHits++;
  }
  summary.byCategory[category]={saved:picks.length,matched,missingPredictionOrder,missingCaptureTimestamp,
   notEvaluable,unmatched:picks.length-matched-notEvaluable,
   firstHits,topTwoExactHits,topThreeExactHits,
   evaluationStatus:matched?'evaluated_verified_official_results':missingPredictionOrder===picks.length&&picks.length?'not_evaluable_missing_saved_prediction_order':missingCaptureTimestamp===picks.length&&picks.length?'not_evaluable_missing_capture_timestamp':'no_verified_official_matches',
   firstRate:matched?firstHits/matched:null,
   topTwoExactRate:matched?topTwoExactHits/matched:null,
   topThreeExactRate:matched?topThreeExactHits/matched:null};
 }
 return summary;
}
if(process.argv[1]&&import.meta.url===new URL('file://'+process.argv[1]).href){
 if(process.argv.length!==4)throw Error('Usage: node scripts/evaluate-morning-ranking-history.mjs snapshot.json official-results.json');
 const snapshot=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
 const results=JSON.parse(fs.readFileSync(process.argv[3],'utf8'));
 console.log(JSON.stringify(evaluateMorningRankingHistory(snapshot,results),null,2));
}
