// Research-only queue of ready deployed predictions needing independent feature collection.
// This never reconstructs historical pre-race inputs from current/post-race pages.
export function buildFeatureCollectionQueue(capture){
 if(!Array.isArray(capture?.records))throw Error('records_required');
 const seen=new Set(),queue=[];
 for(const r of capture.records){
  if(r?.response?.ready!==true)continue;
  const date=String(r.date??''),venue=Number(r.venue),race=Number(r.race);
  if(!/^20\d{6}$/.test(date)||!Number.isInteger(venue)||venue<1||venue>24||!Number.isInteger(race)||race<1||race>12)continue;
  const key=[date,venue,race].join(':');
  if(seen.has(key))continue;
  seen.add(key);
  queue.push({date,venue,race,predictionReceivedAt:r.receivedAt??null,
   responseSha256:r.responseSha256??null,
   officialRaceListUrl:'https://www.boatrace.jp/owpc/pc/race/racelist?hd='+date+'&jcd='+String(venue).padStart(2,'0')+'&rno='+race,
   status:'NEEDS_INDEPENDENT_PRE_RACE_FEATURE_SNAPSHOT',
   caution:'Official race list link is a lookup candidate, not proof of pre-race provenance. Never fill missing historical inputs using post-race pages.'});
 }
 return {captureDate:capture.date??null,readyRaceCandidates:queue.length,verifiedFeatureSnapshots:0,calibrationEligible:0,queue};
}
