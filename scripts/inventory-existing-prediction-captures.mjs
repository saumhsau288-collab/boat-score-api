// Read-only inventory of existing deployed predictor captures, not a historical accuracy report.
export function inventoryExistingPredictionCaptures(captures){
 if(!Array.isArray(captures))throw Error('Expected capture files[]');
 const report={files:captures.length,records:0,ready:0,withPrediction:0,withSixBoatInputs:0,withVerifiedPreRaceEvidence:0,readyWithoutSixBoatInputs:0,readyWithoutAuthenticatedPreRaceEvidence:0,byFile:[],warning:'Ready predictions alone do not establish pre-race authenticity or independent results; no hit rate can be computed.'};
 for(const c of captures){
  const records=Array.isArray(c?.records)?c.records:[];
  const file={date:c?.date??null,records:records.length,ready:0,withPrediction:0,withSixBoatInputs:0,withVerifiedPreRaceEvidence:0,readyWithoutSixBoatInputs:0,readyWithoutAuthenticatedPreRaceEvidence:0};
  for(const r of records){
   if(r?.response?.ready===true){
    file.ready++;
    if(!Array.isArray(r.response?.scoreInputsByBoat)||r.response.scoreInputsByBoat.length!==6)file.readyWithoutSixBoatInputs++;
    if(c?.authenticatedBeforeRace!==true||r?.authenticatedBeforeRace!==true)file.readyWithoutAuthenticatedPreRaceEvidence++;
   }
   const response=r?.response;
   if(response?.prediction||response?.predictions||response?.basePrediction)file.withPrediction++;
   if(Array.isArray(response?.scoreInputsByBoat)&&response.scoreInputsByBoat.length===6)file.withSixBoatInputs++;
   if(c?.authenticatedBeforeRace===true&&r?.authenticatedBeforeRace===true)file.withVerifiedPreRaceEvidence++;
  }
  for(const key of ['records','ready','withPrediction','withSixBoatInputs','withVerifiedPreRaceEvidence','readyWithoutSixBoatInputs','readyWithoutAuthenticatedPreRaceEvidence'])report[key]+=file[key];
  report.byFile.push(file);
 }
 return report;
}
