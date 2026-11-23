// Research-only twelve independent heuristic hypotheses; NOT production scoring.
const finite=x=>typeof x==='number'&&Number.isFinite(x);
const defs=[['F1','score-dominance','favorite'],['F2','inner-course-advantage','favorite'],['F3','start-consistency','favorite'],['F4','exhibition-speed','favorite'],['F5','motor-strength','favorite'],['F6','balanced-podium','favorite'],['U1','relative-outer-score-upset','upset'],['U2','relative-outer-start-upset','upset'],['U3','relative-outer-exhibition-upset','upset'],['U4','outer-motor-breakthrough','upset'],['U5','inner-favorite-second','upset'],['U6','inner-favorite-outside-podium','upset']];
export const STRATEGY_DEFINITIONS=Object.freeze(defs.map(([id,name,group])=>Object.freeze({id,name,group})));
export function generateTwelveResearchPicks(boats){
 if(!Array.isArray(boats)||boats.length!==6||new Set(boats.map(b=>b?.boat)).size!==6||new Set(boats.map(b=>b?.course)).size!==6||boats.some(b=>!Number.isInteger(b?.boat)||b.boat<1||b.boat>6||!Number.isInteger(b?.course)||b.course<1||b.course>6||b.courseVerified!==true||!finite(b.score)||!finite(b.averageST)||!finite(b.exhibitionTime)||!finite(b.motorTwoWinRate)))return {status:'insufficient_verified_features',picks:[]};
 const byId=new Map(boats.map(b=>[b.boat,b])),leader=[...boats].sort((a,b)=>b.score-a.score||a.course-b.course)[0];
 const norm=(b,k)=>k==='score'?b.score/100:k==='course'?(7-b.course)/6:k==='st'?1-b.averageST:k==='exhibition'?7-b.exhibitionTime:k==='motor'?b.motorTwoWinRate/100:0;
 const v=(b,weights)=>weights.reduce((sum,[k,w])=>sum+norm(b,k)*w,0);
 const favoriteWeights=[[['score',1]],[['score',.55],['course',.45]],[['score',.55],['st',.45]],[['score',.55],['exhibition',.45]],[['score',.55],['motor',.45]],[['score',.35],['course',.15],['st',.2],['exhibition',.15],['motor',.15]]];
 const ids=boats.map(b=>b.boat),all=[];for(const a of ids)for(const b of ids)for(const c of ids)if(a!==b&&a!==c&&b!==c)all.push([a,b,c]);
 const used=new Set(),picks=[];
 for(let i=0;i<12;i++){
  const [id,name,group]=defs[i],candidates=[];
  for(const order of all){
   const [a,b,c]=order.map(x=>byId.get(x));let merit;
   if(i<6){const w=favoriteWeights[i];merit=v(a,w)*.56+v(b,w)*.29+v(c,w)*.15;}
   else{
    const beaten=[b,c].filter(x=>x.course<a.course&&x.score>=a.score);if(!beaten.length)continue;
    const strongest=beaten.sort((x,y)=>y.score-x.score)[0],scoreDiff=(strongest.score-a.score)/100,startDiff=strongest.averageST-a.averageST,exhibitDiff=strongest.exhibitionTime-a.exhibitionTime,motorDiff=(a.motorTwoWinRate-strongest.motorTwoWinRate)/100;
    const base=.20*v(a,[['score',.5],['st',.25],['exhibition',.25]])+.08*v(b,[['score',1]])+.04*v(c,[['score',1]]);
    if(i===6)merit=base-.7*scoreDiff;
    if(i===7){if(startDiff<.03)continue;merit=base+3*startDiff;}
    if(i===8){if(exhibitDiff<.05)continue;merit=base+2*exhibitDiff;}
    if(i===9){if(motorDiff<=0)continue;merit=base+.6*motorDiff;}
    if(i===10){if(b.boat!==leader.boat||a.course<=leader.course)continue;merit=base+.5*startDiff;}
    if(i===11){if(a.course<=leader.course||b.boat===leader.boat||c.boat===leader.boat||leader.score<a.score)continue;merit=base+.5*startDiff;}
   }
   candidates.push({order,merit});
  }
  candidates.sort((x,y)=>y.merit-x.merit||x.order.join('').localeCompare(y.order.join('')));
  const selected=candidates.find(x=>!used.has(x.order.join('-')));
  if(selected){used.add(selected.order.join('-'));picks.push({strategy:id,hypothesis:name,group,order:selected.order,merit:Number(selected.merit.toFixed(5))});}
  else picks.push({strategy:id,hypothesis:name,group,order:null,reason:'no_distinct_qualifying_ticket'});
 }
 return {status:picks.every(p=>p.order)?'complete':'partial',picks,warning:'Twelve different heuristic hypotheses, not calibrated probabilities or validated betting recommendations.'};
}
