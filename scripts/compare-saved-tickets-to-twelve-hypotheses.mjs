// Research only. Reuse the strict paired-race eligibility checks from the spatial comparator.
import {compareSavedTicketsToSpatial} from './compare-saved-tickets-to-spatial.mjs';
import {predictTwelveIndependentHypotheses} from './predict-twelve-independent-hypotheses.mjs';
const key=r=>[r?.date,Number(r?.venue),Number(r?.race)].join(':');
export function compareSavedTicketsToTwelveHypotheses(capture,officialResults,snapshots){
 const paired=compareSavedTicketsToSpatial(capture,officialResults,snapshots);
 const byKey=new Map((Array.isArray(snapshots)?snapshots:[]).map(s=>[key(s),s]));
 const rows=paired.rows.map(row=>{
  if(row.status!=='compared')return {key:row.key,status:'held',reasons:row.reasons};
  const forecast=predictTwelveIndependentHypotheses(byKey.get(row.key).racers);
  const strategies=[...forecast.main,...forecast.upset].map(s=>({id:s.strategyId,group:s.group,ticket:s.ticket.join('-'),hit:s.ticket.join('-')===row.actual}));
  return {key:row.key,status:'compared',actual:row.actual,baselineHit:row.baseline.mainHit||row.baseline.upsetHit,strategies,anyHit:strategies.some(s=>s.hit)};
 });
 const eligible=rows.filter(r=>r.status==='compared'),n=eligible.length;
 const rate=hits=>n?Number((100*hits/n).toFixed(2)):null;
 const ids=eligible[0]?.strategies.map(s=>({id:s.id,group:s.group}))??[];
 const strategyBreakdown=ids.map(s=>({...s,hits:eligible.filter(r=>r.strategies.some(t=>t.id===s.id&&t.hit)).length,hitRatePercent:rate(eligible.filter(r=>r.strategies.some(t=>t.id===s.id&&t.hit)).length)}));
 const baselineHits=eligible.filter(r=>r.baselineHit).length,twelveHits=eligible.filter(r=>r.anyHit).length;
 return {status:paired.status,compared:n,held:paired.held,holdReasons:paired.holdReasons,baseline:{hits:baselineHits,hitRatePercent:rate(baselineHits)},twelveHypotheses:{hits:twelveHits,hitRatePercent:rate(twelveHits),strategyBreakdown},deltaPercentagePoints:n?Number((rate(twelveHits)-rate(baselineHits)).toFixed(2)):null,rows,warning:'Uses spatial comparator pre-race eligibility gate. Twelve heuristic parameter profiles are not independently trained or validated models. No accuracy claims without authentic paired historical records.'};
}
