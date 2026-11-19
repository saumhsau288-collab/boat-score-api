// Finish-order-only retrospective diagnostics from held research joins.
// Does not inspect or calculate payouts, stakes, odds, return, or verified hit rates.
import fs from 'node:fs';
const validPicks=a=>Array.isArray(a)&&a.length===6&&a.every(p=>typeof p==='string'&&/^[1-6]-[1-6]-[1-6]$/.test(p)&&new Set(p.split('-')).size===3)&&new Set(a).size===6;
const podium=p=>typeof p==='string'&&/^[1-6]-[1-6]-[1-6]$/.test(p)&&new Set(p.split('-')).size===3;
export function reviewHistoricalFinishOrders(joined){
 if(!Array.isArray(joined?.rows)||joined?.eligibleForAccuracy!==0)throw Error('Held join required');
 const rows=joined.rows.map(r=>{
  const actual=podium(r.parsedPodium)?r.parsedPodium:null;
  const main=validPicks(r.mainTickets)?r.mainTickets:null;
  const upset=validPicks(r.upsetTickets)?r.upsetTickets:null;
  const actualBoats=actual?actual.split('-'):[];
  const overlap=tickets=>tickets===null||actual===null?null:
   Math.max(...tickets.map(t=>t.split('-').filter(b=>actualBoats.includes(b)).length));
  return {date:r.date,venue:r.venue,race:r.race,actualFinishOrder:actual,
   mainExactOrderContained:actual&&main?main.includes(actual):null,
   upsetExactOrderContained:actual&&upset?upset.includes(actual):null,
   mainBestTop3BoatOverlap:overlap(main),upsetBestTop3BoatOverlap:overlap(upset),
   sourceStatus:r.status,holdReasons:r.holdReasons||[],verifiedAccuracy:false};
 });
 return {method:'retrospective_finish_order_only_review',rows,
  totals:{reviewed:rows.length,withParsedFinishOrder:rows.filter(r=>r.actualFinishOrder).length,
   mainExactOrderContained:rows.filter(r=>r.mainExactOrderContained===true).length,
   upsetExactOrderContained:rows.filter(r=>r.upsetExactOrderContained===true).length},
  eligibleForAccuracy:0,eligibleForScoreChange:false,
  warning:'Retrospective comparison only. Original historical pre-race feature inputs are missing; do not treat these rows as verified historical predictions or adjust score weights.'};
}
if(process.argv[1]&&new URL(import.meta.url).pathname===process.argv[1]){
 const [input,output]=process.argv.slice(2);
 if(!input||!output)throw Error('Usage: node scripts/review-historical-finish-orders.mjs <joined.json> <finish-review.json>');
 const report=reviewHistoricalFinishOrders(JSON.parse(fs.readFileSync(input,'utf8')));
 fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify(report.totals));
}
