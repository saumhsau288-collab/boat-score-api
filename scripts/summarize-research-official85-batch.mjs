#!/usr/bin/env node
// Offline research summary: official-only score independent of Makulabo availability.
// Inputs are saved snapshots from this workflow run. Never tunes or deploys anything.
import fs from 'node:fs';
import {reviewOfficial85VsParsedPodium} from './review-official85-vs-parsed-podium.mjs';

const {CAPTURE_DATE:date,CAPTURE_VENUE,FIRST_RACE,LAST_RACE}=process.env;
const venue=Number(CAPTURE_VENUE);
const load=(prefix,race)=>{
 try{return JSON.parse(fs.readFileSync(
  'prediction-captures/research-'+prefix+'-'+date+'-'+venue+'-'+race+'.json','utf8'))}
 catch{return null}
};
const lines=['## Independent official-85 retrospective review (research only)',
 '| Race | Makulabo status | Official-only score rank | Parsed podium | Finish 1/2/3 score ranks | Top-3 overlap | Exact order | Review |',
 '|---|---|---|---|---|---|---|---|'];
let compared=0,winnerTop=0,exactOrder=0,top3Overlap=0;
const finishScoreRanks=[[],[],[]];
const records=[];
for(let race=Number(FIRST_RACE);race<=Number(LAST_RACE);race++){
 const official=load('official',race),result=load('result',race),makulabo=load('makulabo',race);
 const review=reviewOfficial85VsParsedPodium(official,result);
 const ready=review.status==='research_only_podium_compared';
 records.push({date,venue,race,makulaboStatus:makulabo?.status??'missing',...review});
 const format=xs=>Array.isArray(xs)?xs.join('-'):'held';
 lines.push('| '+race+' | '+(makulabo?.status??'missing')+
  ' | '+(ready?format(review.scoreRanking):'held')+
  ' | '+(ready?format(review.parsedPodium):'held')+
  ' | '+(ready?format(review.actualPodiumScoreRanks):'held')+
  ' | '+(ready?review.top3Overlap+'/3':'held')+
  ' | '+(ready?String(review.exactTop3Order):'held')+
  ' | '+(ready?'compared':review.reason)+' |');
 if(ready){
  compared++;
  top3Overlap+=review.top3Overlap;
  if(review.highestScoreWon)winnerTop++;
  if(review.exactTop3Order)exactOrder++;
  review.actualPodiumScoreRanks.forEach((rank,i)=>finishScoreRanks[i].push(rank));
 }
}
lines.push('',
 'Comparable retrospective races: '+compared,
 'Top-score boat finished first: '+winnerTop+'/'+compared,
 'Exact top-three order: '+exactOrder+'/'+compared,
 'Top-three overlap: '+top3Overlap+'/'+(3*compared),
 'Score ranks of actual winners: '+finishScoreRanks[0].join(', '),
 'Score ranks of actual second-place boats: '+finishScoreRanks[1].join(', '),
 'Score ranks of actual third-place boats: '+finishScoreRanks[2].join(', '),
 '',
 'Makulabo availability is diagnostic only: its failure cannot block official-only comparisons.',
 'Official metrics and results were retrieved retrospectively. Same-source identity matching is NOT independent result verification.',
 'No verified start timing or entry-course mapping in this score, no authenticated pre-race prediction, no calibration, no deployed app changes.'
);
fs.mkdirSync('prediction-captures',{recursive:true});
const out='prediction-captures/research-review-'+date+'-'+venue+'-'+FIRST_RACE+'-'+LAST_RACE+'.json';
fs.writeFileSync(out,JSON.stringify({status:'research_only_batch_review',
 date,venue,firstRace:Number(FIRST_RACE),lastRace:Number(LAST_RACE),
 compared,winnerTop,exactOrder,top3Overlap,finishScoreRanks,
 records,eligibleForCalibration:false,authenticatedHistoricalPrediction:false,
 scoreChangeApplied:false},null,2)+'\n');
if(process.env.GITHUB_STEP_SUMMARY)
 fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,lines.join('\n')+'\n');
console.log(lines.join('\n'));
