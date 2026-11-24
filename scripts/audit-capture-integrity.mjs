// Data integrity only; no scoring or prediction.
export function auditCaptureIntegrity(records) {
 if (!Array.isArray(records)) return {valid:false,issues:['invalid_records']};
 const seen=new Set(),issues=[];
 for(const [index,r] of records.entries()) {
  const key=[r?.date,r?.venue,r?.race,r?.phase].join(':');
  const add=reason=>issues.push({index,key,reason});
  if(!/^20\d{6}$/.test(String(r?.date))||!Number.isInteger(r?.venue)||r.venue<1||r.venue>24||!Number.isInteger(r?.race)||r.race<1||r.race>12||!['morning','prestart'].includes(r?.phase))add('invalid_identity');
  if(seen.has(key))add('duplicate_capture');seen.add(key);
  if(typeof r?.capturedAt!=='string'||!/(Z|[+-]\d{2}:\d{2})$/.test(r.capturedAt)||!Number.isFinite(Date.parse(r.capturedAt)))add('invalid_capture_time');
  const boats=r?.racers;
  if(!Array.isArray(boats)||boats.length!==6||new Set(boats.map(x=>x?.boat)).size!==6||boats.some(x=>!Number.isInteger(x?.boat)||x.boat<1||x.boat>6))add('invalid_boat_mapping');
 }
 return {valid:issues.length===0,records:records.length,issues};
}
