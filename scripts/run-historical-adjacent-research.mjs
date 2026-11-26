import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';
import {fetchHistoricalEntryLists} from './fetch-historical-official-entry-lists.mjs';
import {fetchManualOfficialHistoricalResults,parseExplicitRaceSelection} from './fetch-manual-official-historical-results.mjs';
import {inspectSavedEntryHtml} from './inspect-historical-entry-winrates.mjs';
import {extractOfficialResultRacers} from './extract-official-result-racers.mjs';
import {analyze} from './analyze-adjacent-winrate-finishes.mjs';
export async function run(selection,workerSource){
 const dir=process.env.ADJACENT_CACHE_DIR||'.adjacent-cache';
 fs.mkdirSync(dir,{recursive:true});
 async function collect(kind,fetcher,status){
  const pages=[];
  for(const race of selection.races){
   const file=path.join(dir,kind+'-'+selection.date+'-'+selection.venue+'-'+race+'.json');
   let page;
   try{
    const p=JSON.parse(fs.readFileSync(file,'utf8'));
    if(p.status===status&&p.date===selection.date&&p.venue===selection.venue&&p.race===race&&typeof p.html==='string'&&crypto.createHash('sha256').update(p.html).digest('hex')===p.sha256)page=p;
   }catch{}
   if(page)console.log(kind+' R'+race+' cache hit');
   else{
    console.log(kind+' R'+race+' fetching');
    for(let round=1;round<=2;round++){
     const report=await fetcher({...selection,races:[race]});
     page=report.pages[0];
     console.log(kind+' R'+race+' round '+round+' '+page.status+' attempts='+page.attempts);
     if(page.status===status)break;
     if(round===1)await new Promise(resolve=>setTimeout(resolve,1000));
    }
    if(page.status===status){fs.writeFileSync(file+'.tmp',JSON.stringify(page));fs.renameSync(file+'.tmp',file);}
   }
   pages.push(page);
  }
  return {pages};
 }
 const entries=await collect('entry',fetchHistoricalEntryLists,'raw_historical_entry_html');
 const results=await collect('result',fetchManualOfficialHistoricalResults,'raw_html_saved');
 const entryReport={rows:inspectSavedEntryHtml(entries.pages,workerSource)};
 const resultReport=extractOfficialResultRacers(results);
 const analysis=analyze(entryReport,resultReport);
 return {selection,entryReport,resultReport,analysis,eligibleForCalibration:0};
}
if(process.argv[1]&&new URL(import.meta.url).pathname===process.argv[1]){
 const [date,venue,races,output]=process.argv.slice(2);
 if(!output)throw Error('Usage: YYYYMMDD VENUE RACES_CSV OUTPUT_JSON');
 const report=await run({date,venue:Number(venue),races:parseExplicitRaceSelection(races)},fs.readFileSync(new URL('../worker.js',import.meta.url),'utf8'));
 fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({matched:report.analysis.matched,rejected:report.analysis.rejected,eligibleForCalibration:0}));
}
