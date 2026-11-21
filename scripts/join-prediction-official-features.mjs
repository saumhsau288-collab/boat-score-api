#!/usr/bin/env node
// Research-only join. Never label separately captured official data as inputs used by deployed model.
import fs from 'node:fs';
const key=r=>[r?.date,r?.venue,r?.race].join(':');
const valid=r=>/^20\d{6}$/.test(String(r?.date))&&Number.isInteger(Number(r?.venue))&&Number(r.venue)>=1&&Number(r.venue)<=24&&Number.isInteger(Number(r?.race))&&Number(r.race)>=1&&Number(r.race)<=12;
const timestamp=x=>typeof x==='string'&&/^20\d{2}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(x)&&Number.isFinite(Date.parse(x));
export function joinPredictionAndOfficialFeatures(captures,officialSnapshots){
 if(!Array.isArray(captures?.records)||!Array.isArray(officialSnapshots))throw Error('records_and_snapshots_required');
 const byKey=new Map();
 for(const s of officialSnapshots){if(!valid(s))continue;const k=key(s);if(!byKey.has(k))byKey.set(k,[]);byKey.get(k).push(s);}
 const rows=captures.records.filter(c=>valid(c)&&c?.httpStatus===200&&c?.response?.ready===true).map(c=>{
  const candidates=byKey.get(key(c))??[];
  const usable=candidates.filter(s=>s.status==='captured_research_inputs'&&Array.isArray(s.racers)&&s.racers.length===6&&timestamp(s.receivedAt));
  const selected=usable.length===1?usable[0]:null;
  const officialCapturedBeforePrediction=!!selected&&timestamp(c.receivedAt)&&Date.parse(selected.receivedAt)<=Date.parse(c.receivedAt);
  return {date:c.date,venue:Number(c.venue),race:Number(c.race),predictionReceivedAt:c.receivedAt??null,
   predictionResponseSha256:c.responseSha256??null,officialSnapshotCount:candidates.length,usableOfficialSnapshots:usable.length,
   officialReceivedAt:selected?.receivedAt??null,officialResponseSha256:selected?.responseSha256??null,
   officialCapturedBeforePrediction,originalInputsVerified:false,usedByDeployedPredictor:'unverified',
   independentlyAuthenticatedBeforeRace:false,eligibleForCalibration:false};
 });
 return {readyPredictions:rows.length,withUsableOfficialSnapshot:rows.filter(x=>x.usableOfficialSnapshots===1).length,
  officialCapturedBeforePrediction:rows.filter(x=>x.officialCapturedBeforePrediction).length,
  originalInputsVerified:0,eligibleForCalibration:0,rows,
  warning:'Official snapshots are separately captured observations, not proven deployed predictor inputs. Time ordering does not authenticate model feature provenance.'};
}
if(process.argv[1]&&import.meta.url===new URL('file://'+process.argv[1]).href){
 const [capturePath,...snapshotPaths]=process.argv.slice(2);
 if(!capturePath||!snapshotPaths.length)throw Error('Usage: node scripts/join-prediction-official-features.mjs capture.json official-snapshot.json [...]');
 console.log(JSON.stringify(joinPredictionAndOfficialFeatures(JSON.parse(fs.readFileSync(capturePath,'utf8')),snapshotPaths.map(p=>JSON.parse(fs.readFileSync(p,'utf8')))),null,2));
}
