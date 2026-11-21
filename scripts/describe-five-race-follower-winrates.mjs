// Five official racelists retrieved after race day; DESCRIPTIVE ONLY.
// Win rates were not authenticated as the original pre-race prediction inputs.
export const retrospectiveFiveRaces=[
 {venue:17,race:2,winRates:[4.41,6.35,6.14,4.64,3.80,6.38],finish:[1,4,6]},
 {venue:17,race:6,winRates:[3.96,5.53,5.81,4.99,6.76,6.54],finish:[4,3,5]},
 {venue:21,race:4,winRates:[7.24,4.75,7.47,4.56,5.54,5.95],finish:[3,1,6]},
 {venue:21,race:5,winRates:[6.85,5.27,5.04,5.27,5.16,5.68],finish:[1,2,4]},
 {venue:21,race:6,winRates:[4.29,4.10,6.24,4.38,5.22,7.40],finish:[2,1,5]}
];
export function describeFiveRaceFollowerWinRates(records=retrospectiveFiveRaces){
 return records.map(({venue,race,winRates,finish})=>{
  if(winRates.length!==6||finish.length!==3||new Set(finish).size!==3)throw Error('Invalid source');
  const [winner,second,third]=finish;
  const followers=[1,2,3,4,5,6].filter(b=>b!==winner).sort((a,b)=>winRates[b-1]-winRates[a-1]||a-b);
  return {venue,race,winner,second,third,topWinRateFollower:followers[0],
   secondIsTopWinRateFollower:second===followers[0],
   secondRankAmongFollowers:followers.indexOf(second)+1,
   thirdRankAmongFollowers:followers.indexOf(third)+1,
   provenance:'next_day_official_racelist_retrospective_not_authenticated_pre_race'};
 });
}
