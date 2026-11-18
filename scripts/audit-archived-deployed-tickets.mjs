// Research-only exact replay of the deployed 56/29/15 trifecta ticket selector.
// Checks archived final rankedScores, including any already-applied adjustments.
// This is NOT a pre-race accuracy check or a reconstruction of raw feature weights.
export function auditArchivedDeployedTickets(capture){
 if(!capture||!Array.isArray(capture.records))throw Error('Expected capture.records');
 const result={date:capture.date,attempted:capture.records.length,ready:0,matched:0,mismatched:0,invalid:0,changedFromBase:0,examples:[],
  preRaceVerified:false,weightCalibrationEligible:false,
  warning:'Archived rankedScores replay only. No verified cutoff, original raw inputs or official results; no accuracy or weight improvement claims.'};
 for(const record of capture.records){
  const response=record?.response;
  if(response?.ready!==true)continue;
  result.ready++;
  const scores=response.rankedScores;
  if(!Array.isArray(scores)||scores.length!==6||new Set(scores.map(x=>x?.boat)).size!==6||
   scores.some(x=>!Number.isInteger(x.boat)||x.boat<1||x.boat>6||!Number.isFinite(x.score))){
   result.invalid++;continue;
  }
  const map=new Map(scores.map(x=>[x.boat,x.score])),all=[];
  for(let a=1;a<=6;a++)for(let b=1;b<=6;b++)for(let c=1;c<=6;c++){
   if(a===b||a===c||b===c)continue;
   all.push({boats:[a,b,c],strength:map.get(a)*.56+map.get(b)*.29+map.get(c)*.15});
  }
  all.sort((x,y)=>y.strength-x.strength||x.boats.join('').localeCompare(y.boats.join('')));
  const main=all.slice(0,6).map(x=>x.boats),used=new Set(main.map(x=>x.join('-')));
  const upset=all.filter(x=>x.boats[0]>=4&&!used.has(x.boats.join('-'))).slice(0,6).map(x=>x.boats);
  const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
  const match=equal(main,response.main)&&equal(upset,response.upset);
  result[match?'matched':'mismatched']++;
  if(response.predictionChanged===true)result.changedFromBase++;
  if(!match&&result.examples.length<10)result.examples.push({date:record.date,venue:record.venue,race:record.race});
 }
 return result;
}
