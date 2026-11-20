// Post-hoc sensitivity of local-zero handling versus verified finish order.
// Not authenticated pre-race predictions and not grounds for weight tuning.
import fs from 'node:fs/promises';
import path from 'node:path';
const dir=process.argv[2]||'research-official-racelists';
const sensitivity=JSON.parse(await fs.readFile(path.join(dir,'research-local-zero-sensitivity.json'),'utf8'));
const finishes=JSON.parse(await fs.readFile(path.join(dir,'official-verified-finishing-orders.json'),'utf8'));
const key=r=>[String(r.date),Number(r.venue),Number(r.race)].join(':');
const index=new Map(finishes.rows.map(r=>[key(r),r]));
const rows=sensitivity.rows.filter(r=>r.zeroLocalBoats.length).map(r=>{
 const f=index.get(key(r));
 if(!f?.finishVerified)return {date:r.date,venue:r.venue,race:r.race,finishVerified:false,reason:f?.reason||'result_unverified',topChanged:r.topChanged};
 const rawFinish=f.finishingBoats.indexOf(r.rawTop)+1;
 const fallbackFinish=f.finishingBoats.indexOf(r.fallbackTop)+1;
 if(rawFinish<1||fallbackFinish<1)throw Error('finish_boat_missing:'+key(r));
 return {date:r.date,venue:r.venue,race:r.race,finishVerified:true,topChanged:r.topChanged,rawTop:r.rawTop,fallbackTop:r.fallbackTop,rawTopFinish:rawFinish,fallbackTopFinish:fallbackFinish,relativeTopFinish:fallbackFinish<rawFinish?'fallback_better':fallbackFinish>rawFinish?'raw_better':'equal'};
});
const verified=rows.filter(r=>r.finishVerified),changed=verified.filter(r=>r.topChanged);
const report={zeroLocalRaceCount:rows.length,verifiedFinishCount:verified.length,unverifiedFinishCount:rows.length-verified.length,verifiedTopChangedCount:changed.length,fallbackBetter:changed.filter(r=>r.relativeTopFinish==='fallback_better').length,rawBetter:changed.filter(r=>r.relativeTopFinish==='raw_better').length,equal:changed.filter(r=>r.relativeTopFinish==='equal').length,rows,preRaceAuthenticated:false,calibrationEligible:false,weightsChanged:false,warning:'Post-hoc comparison only. No predictive validity or causation established.'};
await fs.writeFile(path.join(dir,'research-local-zero-official-finish-sensitivity.json'),JSON.stringify(report,null,2)+'\n');
console.log('Research local zero official finish sensitivity:',JSON.stringify(report));
