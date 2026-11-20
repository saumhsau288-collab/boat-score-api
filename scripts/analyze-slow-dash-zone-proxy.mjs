// Research-only: 1-3 vs 4-6 is a COURSE-ZONE PROXY, not independently
// verified slow/dash launch style. A fourth course may be slow, and third may be dash.
export function analyzeCourseZonePairs(rows,thresholds=[3,5,10]){
 const score=r=>45*r.nationalWinRate/10+25*(r.localWinRate===0?r.nationalWinRate:r.localWinRate)/10+15*r.motorTwoWinRate/100;
 const categories=['both_inner_1to3','both_outer_4to6','inner_vs_outer'];
 const report=Object.fromEntries(thresholds.map(t=>[t,Object.fromEntries(categories.map(k=>[k,{pairs:0,innerAhead:0,lowerRatedInnerPairs:0,lowerRatedInnerAhead:0,firstPlaceInner:0,firstPlaceOuter:0,secondPlaceInner:0,secondPlaceOuter:0}]))]));
 for(let i=0;i<rows.length;i++)for(let j=i+1;j<rows.length;j++){
  const [inner,outer]=[rows[i],rows[j]].sort((a,b)=>a.entryCourse-b.entryCourse);
  const si=score(inner),so=score(outer);
  if(!Number.isFinite(si)||!Number.isFinite(so))continue;
  const category=outer.entryCourse<=3?'both_inner_1to3':inner.entryCourse>=4?'both_outer_4to6':'inner_vs_outer';
  for(const t of thresholds){
   if(Math.abs(si-so)>t)continue;
   const s=report[t][category];s.pairs++;
   if(inner.finish<outer.finish)s.innerAhead++;
   if(si<so){s.lowerRatedInnerPairs++;if(inner.finish<outer.finish)s.lowerRatedInnerAhead++;}
   if(inner.finish===1)s.firstPlaceInner++;if(outer.finish===1)s.firstPlaceOuter++;
   if(inner.finish===2)s.secondPlaceInner++;if(outer.finish===2)s.secondPlaceOuter++;
  }
 }
 return report;
}
