// Research-only local append-only morning evidence. Single writer required.
// SHA256 detects content modification, not authentic official provenance.
import fs from 'node:fs';
import {createHash} from 'node:crypto';
const sha=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const key=e=>[e.date,e.venue,e.race,e.capturedAt].join(':');
export function readMorningEvidenceDrafts(file){
 const rows=fs.readFileSync(file,'utf8').split('\n').filter(x=>x.trim());
 const records=[],seen=new Set();
 for(const [index,line] of rows.entries()){
  let record;
  try{record=JSON.parse(line);}catch{throw Error('Malformed morning record at line '+(index+1));}
  if(record?.envelope?.phase!=='morning'||record?.envelope?.source!=='research_only_unverified'||
   record?.envelope?.eligibleForVerifiedAccuracy!==false||record?.envelope?.methodCount!==0||
   record?.envelope?.predictedMethods===undefined||
   record?.sha256!==sha(record.envelope))throw Error('Morning integrity failure at line '+(index+1));
  const k=key(record.envelope);
  if(seen.has(k))throw Error('Duplicate morning capture at line '+(index+1));
  seen.add(k);records.push(record);
 }
 return {count:records.length,records,verifiedOfficialSources:false};
}
export function appendMorningEvidenceDraft(file,sealed){
 if(sealed?.saved!==false||sealed?.envelope?.phase!=='morning'||
   sealed?.sha256!==sha(sealed.envelope))throw Error('Invalid sealed morning draft');
 const existing=fs.existsSync(file)?readMorningEvidenceDrafts(file).records:[];
 if(existing.some(r=>key(r.envelope)===key(sealed.envelope)))throw Error('Duplicate morning capture');
 // Append is not atomic across competing processes. Use one writer only.
 fs.appendFileSync(file,JSON.stringify({sha256:sealed.sha256,envelope:sealed.envelope})+'\n',{encoding:'utf8',flag:'a'});
 return {appended:true,count:existing.length+1,verifiedOfficialSources:false};
}
