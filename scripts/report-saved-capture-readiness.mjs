#!/usr/bin/env node
// Research-only inventory of saved deployed predictor responses; never infer pre-race authenticity.
import fs from 'node:fs';
const file=process.argv[2];
if(!file){console.error('Usage: node scripts/report-saved-capture-readiness.mjs saved-capture.json');process.exit(2);}
const data=JSON.parse(fs.readFileSync(file,'utf8'));
if(!Array.isArray(data.records))throw new Error('Expected records array from saved predictor capture');
const rows=data.records.map(x=>({
 date:x.date,venue:x.venue,race:x.race,httpStatus:x.httpStatus??null,
 receivedAt:x.receivedAt??null,ready:x.response?.ready===true,
 responseHashPresent:/^[a-f0-9]{64}$/.test(String(x.responseSha256??'')),
 originalPredictorInputsVerified:false,
 independentlyVerifiedPreRaceAverageST:false,
 independentlyVerifiedMakulabo50:false,
 eligibleForCalibration:false,
 reason:x.error?'request_failed':x.response?.ready!==true?'predictor_not_ready':'original_inputs_not_authenticated'
}));
const summary={captureDate:data.date??null,total:rows.length,ready:rows.filter(x=>x.ready).length,
 hashPresent:rows.filter(x=>x.responseHashPresent).length,
 originalPredictorInputsVerified:0,eligibleForCalibration:0,
 note:'A saved response and hash prove neither source freshness nor which inputs the predictor used. Independent pre-race source capture and model input provenance remain necessary.',
 records:rows};
console.log(JSON.stringify(summary,null,2));
