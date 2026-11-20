import fs from 'node:fs';
import path from 'node:path';
import {explainHistoricalFirstPlaceMiss} from './explain-historical-first-place-misses.mjs';
const dir=process.argv[2]||'prediction-captures';
const files=fs.readdirSync(dir).filter(x=>/^research-historical-racelist-\d{8}-\d{2}-\d{1,2}\.json$/.test(x));
const rows=[];
for(const file of files){
 const suffix=file.slice('research-historical-racelist-'.length,-'.json'.length);
 const resultPath=path.join(dir,'research-result-'+suffix+'-structure.json');
 if(!fs.existsSync(resultPath)){rows.push({race:suffix,status:'held',reason:'result_missing'});continue;}
 rows.push(explainHistoricalFirstPlaceMiss(JSON.parse(fs.readFileSync(path.join(dir,file),'utf8')),
  JSON.parse(fs.readFileSync(resultPath,'utf8'))));
}
const misses=rows.filter(r=>r.status==='miss');
const report={status:'historical_first_place_miss_diagnostic',races:rows.length,
 correct:rows.filter(r=>r.status==='correct').length,misses:misses.length,
 ties:rows.filter(r=>r.status==='tied_top_score').length,held:rows.filter(r=>r.status==='held').length,
 misses:misses.map(r=>({date:r.date,venue:r.venue,race:r.race,predicted:r.predicted,
 actualWinner:r.actualWinner,winnerMinusPredictedComponents:r.winnerMinusPredictedComponents})),
 missingFeatures:['recent50WinRate','exhibitionScore'],eligibleForWeightTuning:false,eligibleForDeployment:false};
fs.writeFileSync(path.join(dir,'historical-first-place-misses.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
