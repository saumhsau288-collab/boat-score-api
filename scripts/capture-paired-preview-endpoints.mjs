// Read-only paired capture of existing preview endpoints. Never certifies pre-race provenance.
import fs from 'node:fs';
import crypto from 'node:crypto';
import {joinPredictionWithOfficialSource} from './join-prediction-official-source.mjs';
const date=process.env.CAPTURE_DATE,venue=Number(process.env.CAPTURE_VENUE),race=Number(process.env.CAPTURE_RACE);
if(!/^20\d{6}$/.test(date??'')||!Number.isInteger(venue)||venue<1||venue>24||!Number.isInteger(race)||race<1||race>12)throw Error('Invalid race selection');
const base='https://boat-score-2-preview.saumh-sau-288.workers.dev';
const read=async(path,query)=>{
 const url=new URL(path,base);url.search=new URLSearchParams(query).toString();
 const requestedAt=new Date().toISOString();
 try{
  const response=await fetch(url,{headers:{Accept:'application/json'},signal:AbortSignal.timeout(15000)});
  const body=await response.text(),receivedAt=new Date().toISOString();
  let json;try{json=JSON.parse(body)}catch{json=null}
  return {requestedAt,receivedAt,httpStatus:response.status,responseSha256:crypto.createHash('sha256').update(body).digest('hex'),response:json,
   validJson:json!==null,sourcePath:path};
 }catch(e){return {requestedAt,receivedAt:new Date().toISOString(),error:String(e?.message??e),sourcePath:path};}
};
const query={date,venue:String(venue),race:String(race)};
const prediction=await read('/api/predict/selected-race',{...query,mode:'beforeinfo'});
const official=await read('/api/official/race-data',query);
const joined=joinPredictionWithOfficialSource(
 {...prediction.response,capturedAt:prediction.receivedAt,cutoffAt:null},
 {...official.response,capturedAt:official.receivedAt},'morning');
const output={schemaVersion:1,date,venue,race,workflowRunId:process.env.GITHUB_RUN_ID??null,
 prediction,official,joined,independentlyAuthenticatedCapture:false,officialCutoffVerified:false,
 officialResultVerified:false,accuracyEligible:false,
 warning:'Two read-only HTTP captures, not independently authenticated pre-race evidence. Cutoff is not supplied or inferred.'};
fs.mkdirSync('prediction-captures',{recursive:true});
const filename='prediction-captures/paired-'+date+'-'+venue+'-'+race+'-'+(process.env.GITHUB_RUN_ID??'local')+'.json';
fs.writeFileSync(filename,JSON.stringify(output,null,2)+'\n');
console.log(JSON.stringify({filename,predictionHttp:prediction.httpStatus??null,officialHttp:official.httpStatus??null,
 joined:joined.joined,joinStatus:joined.status,sourceCompleteness:joined.sourceCompleteness??null,
 accuracyEligible:false}));
