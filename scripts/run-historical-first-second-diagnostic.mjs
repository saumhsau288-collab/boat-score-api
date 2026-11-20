import fs from 'node:fs';
import path from 'node:path';
import {evaluateHistoricalFirstSecond} from './evaluate-historical-first-second.mjs';
const dir=process.argv[2]||'prediction-captures';
const files=fs.readdirSync(dir).filter(x=>/^research-historical-racelist-\d{8}-\d{2}-\d{1,2}\.json$/.test(x));
const rows=files.map(file=>{
 const suffix=file.slice('research-historical-racelist-'.length,-'.json'.length);
 const resultPath=path.join(dir,'research-result-'+suffix+'-structure.json');
 return fs.existsSync(resultPath)?evaluateHistoricalFirstSecond(
  JSON.parse(fs.readFileSync(path.join(dir,file),'utf8')),
  JSON.parse(fs.readFileSync(resultPath,'utf8'))):
  {status:'held',reason:'result_missing',race:suffix};
});
const valid=rows.filter(r=>r.status==='partial_first_second_diagnostic');
const count=k=>valid.filter(r=>r[k]===true).length;
const decided=k=>valid.filter(r=>r[k]!==null).length;
const summary={status:'first_second_historical_partial_diagnostic',races:rows.length,scored:valid.length,
 first:{correct:count('firstCorrect'),decided:decided('firstCorrect')},
 second:{correct:count('secondCorrect'),decided:decided('secondCorrect')},
 orderedPair:{correct:count('orderedPairCorrect'),decided:decided('orderedPairCorrect')},
 fullCurrentScore:false,eligibleForWeightTuning:false,eligibleForDeployment:false,rows};
fs.writeFileSync(path.join(dir,'historical-first-second-diagnostic.json'),JSON.stringify(summary,null,2)+'\n');
console.log(JSON.stringify({...summary,rows:undefined}));
