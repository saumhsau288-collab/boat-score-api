// Read-only reporting of actual capture readiness. Does not authenticate cutoff candidates.
import fs from 'node:fs';
const dir=process.argv[2]||'prediction-captures';
const names=fs.readdirSync(dir).filter(x=>/^20\d{6}-\d+\.json$/.test(x));
if(names.length!==1)throw Error('Expected one raw capture; found '+names.length);
const rawName=names[0],prefix=rawName.slice(0,-5);
const load=suffix=>{const p=dir+'/'+prefix+suffix+'.json';return fs.existsSync(p)?JSON.parse(fs.readFileSync(p,'utf8')):null;};
const raw=load(''),diagnostics=load('-diagnostics'),timing=load('-cutoff-candidates'),readiness=load('-calibration-readiness'),replay=load('-deployed-ticket-replay');
const ready=raw.records.filter(r=>r.response?.ready===true).length;
const rows=['### Morning capture evidence: '+raw.date,'','| Evidence | Count |','|---|---:|',
'| Requests attempted | '+raw.records.length+' |','| Ready predictions | '+ready+' |',
'| Network timeouts | '+(diagnostics?.counts?.networkTimeout??'not recorded')+' |',
'| Requests retried | '+(diagnostics?.counts?.retried??'not recorded')+' |',
'| Recovered after retry | '+(diagnostics?.counts?.recoveredAfterRetry??'not recorded')+' |',
'| Before UNVERIFIED cutoff candidate | '+(timing?.counts?.readyBeforeCandidate??'not recorded')+' |',
'| At/after UNVERIFIED cutoff candidate | '+(timing?.counts?.readyAfterCandidate??'not recorded')+' |',
'| Candidate timing unavailable | '+(timing?.counts?.readyMissingCandidate??'not recorded')+' |',
'| Deployed 12-ticket replay matched | '+(replay?.matched??'not recorded')+' |',
'| Deployed 12-ticket replay mismatched | '+(replay?.mismatched??'not recorded')+' |',
'| Verified eligible for weight tuning | '+(readiness?.eligibleForWeightTuning??'not recorded')+' |',
'','Candidate timestamps are NOT independently verified official deadlines. Replay parity is NOT accuracy. Missing source inputs and official finish prevent calibration.'];
const result=rows.join('\n')+'\n';
process.stdout.write(result);
if(process.env.GITHUB_STEP_SUMMARY)fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,result);
