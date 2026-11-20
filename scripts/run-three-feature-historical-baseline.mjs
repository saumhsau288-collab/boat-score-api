// Run the partial 3-feature diagnostic only after the identity join audit.
import fs from 'node:fs';
import path from 'node:path';
import {evaluateThreeFeatureHistoricalBaseline} from './evaluate-three-feature-historical-baseline.mjs';
const dir=process.argv[2]||'prediction-captures';
const files=fs.readdirSync(dir).filter(x=>/^research-historical-racelist-\d{8}-\d{2}-\d{1,2}\.json$/.test(x));
const rows=[];
for(const file of files){
 const suffix=file.slice('research-historical-racelist-'.length,-'.json'.length);
 const finishFile=path.join(dir,'research-result-'+suffix+'-structure.json');
 if(!fs.existsSync(finishFile)){rows.push({race:suffix,status:'held',reason:'result_file_missing'});continue;}
 const list=JSON.parse(fs.readFileSync(path.join(dir,file),'utf8'));
 const finish=JSON.parse(fs.readFileSync(finishFile,'utf8'));
 rows.push({race:suffix,...evaluateThreeFeatureHistoricalBaseline(list,finish)});
}
const scored=rows.filter(x=>x.status==='three_feature_diagnostic_only');
const summary={status:'retrospective_partial_baseline_diagnostic',total:rows.length,scored:scored.length,
 firstPlaceCorrect:scored.filter(x=>x.firstPlaceCorrect===true).length,
 firstPlaceTies:scored.filter(x=>x.firstPlaceScoreTied===true).length,
 unambiguousFirstPlacePredictions:scored.filter(x=>x.firstPlaceScoreTied===false).length,
 topThreePodiumHits:scored.reduce((n,x)=>n+x.topThreePodiumHits,0),
 missingScoreWeight:15,currentFiveFeaturePrediction:false,eligibleForWeightTuning:false,rows};
fs.writeFileSync(path.join(dir,'historical-three-feature-baseline.json'),JSON.stringify(summary,null,2)+'\n');
console.log(JSON.stringify({status:summary.status,total:summary.total,scored:summary.scored,
 firstPlaceCorrect:summary.firstPlaceCorrect,firstPlaceTies:summary.firstPlaceTies,
 unambiguousFirstPlacePredictions:summary.unambiguousFirstPlacePredictions,
 topThreePodiumHits:summary.topThreePodiumHits,
 eligibleForWeightTuning:false}));
