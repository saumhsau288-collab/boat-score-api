// Research-only prediction CLI. No live data fetching and no production deployment.
// Usage: node --experimental-default-type=module scripts/predict-boat-score-2-experiment.mjs input.json [output.json]
import fs from 'node:fs';
import {predictExperimentalRace} from '../boat-score-2-offline-prediction.js';
import {buildEntryAlertView} from '../boat-score-2-entry-alert-integration.js';
export function predictFromInput(input){
 if(!input||typeof input!=='object'||!Array.isArray(input.racers))throw Error('Six racers required');
 const prediction=predictExperimentalRace(input.racers);
 const alertView=buildEntryAlertView(prediction,{
  exhibitionRacers:Array.isArray(input.exhibitionRacers)?input.exhibitionRacers:null,
  exhibitionSourceVerified:input.exhibitionSourceVerified===true
 });
 return {status:prediction.status,venue:input.venue??null,date:input.date??null,race:input.race??null,
  dataSource:input.dataSource??'unverified_user_input',
  ranking:prediction.ranking??[],main:prediction.main??[],upset:prediction.upset??[],
  entryAlerts:alertView.alerts??[],entryAlertSource:alertView.source,
  entryAlertHtml:alertView.html,warning:prediction.warning??prediction.reason??null,
  note:'Research-only. Input provenance and real pre-race availability must be checked independently.'};
}
if(process.argv[1]&&new URL(import.meta.url).pathname===process.argv[1]){
 const [inputPath,outputPath]=process.argv.slice(2);
 if(!inputPath)throw Error('Usage: input.json [output.json]');
 const result=predictFromInput(JSON.parse(fs.readFileSync(inputPath,'utf8')));
 const json=JSON.stringify(result,null,2)+'\\n';
 if(outputPath)fs.writeFileSync(outputPath,json);else process.stdout.write(json);
 if(result.status!=='experimental')process.exitCode=2;
}
