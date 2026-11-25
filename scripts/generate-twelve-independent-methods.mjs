// Research-only v0: twelve DISTINCT deterministic trifecta rules.
// Input is a pre-race six-racer snapshot. No results, odds, or hindsight accepted.
export const METHOD_VERSION='independent-v1-20261122';
export const METHOD_IDS=[...Array.from({length:6},(_,i)=>'favorite-'+(i+1)),...Array.from({length:6},(_,i)=>'upset-'+(i+1))];
const finite=x=>typeof x==='number'&&Number.isFinite(x);
const rank=(arr,score,ascending=false,tieScore=null)=>[...arr].sort((a,b)=>{
 const d=ascending?score(a)-score(b):score(b)-score(a);
 if(d)return d;
 if(tieScore){const tie=tieScore(b)-tieScore(a);if(tie)return tie;}
 return a.course-b.course||a.boat-b.boat;
});
const triple=arr=>arr.slice(0,3).map(x=>x.boat);
const top=(arr,score,asc=false)=>rank(arr,score,asc)[0];
export function generateTwelveIndependentMethods(snapshot){
 const racers=snapshot?.racers;
 if(!Array.isArray(racers)||racers.length!==6||new Set(racers.map(r=>r?.boat)).size!==6||
    racers.some(r=>!Number.isInteger(r.boat)||r.boat<1||r.boat>6||
      !Number.isInteger(r.course)||r.course<1||r.course>6)||
    new Set(racers.map(r=>r.course)).size!==6)throw new Error('Six unique boats and six unique actual entry courses required');
 const result={version:METHOD_VERSION,methods:{}};
 const missing=(id,reason)=>result.methods[id]={status:'abstain',reason,ruleVersion:METHOD_VERSION};
 const emit=(id,arr)=>result.methods[id]={status:'predicted',trifecta:triple(arr),ruleVersion:METHOD_VERSION};
 const ability=r=>r.localRate===0?r.nationalRate:(r.nationalRate+r.localRate)/2;
 const validAbility=racers.every(r=>finite(r.nationalRate)&&r.nationalRate>=0&&finite(r.localRate)&&r.localRate>=0);
 const has=(key,condition=x=>x>=0)=>racers.every(r=>finite(r[key])&&condition(r[key]));
 const requireRule=(id,ok,reason,fn)=>ok?emit(id,fn()):missing(id,reason);
 const ab=()=>rank(racers,ability);
 const adjusted=r=>ability(r)+(7-r.course)*0.12;
 const st=()=>rank(racers,r=>r.averageST,true,ability);
 const motor=()=>rank(racers,r=>r.motor2Rate,false,ability);
 const exhibition=()=>rank(racers,r=>r.exhibitionTime,true,ability);
 const last50=()=>rank(racers,r=>r.last50CoursePodiumRate,false,ability);
 requireRule('favorite-1',validAbility,'missing_ability',ab);
 requireRule('favorite-2',validAbility&&has('averageST'),'missing_average_st_or_ability',st);
 requireRule('favorite-3',validAbility,'missing_ability',()=>rank(racers,adjusted));
 requireRule('favorite-4',validAbility&&has('motor2Rate',x=>x>=0&&x<=100),'missing_motor_or_ability',motor);
 requireRule('favorite-5',validAbility&&has('exhibitionTime',x=>x>0),'missing_exhibition_or_ability',exhibition);
 requireRule('favorite-6',validAbility&&has('last50CoursePodiumRate',x=>x>=0&&x<=100),'missing_last50_or_ability',last50);
 if(validAbility){
  const leader=ab()[0],remaining=racers.filter(r=>r!==leader);
  const ordered=rank(remaining,adjusted);
  emit('upset-1',[ordered[0],leader,ordered[1]]);
  emit('upset-3',ordered);
  const outside=racers.filter(r=>r.course>=4);
  // Upset 4 needs historical ST even if the outside-course winner happens to rank by ability.
  requireRule('upset-4',has('averageST'),'missing_average_st',()=>{
   const winner=top(outside,r=>adjusted(r)-r.averageST*2);
   return [winner,...rank(racers.filter(r=>r!==winner),adjusted).slice(0,2)];
  });
  const abilityTop2=new Set(ab().slice(0,2).map(r=>r.boat));
  const motorCandidates=has('motor2Rate',x=>x>=0&&x<=100)?
    motor().slice(0,2).filter(r=>!abilityTop2.has(r.boat)):[];
  requireRule('upset-5',motorCandidates.length>0,'missing_motor_or_no_reversal_candidate',()=>{
   const winner=motorCandidates[0];return [winner,...rank(racers.filter(r=>r!==winner),adjusted).slice(0,2)];
  });
  const exhibitionCandidates=has('exhibitionTime',x=>x>0)?
    exhibition().slice(0,2).filter(r=>!abilityTop2.has(r.boat)):[];
  requireRule('upset-6',exhibitionCandidates.length>0,'missing_exhibition_or_no_reversal_candidate',()=>{
   const winner=exhibitionCandidates[0];return [winner,...rank(racers.filter(r=>r!==winner),adjusted).slice(0,2)];
  });
  requireRule('upset-2',has('averageST'),'missing_average_st',()=>{
   const ordered=rank(remaining,r=>r.averageST,true,ability);
   return [ordered[0],ordered[1],leader];
  });
 }else for(let i=1;i<=6;i++)missing('upset-'+i,'missing_ability');
 result.methods=Object.fromEntries(METHOD_IDS.map(id=>[id,result.methods[id]]));
 return result;
}
