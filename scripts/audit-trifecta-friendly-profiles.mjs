import {rankNationalLocalAverage} from './audit-boat-one-national-local-average.mjs';
// Fixed pre-result race profiles and exact ordered-triple rates.
// Do not optimize buckets against the same outcomes or claim prospective accuracy.
function pairedExactP(a,b){
 const n=a+b;if(n===0)return 1;
 let term=Math.pow(0.5,n),tail=term;
 for(let k=1;k<=Math.min(a,b);k++){term*= (n-k+1)/k;tail+=term;}
 return Math.min(1,2*tail);
}
export function auditTrifectaFriendlyProfiles(records){
 if(!Array.isArray(records))throw Error('records required');
 const make=()=>({races:0,exactRankOrder:0,topThreeAnyOrder:0,topOneWins:0,boat123Exact:0,boat123AnyOrder:0,rankOnlyCorrect:0,fixedOnlyCorrect:0,bothCorrect:0,neitherCorrect:0});
 const groups={topGapLarge:make(),topGapSmall:make(),thirdFourthGapLarge:make(),thirdFourthGapSmall:make(),topThreeAllInside:make(),topThreeMixed:make(),topThreeAllOutside:make(),topOneBoatOne:make(),topOneOther:make(),boatOneTopInside:make(),boatOneTopMixed:make(),boatOneTopOutside:make(),otherTopInside:make(),otherTopMixed:make(),otherTopOutside:make()};
 let valid=0,excluded=0,ties=0;
 for(const r of records){
  let ranked;try{ranked=rankNationalLocalAverage(r?.racers);}catch{excluded++;continue;}
  const o=r?.finishOrder;
  if(r?.resultVerified!==true||!Array.isArray(o)||o.length!==6||new Set(o).size!==6||!o.every(n=>Number.isInteger(n)&&n>=1&&n<=6)){excluded++;continue;}
  if(ranked.some((x,i)=>i>0&&x.score===ranked[i-1].score)){ties++;continue;}
  valid++;
  const top3=ranked.slice(0,3).map(x=>x.boat);
  const exact=top3.every((x,i)=>o[i]===x);
  const any=top3.every(x=>o.slice(0,3).includes(x));
  const win=o[0]===top3[0];
  const boat123Exact=o[0]===1&&o[1]===2&&o[2]===3;
  const boat123AnyOrder=[1,2,3].every(x=>o.slice(0,3).includes(x));
  const placement=top3.every(x=>x<=3)?'Inside':top3.every(x=>x>=4)?'Outside':'Mixed';
  const keys=[
   ranked[0].score-ranked[1].score>=1?'topGapLarge':'topGapSmall',
   ranked[2].score-ranked[3].score>=1?'thirdFourthGapLarge':'thirdFourthGapSmall',
   top3.every(x=>x<=3)?'topThreeAllInside':top3.every(x=>x>=4)?'topThreeAllOutside':'topThreeMixed',
   top3[0]===1?'topOneBoatOne':'topOneOther',
   (top3[0]===1?'boatOneTop':'otherTop')+placement
  ];
  for(const key of keys){const g=groups[key];g.races++;if(exact)g.exactRankOrder++;if(any)g.topThreeAnyOrder++;if(win)g.topOneWins++;if(boat123Exact)g.boat123Exact++;if(boat123AnyOrder)g.boat123AnyOrder++;if(exact&&boat123Exact)g.bothCorrect++;else if(exact)g.rankOnlyCorrect++;else if(boat123Exact)g.fixedOnlyCorrect++;else g.neitherCorrect++;}
 }
 const pairedEvidence=Object.fromEntries(Object.entries(groups).map(([key,g])=>[key,{discordant:g.rankOnlyCorrect+g.fixedOnlyCorrect,netGain:g.rankOnlyCorrect-g.fixedOnlyCorrect,twoSidedExactP:pairedExactP(g.rankOnlyCorrect,g.fixedOnlyCorrect)}]));
 return {valid,excluded,ties,groups,pairedEvidence,warning:'Archived national/local rates may not be pre-race snapshots. Fixed descriptive profiles only, not validated prospective trifecta predictions; sample sizes and field/inside effects matter.'};
}
