// Pure snapshot builder for a future scheduler; does not fetch or schedule anything.
// Only accept captured prediction inputs whose provenance is explicitly confirmed.
export function buildPreRacePredictionSnapshot({date,venue,race,phase,cutoffAt,savedAt,inputsCapturedBeforeCutoff,prediction}){
 const integer=(x,min,max)=>Number.isInteger(x)&&x>=min&&x<=max;
 if(!/^20\d{6}$/.test(String(date))||!integer(venue,1,24)||!integer(race,1,12))throw Error('Invalid race identity');
 if(!['morning_0800','pre_cutoff'].includes(phase))throw Error('Invalid snapshot phase');
 if(typeof cutoffAt!=='string'||!Number.isFinite(Date.parse(cutoffAt))||typeof savedAt!=='string'||!Number.isFinite(Date.parse(savedAt)))throw Error('Missing timestamps');
 if(Date.parse(savedAt)>=Date.parse(cutoffAt))throw Error('Cannot save a post-cutoff prediction as pre-race');
 if(!/(Z|[+-]\d{2}:\d{2})$/i.test(savedAt)||!/(Z|[+-]\d{2}:\d{2})$/i.test(cutoffAt))throw Error('Snapshot timestamps must include timezone offsets');
 const jstDate=t=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Tokyo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(t)).replaceAll('-','');
 if(jstDate(savedAt)!==String(date)||jstDate(cutoffAt)!==String(date))throw Error('Snapshot timestamps must match race date in JST');
 if(inputsCapturedBeforeCutoff!==true)throw Error('Pre-race input provenance not verified');
 const validPicks=a=>Array.isArray(a)&&a.length===6&&a.every(p=>Array.isArray(p)&&p.length===3&&new Set(p).size===3&&p.every(n=>integer(n,1,6)));
 if(prediction?.ready!==true||!validPicks(prediction.main)||!validPicks(prediction.upset))throw Error('Prediction not ready or picks invalid');
 return {source:'existing_Boat_Score_2_selected_race',captureKind:'saved_before_cutoff',date,venue,race,phase,cutoffAt,savedAt,inputsCapturedBeforeCutoff:true,main:prediction.main.map(p=>[...p]),upset:prediction.upset.map(p=>[...p])};
}
