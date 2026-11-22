import {open,mkdir} from 'node:fs/promises';
import {join} from 'node:path';
import {assessProspectiveAdmission} from './assess-prospective-admission.mjs';

// Research-only filesystem writer. Atomic exclusive creation; never overwrite.
// The caller is responsible for official-source authentication and running this pre-race.
const iso=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(s)&&Number.isFinite(Date.parse(s));
const triple=x=>Array.isArray(x)&&x.length===3&&new Set(x).size===3&&x.every(n=>Number.isInteger(n)&&n>=1&&n<=6);
export async function saveLockedProspectivePrediction(directory,prediction,{now=()=>new Date()}={}){
 const p=prediction;
 if(!/^20\d{6}$/.test(String(p?.date))||String(p.date)<'20261122'||!Number.isInteger(p.venue)||p.venue<1||p.venue>24||!Number.isInteger(p.race)||p.race<1||p.race>12)throw new Error('invalid race identity');
 const gate=assessProspectiveAdmission(p.capture,p.verification);
 if(!gate.admitted)throw new Error('capture not admitted: '+gate.reason);
 if(gate.snapshot.date!==p.date||gate.snapshot.venue!==p.venue||gate.snapshot.race!==p.race)throw new Error('capture identity mismatch');
 if(!iso(p.predictedAt)||!iso(p.verification.verifiedAt)||Date.parse(p.predictedAt)<Date.parse(gate.snapshot.capturedAt)||Date.parse(p.verification.verifiedAt)>Date.parse(p.predictedAt)||Date.parse(p.predictedAt)>=Date.parse(gate.snapshot.scheduledStartAt))throw new Error('invalid prediction timing');
 if(p.ruleVersion!=='inner-challenger-frozen-20261122'||!triple(p.predictedTrifecta)||p.predictedFirst!==p.predictedTrifecta[0])throw new Error('invalid frozen prediction');
 const writeTime=now();
 if(!(writeTime instanceof Date)||!Number.isFinite(writeTime.getTime())||writeTime.getTime()>=Date.parse(gate.snapshot.scheduledStartAt)||writeTime.getTime()<Date.parse(p.predictedAt))throw new Error('write must occur after prediction and before scheduled start');
 const filename=[p.date,String(p.venue).padStart(2,'0'),String(p.race).padStart(2,'0')].join('-')+'.json';
 await mkdir(directory,{recursive:true});
 const path=join(directory,filename);
 const handle=await open(path,'wx',0o600);
 try{await handle.writeFile(JSON.stringify({schemaVersion:1,...p,writtenAt:writeTime.toISOString()},null,2)+'\n');}
 finally{await handle.close();}
 return {path,created:true,warning:'Exclusive file creation prevents overwrite on this filesystem only. Remote immutable archival and genuine pre-race capture must be verified separately.'};
}
