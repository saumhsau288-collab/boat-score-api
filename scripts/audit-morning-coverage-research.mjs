// Research-only coverage analysis. No claims of authenticated race times.
export function auditMorningCoverage(capture) {
 if(!Array.isArray(capture?.records))throw new Error('Capture records required');
 const rows=capture.records, keys=new Set(),duplicates=[];
 const byVenue={};
 for(const r of rows){
  if(!Number.isInteger(r.venue)||r.venue<1||r.venue>24||!Number.isInteger(r.race)||r.race<1||r.race>12)continue;
  const key=r.venue+':'+r.race;
  if(keys.has(key))duplicates.push(key);
  keys.add(key);
  const v=byVenue[r.venue]??={attempted:0,ready:0,timeout:0,notReady:0,other:0};
  v.attempted++;
  if(r.httpStatus===200&&r.response?.ready===true)v.ready++;
  else if(/timeout|timed out|aborted due to timeout/i.test(String(r.error||'')))v.timeout++;
  else if(r.response?.ready===false)v.notReady++;
  else v.other++;
 }
 const validTime=typeof capture.captureStart==='string'&&!Number.isNaN(Date.parse(capture.captureStart));
 const jstTime=validTime?new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Tokyo',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date(capture.captureStart)):null;
 const inWindow=Boolean(validTime&&jstTime>='07:45'&&jstTime<='08:30');
 return {attempted:rows.length,uniqueRaceKeys:keys.size,duplicates,byVenue,captureTimeJst:jstTime,inMorningWindow:inWindow,authenticatedBeforeRace:false,warning:'Capture clock and API ready flags do not authenticate official cutoff times or pre-race model inputs.'};
}
