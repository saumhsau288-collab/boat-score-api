// Research-only: explicit, non-calibrated course/start interaction.
// No automatic fallback from boat number to actual entry course.
// startTiming is average ST in seconds; lower means faster. Not exhibition ST.
export function assessCourseStart(racers,{similarStartGap=0.02}={}){
 if(!Array.isArray(racers)||racers.length!==6||!Number.isFinite(similarStartGap)||similarStartGap<0||similarStartGap>0.1)
  return {status:'invalid_input'};
 if(racers.some(r=>!r||!Number.isInteger(r.boat)||r.boat<1||r.boat>6||
   !Number.isInteger(r.course)||r.course<1||r.course>6||
   !Number.isFinite(r.startTiming)||r.startTiming<0||r.startTiming>0.5)||
   new Set(racers.map(r=>r.boat)).size!==6||
   new Set(racers.map(r=>r.course)).size!==6)
  return {status:'missing_or_invalid_verified_course_start'};
 const byCourse=[...racers].sort((a,b)=>a.course-b.course);
 const pairs=[];
 for(let i=0;i<6;i++)for(let j=i+1;j<6;j++){
  const inside=byCourse[i],outside=byCourse[j];
  const startAdvantage=inside.startTiming-outside.startTiming;
  const similar=Math.abs(startAdvantage)<=similarStartGap;
  pairs.push({insideBoat:inside.boat,outsideBoat:outside.boat,
   insideCourse:inside.course,outsideCourse:outside.course,
   startGapSeconds:Number(startAdvantage.toFixed(3)),
   interpretation:similar?'inside_course_advantage_when_st_similar':
    startAdvantage>similarStartGap?'outside_faster_start_possible_counter':
    'inside_faster_start_and_course_advantage'});
 }
 return {status:'evaluated_research_only',pairs,similarStartGap,
  calibrated:false,scoreAdjustment:0,
  warning:'Heuristic comparison only. No validated winning probabilities, no production score changes.'};
}
