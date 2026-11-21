// Offline experimental weight tuning on independently prepared historical feature rows.
// This does not recreate or alter the deployed predictor. Never fit on evaluation races.
function isOfficialSource(value){
 try{const u=new URL(value);return u.protocol==='https:'&&(u.hostname==='boatrace.jp'||u.hostname.endsWith('.boatrace.jp'))&&!u.username&&!u.password;}catch{return false;}
}
function officialResultMatchesRace(row){
 try{const u=new URL(row.officialResultSourceUrl);return u.protocol==='https:'&&u.hostname==='www.boatrace.jp'&&u.pathname==='/owpc/pc/race/raceresult'&&!u.username&&!u.password&&['hd','jcd','rno'].every(k=>u.searchParams.getAll(k).length===1)&&u.searchParams.get('hd')===String(row.date)&&Number(u.searchParams.get('jcd'))===row.venue&&Number(u.searchParams.get('rno'))===row.race;}
 catch{return false;}
}
function offsetTime(s){return typeof s==='string'&&/T\\d{2}:\\d{2}:\\d{2}(?:\\.\\d+)?(?:Z|[+-]\\d{2}:\\d{2})$/.test(s)&&Number.isFinite(Date.parse(s));}
function jstDate(iso){
 const d=new Date(iso);
 if(!Number.isFinite(d.getTime()))return null;
 const parts=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Tokyo',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(d).filter(p=>p.type!=='literal').map(p=>[p.type,p.value]));
 return parts.year+parts.month+parts.day;
}
export const FIELDS=['nationalWinRate','localWinRate','motorTwoWinRate','recent50WinRate','exhibitionScore'];
export function tuneHistoricalWeights(rows,{trainEndDate,baselineWeights,candidates}={}){
 if(!/^20\d{6}$/.test(String(trainEndDate)))throw Error('Training cutoff YYYYMMDD required');
 if(!Array.isArray(rows)||!Array.isArray(candidates)||!candidates.length)throw Error('Rows and candidates required');
 const validWeights=w=>w&&FIELDS.every(f=>typeof w[f]==='number'&&Number.isFinite(w[f])&&w[f]>=0)&&FIELDS.some(f=>w[f]>0);
 if(!validWeights(baselineWeights)||candidates.some(w=>!validWeights(w)))throw Error('Invalid weights');
 const train=[],test=[],excluded=[];
 const counts=new Map();
 for(const row of rows){const key=[row?.date,row?.venue,row?.race].join(':');if(Number.isInteger(row?.venue)&&Number.isInteger(row?.race))counts.set(key,(counts.get(key)||0)+1);}
 for(const row of rows){
  const boats=row?.boats,actual=row?.actual;
  const valid=/^20\d{6}$/.test(String(row?.date))&&Array.isArray(boats)&&boats.length===6&&
   new Set(boats.map(b=>b?.boat)).size===6&&boats.every(b=>Number.isInteger(b?.boat)&&b.boat>=1&&b.boat<=6&&FIELDS.every(f=>typeof b[f]==='number'&&Number.isFinite(b[f])&&b[f]>=0))&&
   Array.isArray(actual)&&actual.length===3&&actual.every(n=>Number.isInteger(n)&&n>=1&&n<=6)&&new Set(actual).size===3&&
   row?.independentlyVerifiedResult===true&&row?.historicalInputProvenanceVerified===true&&
   typeof row?.historicalInputSourceUrl==='string'&&isOfficialSource(row.historicalInputSourceUrl)&&
   officialResultMatchesRace(row)&&
   offsetTime(row?.historicalInputCapturedAt)&&offsetTime(row?.officialCutoffAt)&&
   Date.parse(row.historicalInputCapturedAt)<Date.parse(row.officialCutoffAt)&&
   jstDate(row.historicalInputCapturedAt)===row.date&&jstDate(row.officialCutoffAt)===row.date;
  if(!valid){excluded.push({date:row?.date??null,reason:'missing_verified_historical_inputs_or_result'});continue;}
  const key=[row.date,row.venue,row.race].join(':');
  if(!Number.isInteger(row.venue)||row.venue<1||row.venue>24||!Number.isInteger(row.race)||row.race<1||row.race>12||counts.get(key)!==1){excluded.push({date:row.date,reason:'invalid_or_duplicate_race_key'});continue;}
  (row.date<=trainEndDate?train:test).push(row);
 }
 if(!train.length||!test.length)throw Error('Independent training and later evaluation races required');
 const score=(row,w)=>row.boats.map(b=>({boat:b.boat,score:FIELDS.reduce((s,f)=>s+b[f]*w[f],0)})).sort((a,b)=>b.score-a.score||a.boat-b.boat).slice(0,3).map(x=>x.boat);
 const measure=(subset,w)=>({races:subset.length,exactTop3:subset.filter(r=>JSON.stringify(score(r,w))===JSON.stringify(r.actual)).length,
  top3BoatOverlap:subset.reduce((sum,r)=>sum+score(r,w).filter(n=>r.actual.includes(n)).length,0)});
 const ranked=candidates.map((w,index)=>({index,weights:w,train:measure(train,w)})).sort((a,b)=>b.train.exactTop3-a.train.exactTop3||b.train.top3BoatOverlap-a.train.top3BoatOverlap||a.index-b.index);
 const best=ranked[0];
 return {method:'offline_weight_research_time_split',trainEndDate,excluded,trainRaces:train.length,testRaces:test.length,
  baseline:{weights:baselineWeights,train:measure(train,baselineWeights),test:measure(test,baselineWeights)},
  candidate:{weights:best.weights,train:best.train,test:measure(test,best.weights)},
  evaluationChange:{exactTop3:measure(test,best.weights).exactTop3-measure(test,baselineWeights).exactTop3,top3BoatOverlap:measure(test,best.weights).top3BoatOverlap-measure(test,baselineWeights).top3BoatOverlap},
  approvedForDeployment:false,warning:'Experimental ranking proxy only, not deployed Boat Score 2 trifecta prediction. Evaluation races never used to select weights. Independent provenance flags must be backed by evidence.'};
}
