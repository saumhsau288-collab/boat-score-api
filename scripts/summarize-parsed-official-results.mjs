// Research-only: consolidate official result table parses by racer identity.
// This is outcome evidence, not a pre-cutoff prediction or an approved score join.
import fs from 'node:fs';
import path from 'node:path';
export function summarizeParsedOfficialResults(dir){
 const files=fs.readdirSync(dir).filter(x=>/^research-result-\d{8}-\d{2}-\d{1,2}-structure\.json$/.test(x)).sort();
 const rows=[],excluded=[];
 for(const file of files){
  const m=file.match(/^research-result-(\d{8})-(\d{2})-(\d{1,2})-structure\.json$/);
  const [date,venue,race]=[m[1],m[2],Number(m[3])];
  const parsed=JSON.parse(fs.readFileSync(path.join(dir,file),'utf8'));
  const valid=parsed.verified===true&&Array.isArray(parsed.finishByBoat)&&parsed.finishByBoat.length===6&&
   parsed.finishByBoat.every(x=>Number.isInteger(x.boat)&&x.boat>=1&&x.boat<=6&&
    Number.isInteger(x.finish)&&x.finish>=1&&x.finish<=6&&/^\d{4}$/.test(String(x.racerId)))&&
   new Set(parsed.finishByBoat.map(x=>x.boat)).size===6&&
   new Set(parsed.finishByBoat.map(x=>x.finish)).size===6&&
   new Set(parsed.finishByBoat.map(x=>x.racerId)).size===6;
  if(!valid){excluded.push({date,venue,race,reason:'incomplete_or_ambiguous_finish_rows'});continue;}
  for(const x of parsed.finishByBoat)rows.push({date,venue,race,boat:x.boat,racerId:String(x.racerId),
   finish:x.finish,winner:x.finish===1,podium:x.finish<=3});
 }
 return {status:'parsed_official_result_outcomes_only',raceCount:rows.length/6,racerFinishes:rows.length,
  excluded,rows,officialResultIndependentlyAuthenticated:false,preCutoffScoresJoined:0,eligibleForCalibration:false};
}
if(process.argv[1]&&path.resolve(process.argv[1])===path.resolve(new URL(import.meta.url).pathname)){
 const dir=process.argv[2]||'prediction-captures';
 const result=summarizeParsedOfficialResults(dir);
 fs.writeFileSync(path.join(dir,'research-result-racer-outcomes.json'),JSON.stringify(result,null,2)+'\n');
 console.log(JSON.stringify({status:result.status,raceCount:result.raceCount,racerFinishes:result.racerFinishes,
  excluded:result.excluded.length,preCutoffScoresJoined:0,eligibleForCalibration:false}));
}
