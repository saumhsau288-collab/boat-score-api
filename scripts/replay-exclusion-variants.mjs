// Historical replay: run the saved/current pre-race scores through multiple exclusion-first variants.
// Never use finish information in selection; results are consulted only after selections are frozen.
import fs from 'node:fs';
export function replayExclusionVariants(rows,{mode='strict_pre_race'}={}){
 if(!['strict_pre_race','retrospective_diagnostic'].includes(mode))throw Error('Invalid evaluation mode');
 if(!Array.isArray(rows))throw Error('Expected array');
 const configs=[
  {id:'baseline_no_exclusion',n:0,rule:'score'},
  {id:'exclude_lowest_1',n:1,rule:'score'},
  {id:'exclude_lowest_2',n:2,rule:'score'},
  {id:'exclude_lowest_3',n:3,rule:'score'},
  {id:'exclude_weak_top2_1',n:1,rule:'top2'},
  {id:'exclude_weak_top2_2',n:2,rule:'top2'},
  {id:'exclude_score_course_1',n:1,rule:'course'},
  {id:'exclude_score_course_2',n:2,rule:'course'},
  {id:'exclude_lowest_1_conditional_second',n:1,rule:'score',secondRule:'neighbor'},
  {id:'exclude_lowest_2_conditional_second',n:2,rule:'score',secondRule:'neighbor'},
  {id:'exclude_lowest_1_top2_second',n:1,rule:'score',secondRule:'top2'},
  {id:'exclude_lowest_2_top2_second',n:2,rule:'score',secondRule:'top2'},
  {id:'multi_winner_top2_1',n:1,rule:'score',secondRule:'multiwinner'},
  {id:'multi_winner_top2_2',n:2,rule:'score',secondRule:'multiwinner'}
 ];
 const counts=Object.fromEntries(configs.map(x=>[x.id,{eligible:0,excludedTopTwoCorrect:0,firstCorrect:0,firstTwoCorrect:0,trifectaSixHit:0,excludedWinner:0,excludedRunnerUp:0}]));
 const held=[],detail=[];
 const seen=new Set();
 for(const row of rows){
  const key=[row.date,row.venue,row.race].join(':');
  if(seen.has(key))throw Error('Duplicate '+key);
  seen.add(key);
  const boats=row.boats,finish=row.officialFinish;
  const valid=/^20\d{6}$/.test(String(row.date))&&Number.isInteger(row.venue)&&row.venue>=1&&row.venue<=24&&Number.isInteger(row.race)&&row.race>=1&&row.race<=12&&
   row.resultVerified===true&&Array.isArray(finish)&&finish.length===6&&new Set(finish).size===6&&finish.every(x=>Number.isInteger(x)&&x>=1&&x<=6)&&
   Array.isArray(boats)&&boats.length===6&&new Set(boats.map(x=>x.boat)).size===6&&boats.every(x=>Number.isInteger(x.boat)&&x.boat>=1&&x.boat<=6&&Number.isFinite(x.score))&&
   (mode==='retrospective_diagnostic'?(row.scoreSource==='current_app_recomputed_after_race'):(typeof row.capturedAt==='string'&&typeof row.deadlineAt==='string'&&Number.isFinite(Date.parse(row.capturedAt))&&Number.isFinite(Date.parse(row.deadlineAt))&&Date.parse(row.capturedAt)<Date.parse(row.deadlineAt)&&row.incidentFree===true));
  if(!valid){held.push({key,reason:'unverified_or_missing_pre_race_evidence'});continue;}
  const actual=finish.slice(0,3).join('-');
  const cases={};
  for(const cfg of configs){
   const rankValue=x=>cfg.rule==='top2'?x.top2Rate:cfg.rule==='course'?x.score+(7-x.entryCourse)*.5:x.score;
   if((cfg.rule==='top2'||cfg.secondRule==='top2')&&!boats.every(x=>Number.isFinite(x.top2Rate))){cases[cfg.id]={status:'held_missing_top2_rate'};continue;}
   if(cfg.rule==='course'&&(!boats.every(x=>Number.isInteger(x.entryCourse)&&x.entryCourse>=1&&x.entryCourse<=6)||new Set(boats.map(x=>x.entryCourse)).size!==6)){cases[cfg.id]={status:'held_invalid_entry'};continue;}
   // Exclude by a selected ranking, then order remaining first/second by original app score.
   const byExclusion=[...boats].sort((a,b)=>rankValue(b)-rankValue(a)||a.boat-b.boat);
   const excluded=byExclusion.slice(6-cfg.n).map(x=>x.boat);
   const remaining=boats.filter(x=>!excluded.includes(x.boat)).sort((a,b)=>b.score-a.score||a.boat-b.boat).map(x=>x.boat);
   const thirdCandidates=boats.slice().sort((a,b)=>b.score-a.score||a.boat-b.boat).map(x=>x.boat);
   // Six combinations. Excluded boats may still be used for third place.
   // Conditional second place is scored after fixing each possible winner.
   // 'neighbor' is a course-adjacency hypothesis, not a proven racing law.
   const scoreFor=(first,second,third)=>{
    const a=boats.find(x=>x.boat===first),b=boats.find(x=>x.boat===second),c=boats.find(x=>x.boat===third);
    if(cfg.secondRule==='neighbor')return a.score*.55+(b.score+((Math.abs(first-second)===1)?5:0))*.30+c.score*.15;
    if(cfg.secondRule==='top2')return a.score*.55+(b.score*.75+b.top2Rate*.25)*.30+c.score*.15;
    return a.score*.55+b.score*.30+c.score*.15;
   };
   const combinations=[];
   // Diversify first-place candidates before selecting runner-up for each one.
   // This is a test hypothesis: no finish data is used to generate picks.
   if(cfg.secondRule==='multiwinner'){
    const leaders=remaining.slice(0,Math.min(3,remaining.length));
    const byWinner=[];
    for(const first of leaders){
     const choices=[];
     for(const second of remaining)for(const third of thirdCandidates){
      if(first===second||first===third||second===third)continue;
      choices.push({pick:[first,second,third].join('-'),score:scoreFor(first,second,third)});
     }
     choices.sort((a,b)=>b.score-a.score||a.pick.localeCompare(b.pick));
     byWinner.push(choices);
    }
    const diversified=[];
    for(let round=0;diversified.length<6&&round<6;round++){
     for(const choices of byWinner){
      const choice=choices[round];
      if(choice&&!diversified.some(x=>x.pick===choice.pick))diversified.push(choice);
      if(diversified.length===6)break;
     }
    }
    combinations.push(...diversified);
   }else{
   for(const first of remaining)for(const second of remaining)for(const third of thirdCandidates){
    if(first===second||first===third||second===third)continue;
    const score=scoreFor(first,second,third);
    combinations.push({pick:[first,second,third].join('-'),score});
   }
   }
   combinations.sort((a,b)=>b.score-a.score||a.pick.localeCompare(b.pick));
   const picks=combinations.slice(0,6).map(x=>x.pick);
   const success=excluded.every(x=>x!==finish[0]&&x!==finish[1]);
   const firstCorrect=remaining[0]===finish[0],firstTwoCorrect=remaining[0]===finish[0]&&remaining[1]===finish[1];
   const stat=counts[cfg.id];stat.eligible++;if(success)stat.excludedTopTwoCorrect++;if(firstCorrect)stat.firstCorrect++;if(firstTwoCorrect)stat.firstTwoCorrect++;if(picks.includes(actual))stat.trifectaSixHit++;if(excluded.includes(finish[0]))stat.excludedWinner++;if(excluded.includes(finish[1]))stat.excludedRunnerUp++;
   cases[cfg.id]={status:'evaluated',excluded,picks,excludedTopTwoCorrect:success,firstCorrect,firstTwoCorrect,trifectaSixHit:picks.includes(actual)};
  }
  detail.push({key,actual,cases});
 }
 return {mode,records:rows.length,held,summary:Object.fromEntries(Object.entries(counts).map(([id,x])=>[id,{...x,exclusionSuccessRate:x.eligible?x.excludedTopTwoCorrect/x.eligible:null,trifectaSixRate:x.eligible?x.trifectaSixHit/x.eligible:null}])),detail,note:mode==='retrospective_diagnostic'?'Retrospective diagnostic ONLY: current app recomputed historical scores may contain post-race revisions. Not prospective accuracy or validated improvement.':'Strict evaluation: pre-deadline historical scores and separately verified official finish required.'};
}
if(process.argv[1]&&import.meta.url===new URL('file://'+process.argv[1]).href){
 if(process.argv.length!==3)throw Error('Usage: node scripts/replay-exclusion-variants.mjs verified-historical-evidence.json');
 console.log(JSON.stringify(replayExclusionVariants(JSON.parse(fs.readFileSync(process.argv[2],'utf8'))),null,2));
}
