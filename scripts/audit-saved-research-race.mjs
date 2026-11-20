#!/usr/bin/env node
// Offline-only report from already saved official research snapshot.
// No retrospective fetching, no invented recent-50, no official outcome assumptions.
import fs from 'node:fs';
import {evaluateCapturedResearchSnapshot} from './evaluate-captured-research-snapshot.mjs';
import {compareResearchScorePhases} from './compare-research-score-phases.mjs';
export function auditSavedResearchRace(snapshot,recent50){
 const morning=evaluateCapturedResearchSnapshot(snapshot,recent50);
 if(morning.status!=='evaluated')
  return {status:'held',reason:morning.reason,eligibleForCalibration:false};
 const byId=new Map(recent50.map(x=>[String(x.racerId),x.winRate]));
 const inputs=snapshot.racers.map(r=>({
  boat:r.boat,entryCourse:r.entryCourseVerified===true?r.entryCourse:null,
  nationalWinRate:r.nationalWinRate,localWinRate:r.localWinRate,
  motorTwoWinRate:r.motorTwoWinRate,recent50WinRate:byId.get(String(r.racerId)),
  // Only accept independently sourced exhibition score, never manufacture it.
  exhibitionScore:r.exhibitionScoreVerified===true?r.exhibitionScore:undefined
 }));
 const phases=compareResearchScorePhases(inputs);
 return {status:'research_morning_audited',date:snapshot.date,venue:snapshot.venue,race:snapshot.race,
  morning,phaseComparison:phases,eligibleForCalibration:false,
  warning:'Research formula audit only. Not a deployed Worker prediction, not verified before cutoff, and not eligible for historical accuracy statistics.'};
}
if(process.argv[1]&&import.meta.url===new URL('file://'+process.argv[1]).href){
 const [snapshotPath,recent50Path]=process.argv.slice(2);
 if(!snapshotPath||!recent50Path)throw Error('Usage: node scripts/audit-saved-research-race.mjs snapshot.json verified-recent50.json');
 const snapshot=JSON.parse(fs.readFileSync(snapshotPath,'utf8'));
 const recent50=JSON.parse(fs.readFileSync(recent50Path,'utf8'));
 console.log(JSON.stringify(auditSavedResearchRace(snapshot,recent50),null,2));
}
