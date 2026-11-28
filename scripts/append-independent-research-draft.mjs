// Research-only append-only local NDJSON storage. No KV, deployed API, or scheduler writes.
import fs from 'node:fs';
import {createHash} from 'node:crypto';
const hash=s=>createHash('sha256').update(s).digest('hex');
const keyOf=x=>[x?.draft?.evidence?.date,x?.draft?.evidence?.venue,
 x?.draft?.evidence?.race,x?.draft?.evidence?.capturedAt].join(':');
export function appendResearchDraft(file,draft){
 if(!draft?.draft?.evidence||!draft?.draft?.prediction||typeof draft.sha256!=='string')
   throw Error('Missing sealed draft');
 const canonical=JSON.stringify(draft.draft);
 if(hash(canonical)!==draft.sha256)throw Error('Draft hash mismatch');
 if(!/^([a-f0-9]{64})$/.test(draft.sha256))throw Error('Invalid SHA256');
 const key=keyOf(draft);
 // A single writer is required. Append mode does not prevent concurrent writers,
 // duplicate races, or partial writes; this is not a transactional store.
 const existing=fs.existsSync(file)?fs.readFileSync(file,'utf8').trim().split('\n').filter(Boolean).map(JSON.parse):[];
 for(const entry of existing){
  if(hash(JSON.stringify(entry.draft))!==entry.sha256)throw Error('Existing record integrity failure');
  if(keyOf(entry)===key)throw Error('Duplicate race capture');
 }
 fs.appendFileSync(file,JSON.stringify({sha256:draft.sha256,draft:draft.draft})+'\n',{encoding:'utf8',flag:'a'});
 return {appended:true,count:existing.length+1,key,sha256:draft.sha256,
  note:'Local research-only append; not authenticated, durable KV, or concurrency safe.'};
}
