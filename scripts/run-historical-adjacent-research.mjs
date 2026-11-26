import fs from 'node:fs';
import {fetchHistoricalEntryLists} from './fetch-historical-official-entry-lists.mjs';
import {fetchManualOfficialHistoricalResults,parseExplicitRaceSelection} from './fetch-manual-official-historical-results.mjs';
import {inspectSavedEntryHtml} from './inspect-historical-entry-winrates.mjs';
import {extractOfficialResultRacers} from './extract-official-result-racers.mjs';
import {analyze} from './analyze-adjacent-winrate-finishes.mjs';
export async function run(selection,workerSource){
 const entries=await fetchHistoricalEntryLists(selection);
 const results=await fetchManualOfficialHistoricalResults(selection);
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
