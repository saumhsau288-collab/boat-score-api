// Research-only comparison. No deadline authentication or calibration promotion.
export function compareCutoffDiagnostics(records){
 if(!Array.isArray(records))throw Error('records_array_required');
 const rows=records.map(r=>{
  const candidate=r?.raceScopedCutoffDiagnostic?.candidateCutoffJst;
  const valid=typeof candidate==='string'&&/^(?:[01]\\d|2[0-3]):[0-5]\\d$/.test(candidate);
  const date=String(r?.date??''),venue=Number(r?.venue),race=Number(r?.race);
  const identityValid=/^20\\d{6}$/.test(date)&&Number.isInteger(venue)&&venue>=1&&venue<=24&&Number.isInteger(race)&&race>=1&&race<=12;
  const diagnosticOnly=identityValid&&valid&&r?.raceScopedCutoffDiagnostic?.verified===false&&r?.raceScopedCutoffDiagnostic?.eligibleForCalibration===false&&r?.verified===false;
  return {date,venue,race,diagnosticCutoffJst:diagnosticOnly?candidate:null,status:diagnosticOnly?'unverified_race_scoped_diagnostic':'not_eligible',verified:false,eligibleForCalibration:false};
 });
 return {rows,total:rows.length,unverifiedRaceScoped:rows.filter(r=>r.status==='unverified_race_scoped_diagnostic').length,verifiedCutoffs:0,eligibleForCalibration:0};
}
