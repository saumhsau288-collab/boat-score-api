// Research-only: compare same-day course results with venue-specific historical course rates.
// No automatic picks until weather observations and held-out predictive benefit are verified.
export function compareVenueCourseShift(diagnostic, baseline, {minimumHistoricalStarts=30, minimumSameDayRaces=4, minimumShift=0.20}={}){
 if(diagnostic?.status!=='same_day_course_diagnostic'||!Array.isArray(baseline)||baseline.length!==6)
  throw Error('diagnostic_and_six_course_baseline_required');
 if(!Number.isInteger(minimumHistoricalStarts)||minimumHistoricalStarts<1||
    !Number.isInteger(minimumSameDayRaces)||minimumSameDayRaces<1||
    !Number.isFinite(minimumShift)||minimumShift<0||minimumShift>1)throw Error('invalid_options');
 const byCourse=new Map();
 for(const r of baseline){
  if(!Number.isInteger(r.course)||r.course<1||r.course>6||byCourse.has(r.course)||
   String(r.venue).padStart(2,'0')!==diagnostic.venue||
   !Number.isInteger(r.starts)||r.starts<0||!Number.isInteger(r.wins)||r.wins<0||r.wins>r.starts||
   !Number.isInteger(r.podiums)||r.podiums<0||r.podiums>r.starts||
   !/^\d{8}$/.test(String(r.historyThroughDate))||String(r.historyThroughDate)>=diagnostic.date)
   throw Error('invalid_or_future_baseline');
  byCourse.set(r.course,r);
 }
 if(byCourse.size!==6)throw Error('six_unique_courses_required');
 const comparisons=diagnostic.rates.map(r=>{
  const b=byCourse.get(r.course);
  const ready=b.starts>=minimumHistoricalStarts&&r.starts>=minimumSameDayRaces;
  return {course:r.course,sameDayStarts:r.starts,historicalStarts:b.starts,
   historicalWinRate:b.starts?b.wins/b.starts:null,sameDayWinRate:r.winRate,
   historicalPodiumRate:b.starts?b.podiums/b.starts:null,sameDayPodiumRate:r.podiumRate,
   winRateShift:ready?r.winRate-b.wins/b.starts:null,
   podiumRateShift:ready?r.podiumRate-b.podiums/b.starts:null,
   sampleReady:ready};
 });
 const flagged=comparisons.filter(r=>r.sampleReady&&Math.abs(r.winRateShift)>=minimumShift);
 return {status:'venue_course_shift_comparison',venue:diagnostic.venue,date:diagnostic.date,
  targetRace:diagnostic.targetRace,comparisons,flaggedCourses:flagged.map(r=>r.course),
  extraSixStatus:flagged.length?'weather_evidence_and_holdout_review_required':'no_supported_course_shift',
  extraSixPicks:[],weatherImpactConfirmed:false,eligibleForDeployment:false,
  warning:'Historical baseline is venue-specific and must exclude target date. Course shift does not establish weather causality or authorize six extra picks.'};
}
