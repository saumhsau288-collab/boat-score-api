// Research-only: evaluate all 15 ordered inner/outer course pairs per race.
// Each race is counted once in race-level outcomes, even with several flagged pairs.
import {relativeFeatures} from './relative-features.mjs';
export function auditAllOuterPairs(rows,{minSTGap=0.03,minExhibitionGap=0.05}={}){
 if(!Array.isArray(rows))throw Error('rows_must_be_array');
 if(!Number.isFinite(minSTGap)||minSTGap<0||!Number.isFinite(minExhibitionGap)||minExhibitionGap<0)throw Error('invalid_threshold');
 const report={total:rows.length,eligible:0,rejected:{},eligiblePairs:0,comparedPairs:0,missingSignals:0,flaggedPairs:0,flaggedPairsOuterWon:0,flaggedPairsOuterSecond:0,flaggedPairsOuterThird:0,flaggedRaces:0,flaggedRacesWithWinner:0,flaggedRacesWithSecond:0,flaggedRacesWithThird:0,byScoreRelation:{tie:{pairs:0,flagged:0},innerHigher:{pairs:0,flagged:0}},examples:[]};
 const reject=reason=>report.rejected[reason]=(report.rejected[reason]||0)+1;
 for(const row of rows){
  if(row?.capturedBeforeCutoff!==true||row?.officialResultVerified!==true){reject('unverified_capture_or_result');continue;}
  if(!Array.isArray(row.actual)||row.actual.length!==3||new Set(row.actual).size!==3||row.actual.some(x=>!Number.isInteger(x)||x<1||x>6)){reject('invalid_result');continue;}
  let features;try{features=relativeFeatures(row.boats);}catch{reject('invalid_course');continue;}
  const byBoat=new Map(row.boats.map(b=>[b.boat,b]));
  if(row.boats.some(b=>typeof b.score!=='number'||!Number.isFinite(b.score))){reject('invalid_score');continue;}
  report.eligible++;
  const flaggedBoats=new Set();
  for(let i=0;i<features.length;i++)for(let j=i+1;j<features.length;j++){
   const inner=byBoat.get(features[i].boat),outer=byBoat.get(features[j].boat);
   if(inner.score<outer.score)continue;
   report.eligiblePairs++;
   if(!Number.isFinite(inner.averageST)||!Number.isFinite(outer.averageST)||!Number.isFinite(inner.exhibitionTime)||!Number.isFinite(outer.exhibitionTime)){report.missingSignals++;continue;}
   const stGap=Number((inner.averageST-outer.averageST).toFixed(4));
   const exhibitionGap=Number((inner.exhibitionTime-outer.exhibitionTime).toFixed(4));
   report.comparedPairs++;
   const relation=inner.score===outer.score?'tie':'innerHigher';
   report.byScoreRelation[relation].pairs++;
   if(stGap<minSTGap||exhibitionGap<minExhibitionGap)continue;
   report.flaggedPairs++;report.byScoreRelation[relation].flagged++;flaggedBoats.add(outer.boat);
   if(row.actual[0]===outer.boat)report.flaggedPairsOuterWon++;
   if(row.actual[1]===outer.boat)report.flaggedPairsOuterSecond++;
   if(row.actual[2]===outer.boat)report.flaggedPairsOuterThird++;
   if(report.examples.length<20)report.examples.push({date:row.date,venue:row.venue,race:row.race,innerBoat:inner.boat,outerBoat:outer.boat,innerCourse:inner.course,outerCourse:outer.course,stGap,exhibitionGap});
  }
  if(flaggedBoats.size){
   report.flaggedRaces++;
   if(flaggedBoats.has(row.actual[0]))report.flaggedRacesWithWinner++;
   if(flaggedBoats.has(row.actual[1]))report.flaggedRacesWithSecond++;
   if(flaggedBoats.has(row.actual[2]))report.flaggedRacesWithThird++;
  }
 }
 return {...report,flaggedRaceWinnerRate:report.flaggedRaces?report.flaggedRacesWithWinner/report.flaggedRaces:null,flaggedRaceSecondRate:report.flaggedRaces?report.flaggedRacesWithSecond/report.flaggedRaces:null,flaggedRaceThirdRate:report.flaggedRaces?report.flaggedRacesWithThird/report.flaggedRaces:null,note:'All relative inner/outer verified course pairs. Multiple correlated pairs per race; race-level rates are not ticket hit rates. Input must be provenance-checked and deduplicated upstream.'};
}
