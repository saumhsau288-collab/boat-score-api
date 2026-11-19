// Offline exploratory parser. The official historical entry page is NOT a saved pre-cutoff snapshot.
// Reuse the exact six-boat parsing functions from the app's worker source rather than
// maintaining a divergent second implementation. Extraction is strictly read-only.
import fs from 'node:fs';
import vm from 'node:vm';
function extractFunction(source,name){
 const start=source.indexOf('function '+name+'(');
 if(start<0)throw Error('Worker parser missing: '+name);
 const end=source.indexOf('\n}\n',start);
 if(end<0)throw Error('Worker parser end missing: '+name);
 return source.slice(start,end+2);
}
export function inspectSavedEntryHtml(pages,workerSource){
 const parserCode=['extractOfficialBoatRows','extractOfficialBoatStats'].map(n=>extractFunction(workerSource,n)).join('\n');
 const context=vm.createContext({URL,Set,Number,String,RegExp});
 vm.runInContext(parserCode,context,{timeout:1000});
 return pages.map(p=>{
  if(p.status!=='raw_historical_entry_html'||typeof p.html!=='string')return {date:p.date,venue:p.venue,race:p.race,status:p.status,statsVerified:false};
  try{
   const racers=context.extractOfficialBoatRows(p.html);
   const stats=context.extractOfficialBoatStats(p.html);
   const matched=racers.verified&&stats.verified&&stats.rows.every((r,i)=>r.boat===racers.racers[i].boat&&r.racerId===racers.racers[i].racerId);
   return {date:p.date,venue:p.venue,race:p.race,status:p.status,parsedSixRacers:racers.verified,parsedSixStats:stats.verified,
    identityMatched:matched,statsVerified:matched,preCutoffSnapshotVerified:false,
    racers:matched?stats.rows.map(r=>({boat:r.boat,racerId:r.racerId,nationalWinRate:r.nationwide.winRate,localWinRate:r.local.winRate,averageWinRate:(r.nationwide.winRate+r.local.winRate)/2,averageST:r.averageST})):[]};
  }catch(e){return {date:p.date,venue:p.venue,race:p.race,status:'parse_error',error:String(e.message).slice(0,140),statsVerified:false,preCutoffSnapshotVerified:false};}
 });
}
if(process.argv[1]&&new URL(import.meta.url).pathname===process.argv[1]){
 const [input,workerFile,output]=process.argv.slice(2);
 if(!output)throw Error('Usage: INPUT_JSON WORKER_JS OUTPUT_JSON');
 const d=JSON.parse(fs.readFileSync(input,'utf8'));
 const rows=inspectSavedEntryHtml(d.pages,fs.readFileSync(workerFile,'utf8'));
 fs.writeFileSync(output,JSON.stringify({rows,eligibleForHistoricalCalibration:0,warning:'Historical HTML retrieved after race. No authenticated pre-cutoff capture.'},null,2)+'\n');
 console.log(JSON.stringify({races:rows.length,sixRacerWinRateRows:rows.filter(r=>r.statsVerified).length,eligibleForHistoricalCalibration:0,details:rows.map(r=>({race:r.race,status:r.status,statsVerified:r.statsVerified,parsedSixRacers:r.parsedSixRacers,parsedSixStats:r.parsedSixStats}))}));
}
