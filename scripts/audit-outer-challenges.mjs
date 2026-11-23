// Research-only: compare pre-race adjacent-course signals to the verified winner.
// This measures descriptive signal association, NOT betting returns or causality.
import fs from 'node:fs';
import {relativeFeatures} from './relative-features.mjs';
export function auditOuterChallenges(rows,{minSTGap=0.03,minExhibitionGap=0.05}={}){
 if(!Array.isArray(rows))throw Error('rows_must_be_array');
 if(!Number.isFinite(minSTGap)||minSTGap<0||!Number.isFinite(minExhibitionGap)||minExhibitionGap<0)throw Error('invalid_threshold');
 const report={total:rows.length,eligible:0,rejected:{},comparisons:0,flagged:0,flaggedOuterWon:0,flaggedOuterTopTwo:0,flaggedOuterTopThree:0,flaggedRaces:0,flaggedRacesWithWinner:0,flaggedRacesWithTopTwo:0,flaggedRacesWithTopThree:0,unflagged:0,unflaggedOuterWon:0,unflaggedOuterTopTwo:0,unflaggedOuterTopThree:0,missingSignals:0,byScoreRelation:{tie:{flagged:0,flaggedOuterWon:0,unflagged:0,unflaggedOuterWon:0},innerHigher:{flagged:0,flaggedOuterWon:0,unflagged:0,unflaggedOuterWon:0}},examples:[]};
 const reject=k=>report.rejected[k]=(report.rejected[k]||0)+1;
 for(const row of rows){
  if(row?.capturedBeforeCutoff!==true||row?.officialResultVerified!==true){reject('unverified_capture_or_result');continue;}
  if(!Array.isArray(row.boats)||row.boats.length!==6||!Array.isArray(row.actual)||row.actual.length!==3||new Set(row.actual).size!==3||row.actual.some(x=>!Number.isInteger(x)||x<1||x>6)){reject('invalid_result');continue;}
  let f;try{f=relativeFeatures(row.boats);}catch{reject('invalid_course');continue;}
  if(row.boats.some(b=>typeof b.score!=='number'||!Number.isFinite(b.score))){reject('invalid_score');continue;}
  report.eligible++;
  const scores=new Map(row.boats.map(b=>[b.boat,b.score]));
  const flaggedBoats=new Set();
  for(const outer of f.slice(1)){
   const innerScore=scores.get(outer.innerBoat),outerScore=scores.get(outer.boat);
   // Compare only relatively higher/equal-scored inner boats vs their immediate outer neighbor.
   if(innerScore<outerScore)continue;
   if(outer.startAdvantageVsInner===null||outer.exhibitionAdvantageVsInner===null){report.missingSignals++;continue;}
   report.comparisons++;
   const flagged=outer.startAdvantageVsInner>=minSTGap&&outer.exhibitionAdvantageVsInner>=minExhibitionGap;
   const outerWon=row.actual[0]===outer.boat;
   const outerTopTwo=row.actual.slice(0,2).includes(outer.boat);
   const outerTopThree=row.actual.includes(outer.boat);
   const subgroup=report.byScoreRelation[innerScore===outerScore?'tie':'innerHigher'];
   if(flagged){flaggedBoats.add(outer.boat);report.flagged++;subgroup.flagged++;if(outerWon){report.flaggedOuterWon++;subgroup.flaggedOuterWon++;}if(outerTopTwo)report.flaggedOuterTopTwo++;if(outerTopThree)report.flaggedOuterTopThree++;}else{report.unflagged++;subgroup.unflagged++;if(outerWon){report.unflaggedOuterWon++;subgroup.unflaggedOuterWon++;}if(outerTopTwo)report.unflaggedOuterTopTwo++;if(outerTopThree)report.unflaggedOuterTopThree++;}
   if(flagged&&report.examples.length<20)report.examples.push({date:row.date,venue:row.venue,race:row.race,innerBoat:outer.innerBoat,outerBoat:outer.boat,stGap:outer.startAdvantageVsInner,exhibitionGap:outer.exhibitionAdvantageVsInner,outerWon});
  }
  if(flaggedBoats.size){
   report.flaggedRaces++;
   if(flaggedBoats.has(row.actual[0]))report.flaggedRacesWithWinner++;
   if(row.actual.slice(0,2).some(b=>flaggedBoats.has(b)))report.flaggedRacesWithTopTwo++;
   if(row.actual.some(b=>flaggedBoats.has(b)))report.flaggedRacesWithTopThree++;
  }
 }
 return {...report,flaggedRaceWinnerRate:report.flaggedRaces?report.flaggedRacesWithWinner/report.flaggedRaces:null,flaggedRaceTopTwoRate:report.flaggedRaces?report.flaggedRacesWithTopTwo/report.flaggedRaces:null,flaggedRaceTopThreeRate:report.flaggedRaces?report.flaggedRacesWithTopThree/report.flaggedRaces:null,flaggedTopTwoRate:report.flagged?report.flaggedOuterTopTwo/report.flagged:null,flaggedTopThreeRate:report.flagged?report.flaggedOuterTopThree/report.flagged:null,unflaggedTopTwoRate:report.unflagged?report.unflaggedOuterTopTwo/report.unflagged:null,unflaggedTopThreeRate:report.unflagged?report.unflaggedOuterTopThree/report.unflagged:null,flaggedWinRate:report.flagged?report.flaggedOuterWon/report.flagged:null,unflaggedWinRate:report.unflagged?report.unflaggedOuterWon/report.unflagged:null,note:'Descriptive pre-race feature audit only. Pair-level comparisons may repeat within a race. Race-level any-flagged-candidate rates are NOT ticket hit rates or proof of accuracy gain.'};
}
if(process.argv[1]&&import.meta.url===new URL('file://'+process.argv[1]).href)console.log(JSON.stringify(auditOuterChallenges(JSON.parse(fs.readFileSync(process.argv[2],'utf8'))),null,2));
