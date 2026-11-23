// Structural comparison of SAVED real predictions. No actual-result or accuracy claims.
export function compareArchivedTwelvePicks(payload){
 if(!Array.isArray(payload?.records)||payload?.authenticatedBeforeRace!==false)throw Error('invalid archive');
 const valid=p=>Array.isArray(p)&&p.length===3&&p.every(n=>Number.isInteger(n)&&n>=1&&n<=6)&&new Set(p).size===3;
 const totals={attempted:payload.records.length,readyWithTwelve:0,invalidTwelve:0,mainUniqueTickets:0,upsetUniqueTickets:0,
  sharedTickets:0,distinctAcrossTwelve:0,mainFirstBoats:[0,0,0,0,0,0],upsetFirstBoats:[0,0,0,0,0,0]};
 for(const record of payload.records){
  if(record?.response?.ready!==true)continue;
  const {main,upset}=record.response;
  if(![main,upset].every(a=>Array.isArray(a)&&a.length===6&&a.every(valid))){totals.invalidTwelve++;continue;}
  totals.readyWithTwelve++;
  const m=new Set(main.map(p=>p.join('-'))),u=new Set(upset.map(p=>p.join('-')));
  totals.mainUniqueTickets+=m.size;totals.upsetUniqueTickets+=u.size;
  totals.sharedTickets+=[...m].filter(p=>u.has(p)).length;
  totals.distinctAcrossTwelve+=new Set([...m,...u]).size;
  for(const p of main)totals.mainFirstBoats[p[0]-1]++;
  for(const p of upset)totals.upsetFirstBoats[p[0]-1]++;
 }
 return {date:payload.date??null,...totals,verifiedResultsCompared:0,hitRate:null,
  note:'Structural ticket diversity and first-boat distribution only; not historical accuracy.'};
}
