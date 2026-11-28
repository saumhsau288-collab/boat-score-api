// Research-only NDJSON reader. Integrity checking is local and not proof of
// authenticated pre-race capture. Never rewrite or repair stored records.
import fs from 'node:fs';
import {createHash} from 'node:crypto';
const sha=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
export function readIndependentResearchDrafts(file) {
 const lines=fs.readFileSync(file,'utf8').split('\n').filter(x=>x.trim());
 const records=[],seen=new Set();
 for(const [i,line] of lines.entries()){
  let entry;
  try {entry=JSON.parse(line);}catch{throw Error('Malformed NDJSON line '+(i+1));}
  if(!entry?.draft?.evidence || !entry?.draft?.prediction ||
     typeof entry.sha256!=='string'||sha(entry.draft)!==entry.sha256)
    throw Error('Stored draft integrity failure at line '+(i+1));
  const e=entry.draft.evidence,key=[e.date,e.venue,e.race,e.capturedAt].join(':');
  if(seen.has(key))throw Error('Duplicate stored capture at line '+(i+1));
  seen.add(key);
  records.push(entry);
 }
 return {count:records.length,records,verifiedOfficialSources:false,
  note:'Hash integrity checked. Stored assertions do not prove collection timing, provenance, or predictive accuracy.'};
}
