// Research-only comparability audit. A six-ticket old prediction cannot be
// called superior/inferior to one new ticket from raw hit rate alone.
import {METHOD_IDS} from '../generate-twelve-independent-methods.mjs';
import {compareSavedOldAndIndependentMethods} from './compare-saved-old-new-methods.mjs';
const validPick=p=>Array.isArray(p)&&p.length===3&&new Set(p).size===3&&p.every(n=>Number.isInteger(n)&&n>=1&&n<=6);
export function auditPairedComparisonFairness(rows=[]){
 const comparison=compareSavedOldAndIndependentMethods(rows);
 const issues=[],oldTicketCounts=new Set();
 for(const [i,row] of rows.entries()){
  const tickets=row?.oldPrediction?.tickets;
  if(!Array.isArray(tickets)||!tickets.length||!tickets.every(validPick)){
   issues.push({index:i,reason:'invalid_old_ticket_set'});continue;
  }
  if(new Set(tickets.map(x=>x.join('-'))).size!==tickets.length)
   issues.push({index:i,reason:'duplicate_old_tickets'});
  oldTicketCounts.add(tickets.length);
 }
 const paired=Object.values(comparison.methods).some(s=>s.paired>0);
 const equalTicketCount=oldTicketCounts.size===1&&oldTicketCounts.has(1);
 const fairForRawHitRate=paired&&comparison.heldCount===0&&issues.length===0&&equalTicketCount;
 return {total:comparison.total,heldCount:comparison.heldCount,
  oldTicketCounts:[...oldTicketCounts].sort((a,b)=>a-b),
  pairedByMethod:Object.fromEntries(METHOD_IDS.map(id=>[id,comparison.methods[id].paired])),
  issues,fairForRawHitRate,
  improvementVerified:false,
  note:fairForRawHitRate?
   'Equal ticket count only; statistical confidence, provenance and sample size still require review.':
   'Raw hit rates are not fair to compare when ticket counts differ or records are held.'};
}
