// Research-only per-boat diagnostic. Observed counts are never score eligibility.
export function diagnoseMakulaboSixSamples(official,heatmap){
 const output=[];
 for(let boat=1;boat<=6;boat++){
  const o=Array.isArray(official)?official.find(x=>x?.boat===boat):null;
  const h=Array.isArray(heatmap)?heatmap.find(x=>x?.boat===boat):null;
  const reasons=[];
  if(!o||!/^\d{4}$/.test(String(o.racerId)))reasons.push('official_identity_missing');
  if(h&&o&&typeof h.name==='string'&&typeof o.name==='string'){
   const norm=s=>s.normalize('NFKC').replace(/[\\s\u3000・･]/g,'');
   if(norm(h.name)!==norm(o.name))reasons.push('racer_name_mismatch');
  }
  if(!h||!Number.isInteger(h.runs)||h.runs<1||h.runs>50||
   !Array.isArray(h.counts)||h.counts.length!==6||
   h.counts.some(n=>!Number.isInteger(n)||n<0)||
   h.counts.reduce((a,b)=>a+b,0)!==h.runs)reasons.push('invalid_counts');
  if(h&&Number.isInteger(h.runs)&&h.runs!==50)reasons.push('not_exactly_50_races');
  if(h?.blankAsZeroInferred===true)reasons.push('inferred_blank_cells');
  reasons.push('historical_provenance_unverified');
  output.push({boat,racerId:o?.racerId??null,observedRuns:h?.runs??null,
   observedFirstPlaceRate:h&&Number.isInteger(h.runs)&&h.runs>0&&Number.isInteger(h.counts?.[0])?
    Math.round(h.counts[0]/h.runs*10000)/100:null,
   reasons,eligibleForScoring:false});
 }
 return {status:'diagnostic_only',boats:output,eligibleForScoring:false};
}
