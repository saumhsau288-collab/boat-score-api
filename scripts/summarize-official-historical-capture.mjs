// Report actual completeness of one bounded historical capture, without treating post-race entry pages as pre-cutoff evidence.
import fs from 'node:fs';
export function summarizeCapture(entries,results){
 if(!Array.isArray(entries)||!Array.isArray(results?.rows))throw Error('Expected entry samples and parsed result rows');
 const keyed=new Map();
 for(const e of entries){
  const key=[e.date,e.venue,e.race].join(':');
  if(keyed.has(key))throw Error('Duplicate entry identity');
  keyed.set(key,e);
 }
 const rows=results.rows.map(r=>{
  const key=[r.date,r.venue,r.race].join(':');const e=keyed.get(key);
  const ids=Array.isArray(r.racers)?r.racers.map(x=>String(x.racerId)):[];
  const completeResult=r.status==='parsed_needs_independent_review'&&ids.length===6&&new Set(ids).size===6&&r.entryCoursesExtracted===true&&Array.isArray(r.podium)&&r.podium.length===3;
  return {date:r.date,venue:r.venue,race:r.race,entryHtmlSaved:e?.status==='raw_html_saved',resultParsed:completeResult,actualEntryOrderExtracted:completeResult,preCutoffFeaturesAuthenticated:false,eligibleForWeightTuning:false};
 });
 return {targets:rows.length,entryHtmlSaved:rows.filter(x=>x.entryHtmlSaved).length,resultParsed:rows.filter(x=>x.resultParsed).length,entryAndResultMatched:rows.filter(x=>x.entryHtmlSaved&&x.resultParsed).length,preCutoffAuthenticated:0,eligibleForWeightTuning:0,rows};
}
if(process.argv[1]&&new URL(import.meta.url).pathname===process.argv[1]){
 const [directory,output]=process.argv.slice(2);if(!directory||!output)throw Error('Expected directory and output');
 const entries=fs.readdirSync(directory).filter(n=>/-racelist\.json$/.test(n)).map(n=>JSON.parse(fs.readFileSync(directory+'/'+n,'utf8')));
 const results=JSON.parse(fs.readFileSync(directory+'/20261118-tokuyama-results-parsed.json','utf8'));
 const report=summarizeCapture(entries,results);
 fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({targets:report.targets,entryHtmlSaved:report.entryHtmlSaved,resultParsed:report.resultParsed,entryAndResultMatched:report.entryAndResultMatched,eligibleForWeightTuning:0}));
}
