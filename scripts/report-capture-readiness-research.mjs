// Research-only evidence inventory. Never interprets captured responses as verified pre-race predictions.
import fs from 'node:fs';
import path from 'node:path';

export function summarizeCaptureReadiness(capture) {
  if (!Array.isArray(capture?.records)) throw Error('Expected capture.records');
  const counts={attempted:capture.records.length,ready:0,failedOrNotReady:0,missingReceiveTime:0,
    capturedOutsideMorningWindow:0,missingRankedScores:0,missingSixOriginalInputs:0};
  const byVenue={};
  for(const r of capture.records){
    const venue=String(r.venue??'unknown');
    const row=byVenue[venue]??={attempted:0,ready:0};
    row.attempted++;
    if(r.response?.ready!==true){counts.failedOrNotReady++;continue;}
    counts.ready++;row.ready++;
    // Original feature vectors are not exposed by the archived capture contract.\n    counts.missingSixOriginalInputs++;\n    if(!Array.isArray(r.response.rankedScores)||r.response.rankedScores.length!==6)counts.missingRankedScores++;\n    const received=Date.parse(r.receivedAt??'');
    if(!Number.isFinite(received)){counts.missingReceiveTime++;continue;}
    const jst=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Tokyo',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date(received));
    if(jst<'07:45'||jst>'08:30')counts.capturedOutsideMorningWindow++;
    if(!Array.isArray(r.response.rankedScores)||r.response.rankedScores.length!==6)counts.missingRankedScores++;
    // Ranked scores are outputs, never substitute for the six original feature vectors.
    counts.missingSixOriginalInputs++;
  }
  return {date:capture.date??null,counts,byVenue,verifiedPreRace:0,eligibleForWeightTuning:0,
    warning:'Read-only capture diagnostics. Morning clock timing does not authenticate official race cutoffs; rankedScores cannot reconstruct original feature inputs. No hit-rate or calibration claims.'};
}
if(process.argv[1]&&path.resolve(process.argv[1])===path.resolve(new URL(import.meta.url).pathname)){
  const file=process.argv[2];
  if(!file)throw Error('Usage: node scripts/report-capture-readiness-research.mjs capture.json');
  console.log(JSON.stringify(summarizeCaptureReadiness(JSON.parse(fs.readFileSync(file,'utf8'))),null,2));
}
