// Research-only bridge to the repository's existing Boat Score 2 calibration logic.
// This is NOT the deployed six-main/six-upset ticket generator.
import {calibrate} from '../boat-score-2-calibration.js';
import {auditHistoricalTuningReadiness} from './audit-historical-tuning-readiness.mjs';
export function calibrateExistingBoatScoreModule(rows,options){
 const audit=auditHistoricalTuningReadiness(rows);
 const fullFinishValid=rows.every(r=>Array.isArray(r.finishOrder)&&r.finishOrder.length===6&&new Set(r.finishOrder).size===6&&r.finishOrder.every(n=>Number.isInteger(n)&&n>=1&&n<=6)&&r.finishOrder.slice(0,3).every((n,i)=>n===r.actual?.[i]));
 if(audit.blocked||!fullFinishValid) return {status:'blocked_unverified_history',audit,missingVerifiedFullFinishOrder:!fullFinishValid,productionChanged:false};
 const snapshots=rows.map(r=>({
  date:r.date,venue:r.venue,race:r.race,preRaceSnapshot:true,resultVerified:true,
  racers:r.boats,finishOrder:r.finishOrder
 }));
 const result=calibrate(snapshots,options);
 return {...result,audit,productionChanged:false,
  warning:'Independent Boat Score 2 calibration module only; not deployed six-ticket prediction. Source flags require independent audit. Requires independently verified full finish order; no finish positions are fabricated.'};
}
