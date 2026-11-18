#!/usr/bin/env node
// Research diagnostics only. Unverified result candidates must NEVER become accuracy or weight-tuning evidence.
import fs from 'node:fs';
const key=r=>[String(r?.date),Number(r?.venue),Number(r?.race)].join(':');
const sourceMatchesRace=(e,r)=>{try{const u=new URL(e.sourceUrl);return u.protocol==='https:'&&u.hostname==='www.boatrace.jp'&&u.pathname==='/owpc/pc/race/raceresult'&&u.searchParams.getAll('hd').length===1&&u.searchParams.get('hd')===String(r.date)&&u.searchParams.getAll('jcd').length===1&&u.searchParams.get('jcd')===String(r.venue).padStart(2,'0')&&u.searchParams.getAll('rno').length===1&&u.searchParams.get('rno')===String(r.race);}catch{return false;}};
const valid=p=>Array.isArray(p)&&p.length===3&&p.every(x=>Number.isInteger(x)&&x>=1&&x<=6)&&new Set(p).size===3;
export function inspectSavedTicketsAgainstResultCandidates(capture,evidence){
 if(!Array.isArray(capture?.records)||!Array.isArray(evidence?.records))throw Error('Invalid capture/result candidates');
 const byKey=new Map();
 for(const r of evidence.records){const k=key(r);if(!byKey.has(k))byKey.set(k,[r]);else byKey.get(k).push(r);}
 const counts={readyPredictions:0,candidatePresent:0,candidateMissing:0,ambiguousEvidence:0,invalidPicks:0,notReady:0};
 const rows=[];
 for(const r of capture.records){
  if(r.response?.ready!==true){counts.notReady++;continue;}
  counts.readyPredictions++;
  const matches=byKey.get(key(r))||[];
  if(matches.length!==1){if(matches.length>1)counts.ambiguousEvidence++;else counts.candidateMissing++;continue;}
  const e=matches[0],top3=e.finishCandidate?.top3;
  if(e.verified===true||e.finishCandidate?.verified===true||!valid(top3)||
     e.sourceCheck?.status!=='official_result_page_candidate_not_authenticated'||
     e.htmlSnapshotComplete!==true||!sourceMatchesRace(e,r)){
   counts.candidateMissing++;continue;
  }
  const main=r.response.main,upset=r.response.upset;
  if(!Array.isArray(main)||!Array.isArray(upset)||main.length!==6||upset.length!==6||![...main,...upset].every(valid)){counts.invalidPicks++;continue;}
  counts.candidatePresent++;
  rows.push({date:r.date,venue:r.venue,race:r.race,candidateTop3:top3,
   candidateInMain:main.some(p=>p.join('-')===top3.join('-')),
   candidateInUpset:upset.some(p=>p.join('-')===top3.join('-')),
   officialFinishVerified:false,preRaceAuthenticated:false,eligibleForAccuracy:false});
 }
 return {date:capture.date,counts,rows,verifiedComparisons:0,accuracyRate:null,eligibleForWeightTuning:0,
 warning:'These are matches to unverified HTML extraction candidates, NOT confirmed hits, hit rates, or evidence for score changes.'};
}
if(process.argv[1]&&import.meta.url===new URL('file://'+process.argv[1]).href){
 const [capturePath,resultPath]=process.argv.slice(2);
 if(!capturePath||!resultPath)throw Error('Usage: node scripts/inspect-saved-tickets-vs-result-candidates.mjs <capture.json> <result-candidates.json>');
 console.log(JSON.stringify(inspectSavedTicketsAgainstResultCandidates(JSON.parse(fs.readFileSync(capturePath,'utf8')),JSON.parse(fs.readFileSync(resultPath,'utf8'))),null,2));
}
