// Read-only end-to-end join: public Makulabo HTML + existing official racer inspection.
import {extractMakulaboFinishTable} from '../boat-score-2-makulabo-source-table.js';
import {joinMakulaboWithOfficial} from '../boat-score-2-makulabo-official-join.js';
const [date,venue,race,apiPath]=process.argv.slice(2);
if(!/^20\d{6}$/.test(date??'')||!/^(?:0?[1-9]|1\d|2[0-4])$/.test(venue??'')||!/^(?:0?[1-9]|1[0-2])$/.test(race??''))process.exit(2);
const source='https://makulabo-jp.com/data/'+venue.padStart(2,'0')+'/'+Number(race)+'/heatmap?hd='+date;
const api='https://boat-score-api-v2.saumh-sau-288.workers.dev/api/makulabo/heatmap?'+new URLSearchParams({date,venue,race});
try{
 const [htmlResponse,apiResponse]=await Promise.all([fetch(source,{signal:AbortSignal.timeout(15000)}),fetch(api,{signal:AbortSignal.timeout(15000)})]);
 if(!htmlResponse.ok||!apiResponse.ok)throw Error('source_http_'+htmlResponse.status+'_api_http_'+apiResponse.status);
 const extracted=extractMakulaboFinishTable(await htmlResponse.text());
 const payload=await apiResponse.json();
 if(payload?.officialRacersInspection?.verified!==true)throw Error('official_six_not_verified');
 const result=joinMakulaboWithOfficial(payload.officialRacersInspection.racers,extracted);
 if(!result.verified)throw Error(result.reason);
 console.log(JSON.stringify({status:'official_makulabo_join_verified',date,venue,race,
  racers:result.racers.map(r=>({boat:r.boat,racerId:r.racerId,runs:r.runs,firstPlaceRate:r.firstPlaceRate,top2Rate:r.top2Rate,top3Rate:r.top3Rate,matchMethod:r.matchMethod})),
  scoreChangeApplied:false,warning:'Overall finish rates only; no course-specific rate or prediction score is asserted.'},null,2));
}catch(e){console.error('Official/Makulabo join failed:',e.message);process.exitCode=1;}
