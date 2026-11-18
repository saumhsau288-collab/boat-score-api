#!/usr/bin/env node
// Research-only capture diagnostics. Never infer authentic pre-race performance.
import fs from 'node:fs';
import path from 'node:path';

export function summarizeCapture(data) {
  if (!Array.isArray(data?.records)) throw new Error('Capture records missing');
  const counts={attempted:data.records.length,networkTimeout:0,otherNetworkError:0,httpFailure:0,notReady:0,ready:0,readyWithMissingInputs:0,readyWithNoReportedMissingInputs:0};
  const missingInputLabels={};
  const notReadyReasons={};
  for(const record of data.records) {
    if(record.error) {
      if(/timeout|timed out/i.test(record.error)) counts.networkTimeout++;
      else counts.otherNetworkError++;
    } else if(record.httpStatus!==200) {
      counts.httpFailure++;
    } else if(record.response?.ready===true) {
      counts.ready++;
      if(Array.isArray(record.response.missingInputs)) {
        if(record.response.missingInputs.length) counts.readyWithMissingInputs++;
        else counts.readyWithNoReportedMissingInputs++;
        for(const label of new Set(record.response.missingInputs)) {
          const key=String(label);
          missingInputLabels[key]=(missingInputLabels[key]||0)+1;
        }
      }
    } else {
      counts.notReady++;
      const reason=String(record.response?.reason||'not_reported');
      notReadyReasons[reason]=(notReadyReasons[reason]||0)+1;
    }
  }
  return {date:data.date||null,captureTimeJst:data.captureTimeJst||null,scheduledMorningWindow:data.scheduledMorningWindow===true,
    counts,missingInputLabels,notReadyReasons,
    authenticatedBeforeRace:false,accuracyCalculationPermitted:false,
    warning:'Read-only capture outcomes are not prediction accuracy or verified pre-race evidence. Missing labels are self-reported and do not prove every input was used.'};
}

if(process.argv[1]&&path.resolve(process.argv[1])===path.resolve(new URL(import.meta.url).pathname)) {
  const source=process.argv[2];
  if(!source) throw new Error('Pass a raw capture JSON path');
  const result=summarizeCapture(JSON.parse(fs.readFileSync(source,'utf8')));
  const target=source.replace(/\.json$/,'-diagnostics.json');
  fs.writeFileSync(target,JSON.stringify(result,null,2)+'\n');
  console.log(JSON.stringify({target,...result},null,2));
}
