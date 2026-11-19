// Research-only audit of archived deployed-predictor responses.
// Do not reconstruct original input features from precomputed scores.
const validDate=x=>/^20\d{6}$/.test(String(x));
export function auditArchivedCapture(capture){
 if(!capture||!Array.isArray(capture.records))return {status:'invalid_input'};
 const reasons={},seen=new Set();let ready=0,withSixScores=0,withOriginalInputs=0,duplicateKeys=0;
 const add=k=>{reasons[k]=(reasons[k]||0)+1};
 for(const row of capture.records){
  const key=[row?.date,row?.venue,row?.race].join(':');
  if(seen.has(key)){duplicateKeys++;add('duplicate_race');continue;}
  seen.add(key);
  if(!validDate(row?.date)||!Number.isInteger(row?.venue)||row.venue<1||row.venue>24||
    !Number.isInteger(row?.race)||row.race<1||row.race>12){add('invalid_race_identity');continue;}
  if(row?.httpStatus!==200||row?.response?.ready!==true){add('not_ready');continue;}
  ready++;
  const scores=row.response.rankedScores;
  if(Array.isArray(scores)&&scores.length===6&&new Set(scores.map(x=>x.boat)).size===6&&
    scores.every(x=>Number.isInteger(x.boat)&&x.boat>=1&&x.boat<=6&&Number.isFinite(x.score)))
    withSixScores++;
  else add('missing_six_ranked_scores');
  const inputs=row.response.scoreInputsByBoat;
  if(Array.isArray(inputs)&&inputs.length===6&&new Set(inputs.map(x=>x.boat)).size===6&&
    inputs.every(x=>Number.isInteger(x.boat)&&x.boat>=1&&x.boat<=6&&
      ['nationalWinRate','localWinRate','motorTwoWinRate','recent50WinRate','exhibitionScore',
       'averageStartTiming','entryCourse'].every(k=>Number.isFinite(x[k])))){
    withOriginalInputs++;
  }else add('missing_original_six_boat_inputs');
  if(!row.response.preRaceSourceVerified||!row.response.officialCutoffVerified)
    add('pre_race_provenance_not_authenticated');
 }
 return {status:'audited',date:capture.date,attempted:capture.records.length,ready,
  withSixScores,withOriginalInputs,duplicateKeys,reasons,
  eligibleForHistoricalWeightTuning:0,
  warning:'Raw predictions are not independently authenticated pre-race snapshots or official results. Original six-racer inputs are required. No score tuning is authorized.'};
}
