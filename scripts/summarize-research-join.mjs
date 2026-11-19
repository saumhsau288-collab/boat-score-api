// Research-only human-readable report; never reports authenticated accuracy.
import fs from 'node:fs';
export function summarizeResearchJoin(report){
 if(!Array.isArray(report?.rows)||report?.eligibleForAccuracy!==0)throw Error('Expected held research-only join');
 const rows=report.rows;
 const parsed=rows.filter(r=>typeof r.parsedPodium==='string'&&/^[1-6]-[1-6]-[1-6]$/.test(r.parsedPodium));
 const mainContains=parsed.filter(r=>r.retrospectiveMainContainsPodium===true).length;
 const upsetContains=parsed.filter(r=>r.retrospectiveUpsetContainsPodium===true).length;
 const reasonCounts={};
 for(const r of rows)for(const reason of new Set(r.holdReasons||[]))reasonCounts[reason]=(reasonCounts[reason]||0)+1;
 const lines=['# Saved prediction and official HTML research comparison','',
  '**Not authenticated pre-race accuracy. No hit rate or score tuning permitted.**','',
  '| Metric | Count |','|---|---:|',
  '| Linked records | '+rows.length+' |',
  '| Parsed podiums | '+parsed.length+' |',
  '| Main ticket contains parsed podium (retrospective only) | '+mainContains+' |',
  '| Upset ticket contains parsed podium (retrospective only) | '+upsetContains+' |',
  '| Eligible for accuracy | 0 |','',
  '## Per-race evidence','',
  '| Date | Venue | Race | Parsed podium | Main 6 | Upset 6 | Status |',
  '|---|---:|---:|---|---|---|---|',
  ...rows.map(r=>'| '+String(r.date)+' | '+String(r.venue)+' | '+String(r.race)+' | '+
    (r.parsedPodium||'unavailable')+' | '+
    (r.retrospectiveMainContainsPodium===null?'unknown':r.retrospectiveMainContainsPodium?'contains':'does not contain')+' | '+
    (r.retrospectiveUpsetContainsPodium===null?'unknown':r.retrospectiveUpsetContainsPodium?'contains':'does not contain')+
    ' | held |'),
  '','## Evidence gaps','',
  '| Hold reason | Records |','|---|---:|',
  ...Object.entries(reasonCounts).sort((a,b)=>b[1]-a[1]).map(([k,v])=>'| '+k+' | '+v+' |'),
  '','Ticket containment is a retrospective comparison, not proof of a prediction made before the official cutoff.'];
 return {linked:rows.length,parsedPodiums:parsed.length,mainContains,upsetContains,
  eligibleForAccuracy:0,holdReasonCounts:reasonCounts,markdown:lines.join('\n')+'\n'};
}
if(process.argv[1]&&new URL(import.meta.url).pathname===process.argv[1]){
 const input=process.argv[2],output=process.argv[3];
 if(!input||!output)throw Error('Usage: node scripts/summarize-research-join.mjs <joined.json> <summary.md>');
 const report=summarizeResearchJoin(JSON.parse(fs.readFileSync(input,'utf8')));
 fs.writeFileSync(output,report.markdown);
 console.log(JSON.stringify({linked:report.linked,parsedPodiums:report.parsedPodiums,mainContains:report.mainContains,upsetContains:report.upsetContains,eligibleForAccuracy:0}));
}
