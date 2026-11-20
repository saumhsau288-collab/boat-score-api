// Join retrospective official racelist identity and finish outcome, without inventing
// missing Makulabo/exhibition metrics or claiming a full current-score replay.
import fs from 'node:fs';
import path from 'node:path';
export function joinHistoricalRacelistAndResults(racelist,result){
 const held=reason=>({status:'held',reason,matchedRacers:0,fullCurrentScoreReplayReady:false});
 if(racelist?.status!=='official_racelist_source_captured'||racelist.sixRacersParsed!==true||
  !Array.isArray(racelist.racers)||racelist.racers.length!==6)return held('six_official_racelist_racers_missing');
 if(result?.verified!==true||!Array.isArray(result.finishByBoat)||result.finishByBoat.length!==6)
  return held('six_official_finish_rows_missing');
 const racers=racelist.racers,finishes=result.finishByBoat;
 if(racers.some((r,i)=>r.boat!==i+1||String(r.racerId)!==String(finishes[i]?.racerId)||finishes[i]?.boat!==i+1))
  return held('racer_identity_mismatch');
 const rows=racers.map((r,i)=>({boat:r.boat,racerId:String(r.racerId),name:r.name,
  nationalWinRate:r.nationalWinRate,localWinRate:r.localWinRate,motorTwoWinRate:r.motorTwoWinRate,
  finish:finishes[i].finish,winner:finishes[i].finish===1,podium:finishes[i].finish<=3}));
 return {status:'retrospective_racer_identity_join',matchedRacers:6,rows,
  officialBaseMetricsPresent:true,missingCurrentScoreInputs:['recent50WinRate','exhibitionScore'],
  fullCurrentScoreReplayReady:false,preRaceHistoricalValidityVerified:false,
  eligibleForCalibration:false,warning:'Post-race racelist retrieval does not independently prove historic pre-race field values.'};
}
export function auditHistoricalBatch(dir){
 const files=fs.readdirSync(dir).filter(x=>/^research-historical-racelist-\d{8}-\d{2}-\d{1,2}\.json$/.test(x));
 const results=[];
 for(const file of files){
  const racelist=JSON.parse(fs.readFileSync(path.join(dir,file),'utf8'));
  const suffix=file.slice('research-historical-racelist-'.length,-'.json'.length);
  const resultFile=path.join(dir,'research-result-'+suffix+'-structure.json');
  const result=fs.existsSync(resultFile)?JSON.parse(fs.readFileSync(resultFile,'utf8')):null;
  const joined=joinHistoricalRacelistAndResults(racelist,result);
  results.push({date:racelist.date,venue:racelist.venue,race:racelist.race,...joined});
 }
 return {status:'historical_racelist_result_identity_audit',races:results.length,
  matchedRaces:results.filter(r=>r.matchedRacers===6).length,
  matchedRacers:results.reduce((n,r)=>n+r.matchedRacers,0),results,
  fullCurrentScoreReplayReady:0,eligibleForCalibration:false};
}
if(process.argv[1]&&path.resolve(process.argv[1])===path.resolve(new URL(import.meta.url).pathname)){
 const dir=process.argv[2]||'prediction-captures';
 const report=auditHistoricalBatch(dir);
 fs.writeFileSync(path.join(dir,'historical-racelist-result-join.json'),JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({status:report.status,races:report.races,matchedRaces:report.matchedRaces,matchedRacers:report.matchedRacers,fullCurrentScoreReplayReady:0}));
}
