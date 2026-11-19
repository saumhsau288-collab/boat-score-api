// Experimental adapter for a future Boat Score 2 prediction screen.
// Does not mutate DOM or modify the deployed app.
import {renderEntryAlertPanel} from './boat-score-2-entry-alert-view.js';
import {analyzeEntryChanges} from './boat-score-2-entry-alerts.js';
export function buildEntryAlertView(prediction,{exhibitionRacers=null}={}){
 if(!prediction||prediction.status!=='experimental')
  return {status:'prediction_unavailable',html:renderEntryAlertPanel(null),source:null};
 // Exhibition is only used if six distinct valid boat/course mappings exist.
 const exhibition=exhibitionRacers===null?null:analyzeEntryChanges(exhibitionRacers,{source:'exhibition'});
 const entryAlerts=exhibition?.status==='evaluated'?exhibition:prediction.entryAlerts;
 if(!entryAlerts||entryAlerts.status!=='evaluated')
  return {status:'entry_unavailable',html:renderEntryAlertPanel(null),source:null};
 return {status:'ready',source:entryAlerts.source,alerts:entryAlerts.alerts,
  html:renderEntryAlertPanel(entryAlerts),exhibitionRejected:exhibition!==null&&exhibition.status!=='evaluated'};
}
