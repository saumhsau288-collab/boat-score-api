// Read-only check of labelled finish totals from publicly available Makulabo HTML.
import {extractMakulaboFinishTable} from '../boat-score-2-makulabo-source-table.js';
const [date,venue,race]=process.argv.slice(2);
if(!/^20\d{6}$/.test(date??'')||!/^(?:0?[1-9]|1\d|2[0-4])$/.test(venue??'')||!/^(?:0?[1-9]|1[0-2])$/.test(race??''))process.exit(2);
const url='https://makulabo-jp.com/data/'+venue.padStart(2,'0')+'/'+Number(race)+'/heatmap?hd='+date;
try{
 const response=await fetch(url,{signal:AbortSignal.timeout(15000)});
 if(!response.ok)throw Error('source_http_'+response.status);
 const extracted=extractMakulaboFinishTable(await response.text());
 if(!extracted.verified)throw Error(extracted.reason);
 console.log(JSON.stringify({date,venue,race,status:'finish_table_verified',
  racers:extracted.parsedRows.map(r=>({boat:r.boat,runs:r.runs,
   firstPlaceRate:r.runs?+(100*r.counts[0]/r.runs).toFixed(2):null,
   top2Rate:r.runs?+(100*(r.counts[0]+r.counts[1])/r.runs).toFixed(2):null,
   top3Rate:r.runs?+(100*(r.counts[0]+r.counts[1]+r.counts[2])/r.runs).toFixed(2):null})),
  warning:'These are overall finish rates from labelled rows, not verified course-specific rates or pre-race predictions.'},null,2));
}catch(e){console.error('Makulabo finish table validation failed:',e.message);process.exitCode=1;}
