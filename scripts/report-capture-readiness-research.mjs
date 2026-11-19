// Research-only evidence inventory. Never interprets captured responses as verified pre-race predictions.
import fs from 'node:fs';
import path from 'node:path';

export function summarizeCaptureReadiness(capture) {
  if (!Array.isArray(capture?.records)) throw Error('Expected capture.records');
  if (capture.authenticatedBeforeRace !== false) throw Error('Expected explicitly unauthenticated raw capture');
  if (capture.attempted !== capture.records.length) throw Error('Capture attempted count mismatch');
  if (!/^20\d{6}$/.test(String(capture.date??''))) throw Error('Invalid capture date');
  const counts={attempted:capture.records.length,ready:0,failedOrNotReady:0,missingReceiveTime:0,
    capturedOutsideMorningWindow:0,missingRankedScores:0,missingSixOriginalInputs:0};
  const byVenue={};
  for(const r of capture.records){
    const venue=String(r.venue??'unknown');
    const row=byVenue[venue]??={attempted:0,ready:0};
    row.attempted++;
    if(r.response?.ready!==true){counts.failedOrNotReady++;continue;}
    counts.ready++;row.ready++;
    // Only explicit six-boat source fields count as input evidence.
    const boats=r.response.scoreInputsByBoat;
    const fields=['nationalWinRate','localWinRate','motorTwoWinRate','recent50WinRate','exhibitionScore'];
    const limits=[10,10,100,100,100];
    const complete=Array.isArray(boats)&&boats.length===6&&
      new Set(boats.map(b=>b?.boat)).size===6&&
      boats.every(b=>Number.isInteger(b?.boat)&&b.boat>=1&&b.boat<=6&&
        fields.every((field,i)=>typeof b[field]==='number'&&Number.isFinite(b[field])&&
          b[field]>=0&&b[field]<=limits[i]));
    if(!complete)counts.missingSixOriginalInputs++;
    if(!Array.isArray(r.response.rankedScores)||r.response.rankedScores.length!==6)counts.missingRankedScores++;
    const received=Date.parse(r.receivedAt??'');
    if(!Number.isFinite(received)){counts.missingReceiveTime++;continue;}
    const receivedDate=new Date(received);
    const parts=Object.fromEntries(new Intl.DateTimeFormat('en-GB',{
      timeZone:'Asia/Tokyo',year:'numeric',month:'2-digit',day:'2-digit',
      hour:'2-digit',minute:'2-digit',hourCycle:'h23'
    }).formatToParts(receivedDate).filter(p=>p.type!=='literal').map(p=>[p.type,p.value]));
    const jstDate=parts.year+parts.month+parts.day;
    const jstTime=parts.hour+':'+parts.minute;
    if(jstDate!==String(capture.date)||jstTime<'07:45'||jstTime>'08:30')
      counts.capturedOutsideMorningWindow++;
  }
  return {date:capture.date??null,counts,byVenue,verifiedPreRace:0,eligibleForWeightTuning:0,
    warning:'Read-only capture diagnostics. Morning clock timing does not authenticate official race cutoffs; rankedScores cannot reconstruct original feature inputs. No hit-rate or calibration claims.'};
}
if(process.argv[1]&&path.resolve(process.argv[1])===path.resolve(new URL(import.meta.url).pathname)){
  const file=process.argv[2];
  if(!file)throw Error('Usage: node scripts/report-capture-readiness-research.mjs capture.json');
  console.log(JSON.stringify(summarizeCaptureReadiness(JSON.parse(fs.readFileSync(file,'utf8'))),null,2));
}
