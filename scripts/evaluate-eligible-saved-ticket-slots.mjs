// Reuse the existing stricter saved-capture comparison admission gate.
// Report deployed ticket POSITION accuracy, not twelve independent algorithms.
import {compareSavedCaptureWithVerifiedResults} from './compare-saved-capture-results.mjs';
export function evaluateEligibleSavedTicketSlots(capture,officialResults){
 const comparison=compareSavedCaptureWithVerifiedResults(capture,officialResults);
 const slots=Object.fromEntries([...Array.from({length:6},(_,i)=>'main-'+(i+1)),...Array.from({length:6},(_,i)=>'upset-'+(i+1))].map(k=>[k,{evaluated:0,hits:0,rate:null}]));
 let compared=0,mainAny=0,upsetAny=0,anyTwelve=0;
 for(let i=0;i<comparison.rows.length;i++){
  const row=comparison.rows[i];
  if(row.status!=='compared')continue;
  const response=capture.records[i].response,actual=row.actual;
  let mh=false,uh=false;
  for(const [group,tickets] of [['main',response.main],['upset',response.upset]]){
   for(let j=0;j<6;j++){
    const slot=slots[group+'-'+(j+1)],hit=tickets[j].join('-')===actual;
    slot.evaluated++;slot.hits+=Number(hit);
    if(hit){if(group==='main')mh=true;else uh=true;}
   }
  }
  compared++;mainAny+=Number(mh);upsetAny+=Number(uh);anyTwelve+=Number(mh||uh);
 }
 for(const slot of Object.values(slots))slot.rate=slot.evaluated?slot.hits/slot.evaluated:null;
 return {slots,compared,held:comparison.held,holdReasons:comparison.holdReasons,coverage:{mainSix:compared?mainAny/compared:null,upsetSix:compared?upsetAny/compared:null,allTwelve:compared?anyTwelve/compared:null},warning:'Twelve ranked ticket positions of the existing deployed predictor, NOT twelve independent prediction strategies. Requires independently authenticated pre-race capture and official result provenance.'};
}
