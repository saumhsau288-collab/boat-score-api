// Research-only same-day course performance diagnostics.
// Actual course, finish and weather must be independently observed.
// Never use a later race's result to forecast an earlier race.
export function analyzeSameDayCourseImpact(completed, target, {minimumCompletedRaces=4, minimumDeviation=0.2}={}){
 if(!Array.isArray(completed)||!target||!Number.isInteger(minimumCompletedRaces)||minimumCompletedRaces<1)throw Error('invalid_input');
 const date=String(target.date),venue=String(target.venue).padStart(2,'0'),race=Number(target.race);
 if(!Number.isInteger(race)||race<1||race>12)throw Error('invalid_target_race');
 const selected=completed.filter(r=>String(r.date)===date&&String(r.venue).padStart(2,'0')===venue&&
  Number.isInteger(r.race)&&r.race<race&&r.verified===true);
 const seen=new Set(),counts=Array.from({length:6},(_,i)=>({course:i+1,starts:0,wins:0,podiums:0}));
 let accepted=0,rejected=0;
 for(const r of selected){
  if(seen.has(r.race)||!Array.isArray(r.runners)||r.runners.length!==6||
   new Set(r.runners.map(x=>x.entryCourse)).size!==6||
   new Set(r.runners.map(x=>x.finish)).size!==6||
   r.runners.some(x=>x.verified!==true||!Number.isInteger(x.entryCourse)||x.entryCourse<1||x.entryCourse>6||
    !Number.isInteger(x.finish)||x.finish<1||x.finish>6)){rejected++;continue;}
  seen.add(r.race);accepted++;
  for(const x of r.runners){
   const c=counts[x.entryCourse-1];c.starts++;c.wins+=Number(x.finish===1);c.podiums+=Number(x.finish<=3);
  }
 }
 const rates=counts.map(c=>({...c,winRate:c.starts?c.wins/c.starts:null,podiumRate:c.starts?c.podiums/c.starts:null}));
 // Six equal-participant courses have a 1/6 winner and 1/2 podium share by construction.
 // These are NOT venue-specific expected rates: this diagnostic cannot authorize weights.
 const deviation=Math.max(...rates.map(c=>c.starts?Math.abs(c.winRate-1/6):0));
 const sufficient=accepted>=minimumCompletedRaces;
 return {status:'same_day_course_diagnostic',date,venue,targetRace:race,acceptedRaces:accepted,rejected,
  rates,deviation,weatherImpactConfirmed:false,
  extraSixStatus:sufficient&&deviation>=minimumDeviation?'review_weather_and_historical_baseline':'insufficient_evidence',
  extraSixPicks:[],eligibleForDeployment:false,
  warning:'Course skew alone cannot prove weather causation. Compare with venue/course historical baseline and time-stamped wind, wave, pre-cutoff entry before generating additional picks.'};
}
