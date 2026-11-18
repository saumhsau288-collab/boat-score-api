// Research-only audit: verified:true is a caller claim, not proof of Makulabo origin.
export function auditRecent50SourceReadiness({official,recent50}={}){
 const report={readyForVerifiedSourceReview:false,officialSix:false,recentSix:false,matchedById:0,
  verifiedFlagCount:0,sourceEvidenceCount:0,missingSourceEvidence:[],issues:[],
  warning:'The independent morning evaluator trusts verified:true. This audit requires per-racer source evidence but does not authenticate URLs, publication time, or underlying last50 race results. No live scoring changes.'};
 if(!Array.isArray(official)||official.length!==6||new Set(official.map(r=>r?.boat)).size!==6||
  official.some(r=>!Number.isInteger(r?.boat)||r.boat<1||r.boat>6||!/^\d{4}$/.test(String(r.racerId??'')))){
  report.issues.push('invalid_official_six');return report;
 }
 report.officialSix=true;
 if(!Array.isArray(recent50)||recent50.length!==6){report.issues.push('missing_recent_six');return report;}
 report.recentSix=true;
 const officialIds=new Set(official.map(r=>String(r.racerId)));
 const seen=new Set();
 for(const row of recent50){
  const id=String(row?.racerId??'');
  if(!/^\d{4}$/.test(id)||seen.has(id)){report.issues.push('invalid_or_duplicate_recent_id');continue;}
  seen.add(id);
  if(!officialIds.has(id)){report.issues.push('recent_id_not_in_official');continue;}
  report.matchedById++;
  if(row.verified===true)report.verifiedFlagCount++;else report.issues.push('not_verified_'+id);
  if(typeof row.winRate!=='number'||!Number.isFinite(row.winRate)||row.winRate<0||row.winRate>100)
   report.issues.push('invalid_win_rate_'+id);
  // URL or captured source identifier must be explicit; still not independently authenticated.
  if(typeof row.sourceUrl==='string'&&/^https:\/\//.test(row.sourceUrl)&&
     typeof row.observedAt==='string'&&!Number.isNaN(Date.parse(row.observedAt))){
    report.sourceEvidenceCount++;
  }else report.missingSourceEvidence.push(id);
 }
 report.readyForVerifiedSourceReview=report.issues.length===0&&report.matchedById===6&&
  report.verifiedFlagCount===6&&report.sourceEvidenceCount===6;
 return report;
}
