// Research-only candidate groups; no trifecta tickets or accuracy claims.
import {analyzeSixSignalAgreement} from './analyze-six-signal-agreement.mjs';
export function groupSixCandidates(racers,options){
 const result=analyzeSixSignalAgreement(racers,options);
 if(result.status!=='research_only')return {status:result.status};
 const byBoat=[...result.rows].sort((a,b)=>b.topThreeSignalCount-a.topThreeSignalCount||
   b.firstSignalCount-a.firstSignalCount||b.abilityScore-a.abilityScore||
   a.course-b.course||a.boat-b.boat);
 const favorites=byBoat.filter(r=>r.topThreeSignalCount>=2).map(r=>r.boat);
 const singleSignal=byBoat.filter(r=>r.topThreeSignalCount===1).map(r=>r.boat);
 const unsupported=byBoat.filter(r=>r.topThreeSignalCount===0).map(r=>r.boat);
 const insideCourseBoat=result.rows.find(r=>r.course===1)?.boat;
 const counterCandidates=byBoat.filter(r=>r.course!==1&&
  (r.firstBy.includes('ability')||r.firstBy.includes('start'))).map(r=>r.boat);
 return {status:'research_only',favorites,counterCandidates,
  singleSignal,unsupported,insideCourseBoat,
  warning:'Groups overlap and are not finish-position predictions. Unsupported means no top-three signal, not impossible to place.',
  calibrated:false};
}
