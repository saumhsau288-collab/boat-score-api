// Post-race diagnostic ONLY: compare stored ticket strings with separately obtained finishing orders.
// This is not a prospective hit-rate test; requests made after the race can leak results.
const key=r=>[r?.date,r?.venue,r?.race].join(':');
const validPodium=p=>Array.isArray(p)&&p.length===3&&new Set(p).size===3&&p.every(n=>Number.isInteger(n)&&n>=1&&n<=6);
const validTickets=p=>Array.isArray(p)&&p.length===6&&p.every(validPodium);
export function compareRetrospectiveTickets(capture,officialRows){
 if(!Array.isArray(capture?.records)||!Array.isArray(officialRows))throw Error('Capture records and official rows required');
 const byKey=new Map(),counts=new Map(),predCounts=new Map();
 for(const r of officialRows){const k=key(r);counts.set(k,(counts.get(k)||0)+1);byKey.set(k,r);}
 for(const r of capture.records){const k=key(r);predCounts.set(k,(predCounts.get(k)||0)+1);}
 const report={mode:'POST_RACE_DIAGNOSTIC_NOT_FORECAST_ACCURACY',storedPredictions:capture.records.length,
  joined:0,compared:0,mainContains:0,upsetContains:0,eitherContains:0,excluded:{},examples:[],
  preRaceAccuracy:null,eligibleForWeightTuning:false};
 const exclude=reason=>{report.excluded[reason]=(report.excluded[reason]||0)+1;};
 for(const r of capture.records){
  const k=key(r),o=byKey.get(k);
  if(!o){exclude('no_result_row');continue;}
  report.joined++;
  if(counts.get(k)!==1||predCounts.get(k)!==1){exclude('duplicate_race');continue;}
  const podium=o.actual??o.podium;
  if(!validPodium(podium)||o.resultVerified!==true){exclude('result_not_verified');continue;}
  if(r.response?.ready!==true||!validTickets(r.response.main)||!validTickets(r.response.upset)){exclude('invalid_saved_prediction');continue;}
  const target=podium.join('-');
  const main=r.response.main.some(p=>p.join('-')===target),upset=r.response.upset.some(p=>p.join('-')===target);
  report.compared++;report.mainContains+=Number(main);report.upsetContains+=Number(upset);report.eitherContains+=Number(main||upset);
  if(report.examples.length<20)report.examples.push({date:r.date,venue:r.venue,race:r.race,podium:target,mainContains:main,upsetContains:upset,requestedAt:r.requestedAt??null});
 }
 return report;
}
