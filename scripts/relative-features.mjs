// Research-only derived features; never treat exhibition as verified race entry.
export function relativeFeatures(boats){
 if(!Array.isArray(boats)||boats.length!==6)throw Error('six_boats_required');
 const ids=boats.map(b=>b.boat),courses=boats.map(b=>b.course);
 if(new Set(ids).size!==6||new Set(courses).size!==6||boats.some(b=>!Number.isInteger(b.boat)||b.boat<1||b.boat>6||!Number.isInteger(b.course)||b.course<1||b.course>6||b.courseVerified!==true))throw Error('verified_unique_courses_required');
 const byCourse=[...boats].sort((a,b)=>a.course-b.course);
 const finite=x=>typeof x==='number'&&Number.isFinite(x);
 return byCourse.map((b,i)=>{
  const inner=i?byCourse[i-1]:null,outer=i<5?byCourse[i+1]:null;
  const delta=(x,y,key)=>x&&y&&finite(x[key])&&finite(y[key])?Number((x[key]-y[key]).toFixed(4)):null;
  return {boat:b.boat,course:b.course,
   innerBoat:inner?.boat??null,outerBoat:outer?.boat??null,
   startAdvantageVsInner:delta(inner,b,'averageST'),
   exhibitionAdvantageVsInner:delta(inner,b,'exhibitionTime'),
   startAdvantageVsOuter:delta(outer,b,'averageST'),
   exhibitionAdvantageVsOuter:delta(outer,b,'exhibitionTime')};
 });
}
