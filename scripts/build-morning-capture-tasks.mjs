// Fair research capture ordering: sample each venue at each race number before moving on.
export function buildCaptureTasks(venues,maxRaces){
 if(!Array.isArray(venues)||venues.length===0||venues.some(v=>!Number.isInteger(v)||v<1||v>24)||new Set(venues).size!==venues.length)
   throw new Error('Invalid venues');
 if(!Number.isInteger(maxRaces)||maxRaces<1||maxRaces>12)throw new Error('Invalid races');
 const tasks=[];
 for(let race=1;race<=maxRaces;race++)for(const venue of venues)tasks.push({venue,race});
 return tasks;
}
