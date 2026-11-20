// Research-only chronological racer/course history: prior races only, never the target race.
export function buildPriorRacerCourseRates(joined,{minimumStarts=10,priorStrength=20}={}){
 if(joined?.status!=='verified_racer_entry_course_finish_join'||!Array.isArray(joined.rows))throw Error('verified_join_required');
 if(!Number.isInteger(minimumStarts)||minimumStarts<1||!Number.isFinite(priorStrength)||priorStrength<0)throw Error('invalid_options');
 const byRace=new Map();
 for(const r of joined.rows){
  if(!/^\d{8}$/.test(r.date)||!/^\d{2}$/.test(r.venue)||!/^\d{4}$/.test(String(r.racerId))||
   !Number.isInteger(r.entryCourse)||r.entryCourse<1||r.entryCourse>6||
   !Number.isInteger(r.finish)||r.finish<1||r.finish>6)throw Error('invalid_verified_row');
  const key=[r.date,r.venue,r.race].join('|');
  const arr=byRace.get(key)??[];arr.push(r);byRace.set(key,arr);
 }
 for(const arr of byRace.values()){
  if(arr.length!==6||new Set(arr.map(r=>r.racerId)).size!==6||
   new Set(arr.map(r=>r.entryCourse)).size!==6||
   new Set(arr.map(r=>r.finish)).size!==6)throw Error('incomplete_or_duplicate_race');
 }
 const dates=[...new Set(joined.rows.map(r=>r.date))].sort();
 const prior=new Map(),out=[];
 const update=(key,win,podium)=>{
  const g=prior.get(key)??{starts:0,wins:0,podiums:0};
  g.starts++;g.wins+=win;g.podiums+=podium;prior.set(key,g);
 };
 for(const date of dates){
  const todays=joined.rows.filter(r=>r.date===date);
  for(const r of todays){
   const global=prior.get('racer|'+r.racerId)??{starts:0,wins:0,podiums:0};
   const venue=prior.get('venue|'+r.venue+'|'+r.racerId)??{starts:0,wins:0,podiums:0};
   const course=prior.get('course|'+r.venue+'|'+r.racerId+'|'+r.entryCourse)??{starts:0,wins:0,podiums:0};
   const baseWin=global.starts?global.wins/global.starts:null;
   const basePodium=global.starts?global.podiums/global.starts:null;
   const shrink=(n,success,base)=>base===null?null:(success+priorStrength*base)/(n+priorStrength);
   out.push({date:r.date,venue:r.venue,race:r.race,racerId:r.racerId,entryCourse:r.entryCourse,
    actualFinish:r.finish,priorRacerStarts:global.starts,priorVenueStarts:venue.starts,priorVenueCourseStarts:course.starts,
    priorRacerWinRate:baseWin,priorRacerPodiumRate:basePodium,
    priorVenueWinRate:shrink(venue.starts,venue.wins,baseWin),
    priorVenuePodiumRate:shrink(venue.starts,venue.podiums,basePodium),
    priorVenueCourseWinRate:shrink(course.starts,course.wins,baseWin),
    priorVenueCoursePodiumRate:shrink(course.starts,course.podiums,basePodium),
    sufficientVenueCourseHistory:course.starts>=minimumStarts,
    predictionFeatureEligible:baseWin!==null,
    note:'Actual entry course is retrospective; not a valid pre-cutoff input unless separately verified before cutoff.'});
  }
  // Hold out the entire current day; update only after all predictions for that day.
  for(const r of todays){
   update('racer|'+r.racerId,Number(r.finish===1),Number(r.finish<=3));
   update('venue|'+r.venue+'|'+r.racerId,Number(r.finish===1),Number(r.finish<=3));
   update('course|'+r.venue+'|'+r.racerId+'|'+r.entryCourse,Number(r.finish===1),Number(r.finish<=3));
  }
 }
 return {status:'research_prior_only_racer_course_rates',rows:out,eligibleForDeployment:false,
  warning:'Do not use actual entry course as a prediction input unless it was independently known before cutoff.'};
}
