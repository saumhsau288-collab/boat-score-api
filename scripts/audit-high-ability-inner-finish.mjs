// Descriptive finish-order study for high-ability inner boats.
// Archived national win rate is a PROXY, not the actual Boat Score 2 evaluation score.
// Results are never inputs to predictions and cannot justify deployment.
export function auditHighAbilityInnerFinish(reports){
 if(!Array.isArray(reports)||!reports.length)throw Error('reports required');
 const groups=Object.fromEntries(['top1_in_1','top1_in_2','top1_in_1_or_2','top2_in_1_and_2','top2_in_2_and_1','top1_in_1_top2_outside','other'].map(k=>[k,{races:0,first1:0,first2:0,onePodium:0,twoPodium:0,bothPodium:0,exact123:0,exact132:0,oneTwoAnyOrder:0,finishTop12:{},finishTop3:{}}]));
 const abilityGap=Object.fromEntries(['boat1_stronger','boat2_stronger'].map(k=>[k,Object.fromEntries(['lt1','1to2','gte2'].map(b=>[b,{races:0,first1:0,first2:0,bothPodium:0,oneTwoAnyOrder:0}]))]));
 let excluded=0;
 for(const day of reports)for(const venue of day.reports||[])for(const r of venue.records||[]){
  const o=r?.finishOrder,rs=r?.racers;
  if(r?.resultVerified!==true||!Array.isArray(o)||o.length!==6||new Set(o).size!==6||!o.every(n=>Number.isInteger(n)&&n>=1&&n<=6)||!Array.isArray(rs)||rs.length!==6||new Set(rs.map(x=>x?.boat)).size!==6||!rs.every(x=>Number.isInteger(x?.boat)&&x.boat>=1&&x.boat<=6&&Number.isFinite(x?.nationalWinRate)&&x.nationalWinRate>=0)){excluded++;continue;}
  const sorted=[...rs].sort((a,b)=>b.nationalWinRate-a.nationalWinRate||a.boat-b.boat);
  // Ties at the top make the ability rank ambiguous; exclude them rather than infer.
  if(sorted[0].nationalWinRate===sorted[1].nationalWinRate||sorted[1].nationalWinRate===sorted[2].nationalWinRate){excluded++;continue;}
  const first=sorted[0].boat,second=sorted[1].boat;
  // top1_in_1 is reserved for the highest-ranked boat 1, including only unambiguous cases.
  const actualKey=first===1?(second===2?'top2_in_1_and_2':'top1_in_1_top2_outside'):first===2?(second===1?'top2_in_2_and_1':'top1_in_2'):'other';
  const g=groups[actualKey];g.races++;
  if((first===1&&second===2)||(first===2&&second===1)){
   const gap=sorted[0].nationalWinRate-sorted[1].nationalWinRate;
   const bucket=gap<1?'lt1':gap<2?'1to2':'gte2';
   const t=abilityGap[first===1?'boat1_stronger':'boat2_stronger'][bucket];
   t.races++;if(o[0]===1)t.first1++;if(o[0]===2)t.first2++;
   if(o.slice(0,3).includes(1)&&o.slice(0,3).includes(2))t.bothPodium++;
   if((o[0]===1&&o[1]===2)||(o[0]===2&&o[1]===1))t.oneTwoAnyOrder++;
  }
  if(o[0]===1)g.first1++;if(o[0]===2)g.first2++;
  if(o.slice(0,3).includes(1))g.onePodium++;if(o.slice(0,3).includes(2))g.twoPodium++;
  if(o.slice(0,3).includes(1)&&o.slice(0,3).includes(2))g.bothPodium++;
  if(o.slice(0,3).join('-')==='1-2-3')g.exact123++;
  if(o.slice(0,3).join('-')==='1-3-2')g.exact132++;
  if((o[0]===1&&o[1]===2)||(o[0]===2&&o[1]===1))g.oneTwoAnyOrder++;
  const k2=o.slice(0,2).join('-'),k3=o.slice(0,3).join('-');
  g.finishTop12[k2]=(g.finishTop12[k2]||0)+1;g.finishTop3[k3]=(g.finishTop3[k3]||0)+1;
 }
 // Combined top-rated boat 1 includes both groups, without double-counting.
 const combine=(a,b)=>{const g={races:0,first1:0,first2:0,onePodium:0,twoPodium:0,bothPodium:0,exact123:0,exact132:0,oneTwoAnyOrder:0,finishTop12:{},finishTop3:{}};for(const s of [a,b]){for(const k of ['races','first1','first2','onePodium','twoPodium','bothPodium','exact123','exact132','oneTwoAnyOrder'])g[k]+=s[k];for(const k of ['finishTop12','finishTop3'])for(const [key,value] of Object.entries(s[k]))g[k][key]=(g[k][key]||0)+value;}return g;};
 groups.top1_in_1=combine(groups.top2_in_1_and_2,groups.top1_in_1_top2_outside);
 groups.top1_in_2=combine(groups.top1_in_2,groups.top2_in_2_and_1);
 groups.top1_in_1_or_2=combine(groups.top1_in_1,groups.top1_in_2);
 const summarize=g=>({races:g.races,first1:g.first1,first1Rate:g.races?g.first1/g.races:null,first2:g.first2,onePodium:g.onePodium,twoPodium:g.twoPodium,bothPodium:g.bothPodium,exact123:g.exact123,exact132:g.exact132,oneTwoAnyOrder:g.oneTwoAnyOrder,mostCommonTop2:Object.entries(g.finishTop12).sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0])).slice(0,8).map(([order,count])=>({order,count})),mostCommonTop3:Object.entries(g.finishTop3).sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0])).slice(0,8).map(([order,count])=>({order,count}))});
 return {abilityGap,groups:Object.fromEntries(Object.entries(groups).map(([k,v])=>[k,summarize(v)])),excluded,warning:'Archived national win rate is only a proxy for app evaluation score; tied top ranks excluded. Descriptive outcome study only, not a pre-race prediction test.'};
}
