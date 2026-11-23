// Reject ambiguous or repeated race identities before historical evaluation.
export function uniqueHistoricalRaces(rows){
 if(!Array.isArray(rows))throw Error('rows_must_be_array');
 const keyOf=row=>{
  if(!row||typeof row!=='object'||!/^\d{8}$/.test(String(row.date??''))||!/^\d{1,2}$/.test(String(row.venue??''))||!Number.isInteger(Number(row.race))||Number(row.race)<1||Number(row.race)>12)return null;
  const venue=Number(row.venue);
  if(venue<1||venue>24)return null;
  const y=Number(String(row.date).slice(0,4)),m=Number(String(row.date).slice(4,6)),d=Number(String(row.date).slice(6,8));
  const parsed=new Date(Date.UTC(y,m-1,d));
  if(parsed.getUTCFullYear()!==y||parsed.getUTCMonth()!==m-1||parsed.getUTCDate()!==d)return null;
  return [String(row.date),venue,Number(row.race)].join(':');
 };
 const counts=new Map();
 for(const row of rows){const key=keyOf(row);if(key)counts.set(key,(counts.get(key)||0)+1);}
 const accepted=[],rejected={invalidIdentity:0,duplicateRace:0};
 for(const row of rows){const key=keyOf(row);if(!key)rejected.invalidIdentity++;else if(counts.get(key)>1)rejected.duplicateRace++;else accepted.push(row);}
 return {accepted,rejected,uniqueRaceCount:accepted.length};
}
