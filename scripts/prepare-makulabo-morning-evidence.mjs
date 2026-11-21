// Research-only adapter. Preserve observed Makulabo race counts without falsely
// claiming that they represent 50 completed races or pre-race evidence.
export function prepareMakulaboMorningEvidence(official,heatmap,cutoffAudit){
 const held=(reason)=>({status:'held',reason,eligibleForScoring:false,rows:[]});
 if(!Array.isArray(official)||official.length!==6||!Array.isArray(heatmap)||heatmap.length!==6)
  return held('six_racers_required');
 if(!cutoffAudit||cutoffAudit.eligible!==true)return held('historical_cutoff_unverified');
 const rows=[];
 const seenIds=new Set();
 for(let boat=1;boat<=6;boat++){
  const o=official.find(r=>r.boat===boat);
  const h=heatmap.find(r=>r.boat===boat);
  if(!o||!h||!/^\d{4}$/.test(String(o.racerId))||
   typeof h.runs!=='number'||!Number.isInteger(h.runs)||h.runs<1||h.runs>50||
   !Array.isArray(h.counts)||h.counts.length!==6||
   h.counts.some(n=>!Number.isInteger(n)||n<0)||
   h.counts.reduce((a,b)=>a+b,0)!==h.runs)return held('invalid_heatmap_counts');
  if(seenIds.has(String(o.racerId)))return held('duplicate_official_racer_id');
  seenIds.add(String(o.racerId));
  if(typeof o.name==='string'&&typeof h.name==='string'){
   const norm=s=>s.normalize('NFKC').replace(/[\s\u3000・･]/g,'');
   if(norm(o.name)!==norm(h.name))return held('racer_name_mismatch');
  }
  if(h.runs!==50)return held('not_exactly_50_races');
  if(h.blankAsZeroInferred)return held('inferred_blank_cells');
  rows.push({boat,racerId:String(o.racerId),winRate:Math.round(h.counts[0]/50*10000)/100,
   verified:false,sourceVerified:false});
 }
 return {status:'held',reason:'independent_source_provenance_not_authenticated',
  eligibleForScoring:false,rows};
}
