// Research-only comparison of the audited preview Worker ticket selector and
// the separate score-leader selector. Never equate this with live deployment.
import fs from 'node:fs';
import {splitScoreLeaderTickets} from './score-leader-favorite-upset.mjs';
export function previewTicketSelection(rankedScores){
 const valid=Array.isArray(rankedScores)&&rankedScores.length===6&&
  new Set(rankedScores.map(x=>x?.boat)).size===6&&
  rankedScores.every(x=>Number.isInteger(x?.boat)&&x.boat>=1&&x.boat<=6&&Number.isFinite(x?.score));
 if(!valid)return {ready:false,reason:'six_valid_scores_required'};
 const scores=new Map(rankedScores.map(x=>[x.boat,x.score])),comb=[];
 for(let a=1;a<=6;a++)for(let b=1;b<=6;b++)for(let c=1;c<=6;c++){
  if(a===b||a===c||b===c)continue;
  comb.push({boats:[a,b,c],strength:scores.get(a)*.56+scores.get(b)*.29+scores.get(c)*.15});
 }
 comb.sort((a,b)=>b.strength-a.strength||a.boats.join('').localeCompare(b.boats.join('')));
 const main=comb.slice(0,6).map(x=>x.boats),used=new Set(main.map(x=>x.join('-')));
 const upset=comb.filter(x=>x.boats[0]>=4&&!used.has(x.boats.join('-'))).slice(0,6).map(x=>x.boats);
 return {ready:main.length===6&&upset.length===6,main,upset,method:'audited_preview_worker_ticket_selector'};
}
export function comparePreviewAndLeaderSelection(rankedScores){
 const preview=previewTicketSelection(rankedScores);
 const leader=splitScoreLeaderTickets(rankedScores);
 if(!preview.ready||!leader.ready)return {ready:false,reason:'invalid_scores'};
 const key=x=>x.join('-'),intersection=(a,b)=>{const s=new Set(a.map(key));return b.filter(x=>s.has(key)).length};
 return {ready:true,highestScoreBoat:leader.leaderBoat,
  preview:{main:preview.main,upset:preview.upset},
  scoreLeader:{main:leader.main,upset:leader.upset},
  overlap:{main:intersection(preview.main,leader.main),upset:intersection(preview.upset,leader.upset)},
  previewMainLeaderFirst:preview.main.filter(x=>x[0]===leader.leaderBoat).length,
  previewUpsetLeaderFirst:preview.upset.filter(x=>x[0]===leader.leaderBoat).length,
  researchOnly:true,liveDeploymentVerified:false,scoreWeightsChanged:false,
  warning:'Ticket-selection comparison only, using identical supplied final scores; not a historical hit-rate or a deployed Worker check.'};
}
if(process.argv[1]&&new URL(import.meta.url).pathname===process.argv[1]){
 const [input,output]=process.argv.slice(2);
 if(!input||!output)throw Error('Usage: node scripts/compare-preview-leader-tickets.mjs scores.json output.json');
 const result=comparePreviewAndLeaderSelection(JSON.parse(fs.readFileSync(input,'utf8')));
 fs.writeFileSync(output,JSON.stringify(result,null,2)+'\n');
 console.log(JSON.stringify({ready:result.ready,overlap:result.overlap}));
}
