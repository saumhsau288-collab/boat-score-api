// Research-only classification of where the two highest pre-race national win rates sit.
// A classification is NOT a prediction. Never derive ability from post-race outcomes.
export function classifyTopTwoAbilityPlacement(racers) {
 if(!Array.isArray(racers)||racers.length!==6) return null;
 const boats=new Set();
 const rows=[];
 for(const racer of racers){
  const boat=racer?.boat,rate=racer?.nationalWinRate;
  if(!Number.isInteger(boat)||boat<1||boat>6||boats.has(boat)||!Number.isFinite(rate)||rate<0)return null;
  boats.add(boat);rows.push({boat,rate});
 }
 rows.sort((a,b)=>b.rate-a.rate||a.boat-b.boat);
 if(rows[1].rate===rows[2].rate)return null; // Ambiguous top-two boundary
 const [a,b]=rows.slice(0,2).map(x=>x.boat).sort((x,y)=>x-y);
 const group=n=>n<=2?'inner':n===3?'middle':'outer';
 const ga=group(a),gb=group(b);
 let placement;
 if(ga==='inner'&&gb==='inner')placement='innerPair';
 else if(ga==='outer'&&gb==='outer')placement='outerPair';
 else if(ga==='inner'&&gb==='outer')placement='splitInnerOuter';
 else placement='includesMiddle';
 return {boats:[a,b],placement,adjacent:b-a===1,winRateGap:rows[0].rate-rows[1].rate};
}
export function auditAbilityPlacement(records) {
 if(!Array.isArray(records))throw new TypeError('records must be array');
 const groups={innerPair:{races:0,topTwoBothPodium:0},outerPair:{races:0,topTwoBothPodium:0},splitInnerOuter:{races:0,topTwoBothPodium:0},includesMiddle:{races:0,topTwoBothPodium:0}};
 let excluded=0;
 const seen=new Set();
 for(const r of records){
  const o=r?.finishOrder;
  const placement=classifyTopTwoAbilityPlacement(r?.racers);
  if(r?.resultVerified!==true||r?.asOfVerified!==true||r?.capturedBeforeStart!==true||
    !/^20\d{6}$/.test(String(r?.date))||!Number.isInteger(r?.venue)||r.venue<1||r.venue>24||
    !Number.isInteger(r?.race)||r.race<1||r.race>12||
    !Array.isArray(o)||o.length!==6||new Set(o).size!==6||!o.every(n=>Number.isInteger(n)&&n>=1&&n<=6)||!placement){excluded++;continue;}
  const key=[r.date,r.venue,r.race].join(':');
  if(seen.has(key))throw new Error('duplicate race '+key);
  seen.add(key);
  const bucket=groups[placement.placement];bucket.races++;
  if(placement.boats.every(n=>o.slice(0,3).includes(n)))bucket.topTwoBothPodium++;
 }
 for(const g of Object.values(groups))g.topTwoBothPodiumRate=g.races?g.topTwoBothPodium/g.races:null;
 return {groups,excluded,eligible:Object.values(groups).reduce((n,g)=>n+g.races,0),
 warning:'Only verified before-start snapshots qualify. Historical official B/K archive without capture timestamp is excluded; no lookahead, no prediction or score tuning.'};
}
