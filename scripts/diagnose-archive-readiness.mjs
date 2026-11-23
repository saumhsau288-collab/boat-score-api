// Diagnose response readiness in historical archives without leaking response bodies.
const category=r=>{
 if(r?.httpStatus!==200)return 'http_non_200';
 if(r?.response?.ready===true)return 'ready';
 if(!r?.response||typeof r.response!=='object')return 'missing_response_object';
 return 'http_200_not_ready';
};
const key=r=>[String(r?.date??''),Number(r?.venue),Number(r?.race)].join(':');
export function diagnoseArchiveReadiness(archives,focusKeys=[]){
 const totals={ready:0,http_non_200:0,missing_response_object:0,http_200_not_ready:0};
 const statusCodes={};const shapes={};const notReadyByVenue={};const notReadyByRace={};const readinessByRace={};const readinessByDayAndHalf={};const readinessByDayAndHalfAndVenue={};const timingByDayAndHalf={};const captureWindowByDay={};const readinessByJstMinute={};const responseLatencyByCategory={};const responseLatencyByDayAndHalf={};const focused=[];const notReadyReasons={};const missingHttpFields={};const missingHttpErrorCategories={};const timeoutAttempts={};const attemptValueTypes={};const attemptArrayLengths={};const attemptEntryFieldShapes={};const attemptErrorCategories={};const attemptDurationsMs={under_5s:0,from_5_to_15s:0,from_15_to_30s:0,over_30s:0,invalid:0};const attemptByOrdinal={};const successfulRetryReadiness={ready:0,not_ready:0,unknown:0};const dateCategories={};
 const focus=new Set(focusKeys);
 for(const a of archives){
  const day=String(a?.date??'unknown');
  const start=typeof a?.captureStart==='string'?Date.parse(a.captureStart):NaN;
  const local=Number.isFinite(start)?new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Tokyo',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date(start)):null;
  const jstDay=Number.isFinite(start)?new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Tokyo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(start)).replace(/\D/g,''):null;
  const jstClock=Number.isFinite(start)?new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Tokyo',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date(start)):null;
  captureWindowByDay[day]={captureStart:a?.captureStart??null,jstClock,jstDay,dateMatches:jstDay===day,scheduledMorningWindow:jstDay===day&&jstClock>='07:45'&&jstClock<='08:30'};
  for(const r of Array.isArray(a?.records)?a.records:[]){
  const reason=category(r);totals[reason]++;
  const duration=Date.parse(r?.receivedAt)-Date.parse(r?.requestedAt);
  const durationBucket=!Number.isFinite(duration)||duration<0?'invalid':duration<1000?'under_1s':duration<5000?'from_1_to_5s':duration<15000?'from_5_to_15s':duration<30000?'from_15_to_30s':'over_30s';
  if(!responseLatencyByCategory[reason])responseLatencyByCategory[reason]={under_1s:0,from_1_to_5s:0,from_5_to_15s:0,from_15_to_30s:0,over_30s:0,invalid:0};
  responseLatencyByCategory[reason][durationBucket]++;
  const latencyHalf=Number(r?.race)>=1&&Number(r?.race)<=6?'early':Number(r?.race)>=7&&Number(r?.race)<=12?'late':'unknown';
  const latencyKey=String(a?.date??r?.date??'unknown')+':'+latencyHalf+':'+reason;
  if(!responseLatencyByDayAndHalf[latencyKey])responseLatencyByDayAndHalf[latencyKey]={total:0,under_1s:0,from_1_to_5s:0,from_5_to_15s:0,from_15_to_30s:0,over_30s:0,invalid:0};
  responseLatencyByDayAndHalf[latencyKey].total++;
  responseLatencyByDayAndHalf[latencyKey][durationBucket]++;
  const raceNumber=String(r?.race??'missing');
  const dayKey=String(a?.date??r?.date??'unknown');
  const half=Number(r?.race)>=1&&Number(r?.race)<=6?'early':Number(r?.race)>=7&&Number(r?.race)<=12?'late':'unknown';
  const dayHalfKey=dayKey+':'+half;
  if(!timingByDayAndHalf[dayHalfKey])timingByDayAndHalf[dayHalfKey]={timestampsPresent:0,missingTimestamps:0,earliest:null,latest:null};
  const time=r?.requestedAt;
  const parsed=typeof time==='string'?Date.parse(time):NaN;
  if(Number.isFinite(parsed)){
   const minute=new Date(parsed+9*60*60*1000).toISOString().slice(0,16).replace('T',' ');
   if(!readinessByJstMinute[minute])readinessByJstMinute[minute]={total:0,ready:0,http_200_not_ready:0,no_http_200:0};
   readinessByJstMinute[minute].total++;
   readinessByJstMinute[minute][reason==='ready'?'ready':reason==='http_200_not_ready'?'http_200_not_ready':'no_http_200']++;
   const t=timingByDayAndHalf[dayHalfKey];t.timestampsPresent++;
   if(t.earliest===null||parsed<Date.parse(t.earliest))t.earliest=new Date(parsed).toISOString();
   if(t.latest===null||parsed>Date.parse(t.latest))t.latest=new Date(parsed).toISOString();
  }else timingByDayAndHalf[dayHalfKey].missingTimestamps++;
  if(!readinessByDayAndHalf[dayHalfKey])readinessByDayAndHalf[dayHalfKey]={total:0,ready:0,http_200_not_ready:0,no_http_200:0};
  readinessByDayAndHalf[dayHalfKey].total++;
  readinessByDayAndHalf[dayHalfKey][reason==='ready'?'ready':reason==='http_200_not_ready'?'http_200_not_ready':'no_http_200']++;
  const venueKey=dayHalfKey+':'+String(r?.venue??'missing');
  if(!readinessByDayAndHalfAndVenue[venueKey])readinessByDayAndHalfAndVenue[venueKey]={total:0,ready:0,http_200_not_ready:0,no_http_200:0};
  readinessByDayAndHalfAndVenue[venueKey].total++;
  readinessByDayAndHalfAndVenue[venueKey][reason==='ready'?'ready':reason==='http_200_not_ready'?'http_200_not_ready':'no_http_200']++;
  if(!readinessByRace[raceNumber])readinessByRace[raceNumber]={total:0,ready:0,http_200_not_ready:0,no_http_200:0};
  readinessByRace[raceNumber].total++;
  readinessByRace[raceNumber][reason==='ready'?'ready':reason==='http_200_not_ready'?'http_200_not_ready':'no_http_200']++;
  const day=String(a?.date??r?.date??'unknown');
  if(!dateCategories[day])dateCategories[day]={ready:0,http_non_200:0,missing_response_object:0,http_200_not_ready:0};
  dateCategories[day][reason]++;
  const code=String(r?.httpStatus??'missing');statusCodes[code]=(statusCodes[code]||0)+1;
  if(Array.isArray(r?.attempts)&&r.attempts.some((item,i)=>i>0&&item?.httpStatus===200)){
   const k=r?.response?.ready===true?'ready':r?.response?.ready===false?'not_ready':'unknown';
   successfulRetryReadiness[k]++;
  }
  if(reason==='http_non_200'){
   const fields=Object.keys(r??{}).filter(k=>/error|reason|message|status|fail|attempt|retry|time/i.test(k)).sort();
   const signature=fields.join(',')||'(no diagnostic fields)';missingHttpFields[signature]=(missingHttpFields[signature]||0)+1;
   const error=r?.error;
   const label=typeof error==='string' ? (/timeout|timed out|abort/i.test(error)?'timeout_or_abort':/fetch|network|connect|dns|socket/i.test(error)?'network_or_fetch':/http|status/i.test(error)?'http_status_error':'other_string_error') : error==null?'missing_error':typeof error;
   missingHttpErrorCategories[label]=(missingHttpErrorCategories[label]||0)+1;
   const attempts=Number.isInteger(r?.attempts)&&r.attempts>=0?String(r.attempts):'not_recorded';
   timeoutAttempts[attempts]=(timeoutAttempts[attempts]||0)+1;
   const t=Array.isArray(r?.attempts)?'array':r?.attempts===undefined?'absent':r?.attempts===null?'null':typeof r.attempts;
   attemptValueTypes[t]=(attemptValueTypes[t]||0)+1;
   if(Array.isArray(r?.attempts)){
    const n=String(r.attempts.length);attemptArrayLengths[n]=(attemptArrayLengths[n]||0)+1;
    for(const item of r.attempts){
     const shape=item&&typeof item==='object'&&!Array.isArray(item)?Object.keys(item).sort().join(','):'non_object';
     attemptEntryFieldShapes[shape]=(attemptEntryFieldShapes[shape]||0)+1;
     const e=typeof item?.error==='string'?item.error:'';
     const label=/timeout|timed out|abort/i.test(e)?'timeout_or_abort':/fetch|network|connect|dns|socket/i.test(e)?'network_or_fetch':e?'other_error':'missing_error';
     attemptErrorCategories[label]=(attemptErrorCategories[label]||0)+1;
     const start=Date.parse(item?.requestedAt),end=Date.parse(item?.receivedAt),ms=end-start;
     const bucket=!Number.isFinite(ms)||ms<0?'invalid':ms<5000?'under_5s':ms<15000?'from_5_to_15s':ms<30000?'from_15_to_30s':'over_30s';
     attemptDurationsMs[bucket]++;
     const ordinal=Number.isInteger(item?.attempt)?String(item.attempt):'unlabeled';
     if(!attemptByOrdinal[ordinal])attemptByOrdinal[ordinal]={count:0,under_5s:0,from_5_to_15s:0,from_15_to_30s:0,over_30s:0,invalid:0};
     attemptByOrdinal[ordinal].count++;attemptByOrdinal[ordinal][bucket]++;

    }
   }
  }
  if(reason==='http_200_not_ready'){
   const venue=String(r?.venue??'missing'),race=String(r?.race??'missing');
   notReadyByVenue[venue]=(notReadyByVenue[venue]||0)+1;
   notReadyByRace[race]=(notReadyByRace[race]||0)+1;
   const raw=r.response.reason;
   const label=typeof raw==='string'&&raw.length<=100?raw:(raw==null?'(missing)':typeof raw);
   notReadyReasons[label]=(notReadyReasons[label]||0)+1;
   const fields=Object.keys(r.response).filter(k=>/^(ready|error|status|reason|message|missing|source|code|detail|diagnostic|stage)$/i.test(k)).sort();
   const signature=fields.join(',')||'(no diagnostic fields)';
   shapes[signature]=(shapes[signature]||0)+1;
  }
  if(focus.has(key(r)))focused.push({raceKey:key(r),category:reason,httpStatus:r?.httpStatus??null,
   responseReady:r?.response?.ready===true,diagnosticFieldNames:r?.response&&typeof r.response==='object'?
    Object.keys(r.response).filter(k=>/^(ready|error|status|reason|message|missing|source|code|detail|diagnostic|stage)$/i.test(k)).sort():[]});
 }
 }
 return {totals,statusCodes,notReadyByVenue,notReadyByRace,readinessByRace,readinessByDayAndHalf,readinessByDayAndHalfAndVenue,timingByDayAndHalf,captureWindowByDay,readinessByJstMinute,responseLatencyByCategory,responseLatencyByDayAndHalf,nonReadyReasons:notReadyReasons,missingHttpDiagnosticFieldShapes:missingHttpFields,missingHttpErrorCategories,timeoutAttempts,attemptValueTypes,attemptArrayLengths,attemptEntryFieldShapes,attemptErrorCategories,attemptDurationsMs,attemptByOrdinal,successfulRetryReadiness,dateCategories,nonReadyDiagnosticFieldShapes:shapes,focused,warning:'Status and field names only; no cause inferred without evidence. Historical responses are not authenticated pre-race predictions.'};
}
