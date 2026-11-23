// Research-only duplicate inventory; never silently pick a winning snapshot.
const validKey=r=>{
 const date=String(r?.date??'');const venue=Number(r?.venue),race=Number(r?.race);
 if(!/^20\d{6}$/.test(date)||!Number.isInteger(venue)||venue<1||venue>24||!Number.isInteger(race)||race<1||race>12)return null;
 const y=+date.slice(0,4),m=+date.slice(4,6),d=+date.slice(6,8);
 if(new Date(Date.UTC(y,m-1,d)).toISOString().slice(0,10)!==date.slice(0,4)+'-'+date.slice(4,6)+'-'+date.slice(6,8))return null;
 return [date,venue,race].join(':');
};
export function inventorySavedCaptureDuplicates(capture){
 if(!Array.isArray(capture?.records))throw Error('records_required');
 const byKey=new Map();let invalidRecords=0;
 for(const r of capture.records){
  const key=validKey(r);
  if(key===null){invalidRecords++;continue;}
  const times=byKey.get(key)??[];
  times.push({requestedAt:r?.requestedAt??null,receivedAt:r?.receivedAt??null});
  byKey.set(key,times);
 }
 const duplicates=[...byKey].filter(([,v])=>v.length>1).map(([key,occurrences])=>({key,count:occurrences.length,occurrences}));
 return {totalRecords:capture.records.length,uniqueValidRaces:byKey.size,invalidRecords,duplicateRaceKeys:duplicates.length,duplicateRecords:duplicates.reduce((n,x)=>n+x.count,0),duplicates,warning:'All repeated race keys must be held from accuracy scoring until separately adjudicated; do not choose a favorable prediction retrospectively.'};
}
