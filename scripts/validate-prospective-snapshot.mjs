// Validate a prospective snapshot before it can be used for outcome-based evaluation.
// All times must be ISO timestamps with explicit UTC offset; never infer pre-race capture.
const timestamp=(s)=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(s)&&Number.isFinite(Date.parse(s));
export function validateProspectiveSnapshot(snapshot){
 const errors=[];
 if(!snapshot||typeof snapshot!=='object')return {valid:false,errors:['snapshot missing']};
 for(const key of ['capturedAt','scheduledStartAt'])if(!timestamp(snapshot[key]))errors.push(key+' must have ISO offset timestamp');
 if(timestamp(snapshot.capturedAt)&&timestamp(snapshot.scheduledStartAt)&&Date.parse(snapshot.capturedAt)>=Date.parse(snapshot.scheduledStartAt))errors.push('capture must precede scheduled start');
 if(!/^20\d{6}$/.test(String(snapshot.date)))errors.push('invalid date');
 if(!Number.isInteger(snapshot.venue)||snapshot.venue<1||snapshot.venue>24)errors.push('invalid venue');
 if(!Number.isInteger(snapshot.race)||snapshot.race<1||snapshot.race>12)errors.push('invalid race');
 const racers=snapshot.racers;
 if(!Array.isArray(racers)||racers.length!==6||new Set(racers.map(x=>x?.boat)).size!==6||!racers.every(x=>Number.isInteger(x?.boat)&&x.boat>=1&&x.boat<=6&&Number.isFinite(x?.nationalWinRate)&&x.nationalWinRate>=0&&Number.isFinite(x?.averageStartTiming)&&x.averageStartTiming>=0))errors.push('six valid racers with win rates and average ST required');
 if(snapshot.sourceUrl===undefined||typeof snapshot.sourceUrl!=='string'||!/^https:\/\//.test(snapshot.sourceUrl))errors.push('sourceUrl required');
 return {valid:errors.length===0,errors};
}
