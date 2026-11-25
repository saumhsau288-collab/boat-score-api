// Research-only exact position counts from the official period file.
export function matchOfficialCourseStats(dataset, date, official, starts) {
 const empty=(reason)=>({ready:false,reason,rows:[],periodStart:dataset?.periodStart||null,periodEnd:dataset?.periodEnd||null});
 if(!dataset||dataset.schema!==1||typeof dataset.racers!=='object'||!/^\d{4}-\d{2}-\d{2}$/.test(dataset.periodEnd||'')||!/^\d{4}-\d{2}-\d{2}$/.test(dataset.periodStart||''))return empty('dataset_unverified');
 const asOf=String(date);
 if(!/^20\d{6}$/.test(asOf)||asOf<=dataset.periodEnd.replace(/-/g,''))return empty('period_not_before_race');
 if(official?.verified!==true||official?.statsVerified!==true)return empty('official_identity_unverified');
 const validSix=a=>Array.isArray(a)&&a.length===6&&new Set(a.map(x=>x.boat)).size===6&&a.every(x=>Number.isInteger(x.boat)&&x.boat>=1&&x.boat<=6);
 const racers=official.racers,stats=official.statsByBoat;
 if(!validSix(racers)||!validSix(stats)||new Set(racers.map(x=>String(x.racerId))).size!==6||!racers.every(x=>/^[1-9]\d{3}$/.test(String(x.racerId))&&stats.some(y=>y.boat===x.boat&&String(y.racerId)===String(x.racerId))))return empty('official_registration_mismatch');
 const startVerified=starts?.verified===true&&validSix(starts.rows)&&new Set(starts.rows.map(x=>x.course)).size===6&&starts.rows.every(x=>Number.isInteger(x.course)&&x.course>=1&&x.course<=6);
 const courses=new Map(startVerified?starts.rows.map(x=>[x.boat,x.course]):racers.map(x=>[x.boat,x.boat]));
 const rows=racers.slice().sort((a,b)=>a.boat-b.boat).map(r=>{
  const racerId=String(r.racerId),course=courses.get(r.boat),entry=dataset.racers[racerId]?.find(x=>x.course===course);
  const base={boat:r.boat,racerId,course};
  if(!entry)return {...base,status:'racer_or_course_missing',entries:null,normalFinishes:null,finishCounts:null,rates:null};
  const counts=entry.finishCounts,n=entry.normalFinishes;
  if(!Array.isArray(counts)||counts.length!==6||!counts.every(x=>Number.isInteger(x)&&x>=0)||!Number.isInteger(entry.entries)||entry.entries<0||!Number.isInteger(n)||n<0||counts.reduce((a,b)=>a+b,0)!==n||n>entry.entries)return {...base,status:'count_mismatch',entries:null,normalFinishes:null,finishCounts:null,rates:null};
  return {...base,status:n?'available':'no_normal_finish',entries:entry.entries,normalFinishes:n,finishCounts:counts.slice(),rates:n?counts.slice(0,3).map(x=>100*x/n):null};
 });
 return {ready:true,reason:null,periodStart:dataset.periodStart,periodEnd:dataset.periodEnd,source:dataset.source,sourceTextSha256:dataset.sourceTextSha256,courseBasis:startVerified?'verified_exhibition_course':'assumed_frame_not_verified_course',rateDefinition:'exact_finish_count_over_normal_finishes',available:rows.filter(x=>x.status==='available').length,rows};
}
