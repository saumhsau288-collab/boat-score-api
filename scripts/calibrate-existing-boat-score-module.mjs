// Research-only bridge to the repository's existing Boat Score 2 calibration logic.
// This is NOT the deployed six-main/six-upset ticket generator.
import {calibrate} from '../boat-score-2-calibration.js';
import {auditHistoricalTuningReadiness} from './audit-historical-tuning-readiness.mjs';
export function calibrateExistingBoatScoreModule(rows,options){
 const audit=auditHistoricalTuningReadiness(rows);
 if(audit.blocked) return {status:'blocked_unverified_history',audit,productionChanged:false};
 const snapshots=rows.map(r=>({
  date:r.date,venue:r.venue,race:r.race,preRaceSnapshot:true,resultVerified:true,
  racers:r.boats,finishOrder:[...r.actual,...[1,2,3,4,5,6].filter(n=>!r.actual.includes(n))]
 }));
 const result=calibrate(snapshots,options);
 return {...result,audit,productionChanged:false,
  warning:'Independent Boat Score 2 calibration module only; not deployed six-ticket prediction. Source flags require independent audit. Full finish order is unavailable and non-podium positions are placeholders; winner/podium-set metrics only.'};
}
