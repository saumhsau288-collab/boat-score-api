// Offline research only. Does not change the deployed predictor.
// Input metrics must be captured before the race; never reconstruct ST from final results.
// Each metric score is normalized to [0,1]; lower average ST is better.
export const EXPERIMENTAL_WEIGHTS=Object.freeze({
  racerForm:35, start:25, entryCourse:15, motor:10, recent50:10, exhibitionWeather:5
});
const finite01=n=>typeof n==='number'&&Number.isFinite(n)&&n>=0&&n<=1;
export function scoreInsideStartRace(boats,{weights=EXPERIMENTAL_WEIGHTS}={}){
 if(!Array.isArray(boats)||boats.length!==6||
    new Set(boats.map(b=>b?.boat)).size!==6||
    new Set(boats.map(b=>b?.entryCourse)).size!==6||
    boats.some(b=>!Number.isInteger(b.boat)||b.boat<1||b.boat>6||
      !Number.isInteger(b.entryCourse)||b.entryCourse<1||b.entryCourse>6||
      !['racerForm','start','motor','recent50','exhibitionWeather'].every(k=>finite01(b[k])))||
    Object.keys(EXPERIMENTAL_WEIGHTS).some(k=>!Number.isFinite(weights[k])||weights[k]<0)||
    Math.abs(Object.keys(EXPERIMENTAL_WEIGHTS).reduce((s,k)=>s+weights[k],0)-100)>1e-8)
   return {status:'insufficient_or_invalid_pre_race_data',ranked:[]};
 const ranked=boats.map(b=>{
   const entryCourse=(6-b.entryCourse)/5;
   const score=Object.keys(EXPERIMENTAL_WEIGHTS).reduce((sum,k)=>
     sum+weights[k]*(k==='entryCourse'?entryCourse:b[k]),0);
   return {boat:b.boat,entryCourse:b.entryCourse,score:Math.round(score*100)/100};
 }).sort((a,b)=>b.score-a.score||a.entryCourse-b.entryCourse||a.boat-b.boat);
 return {status:'research_only',ranked,weights,calibrated:false,productionChanged:false};
}
export function compareInsideStartHistory(records,{weights=EXPERIMENTAL_WEIGHTS}={}){
 if(!Array.isArray(records))throw Error('records must be an array');
 let eligible=0,top1=0,podiumOverlap=0,exactTop3=0;
 const excluded=[];
 for(const r of records){
   const valid= r?.verifiedPreRace===true&&r?.verifiedOfficialResult===true&&
     typeof r?.capturedAt==='string'&&typeof r?.cutoffAt==='string'&&
     Number.isFinite(Date.parse(r.capturedAt))&&Number.isFinite(Date.parse(r.cutoffAt))&&
     Date.parse(r.capturedAt)<Date.parse(r.cutoffAt)&&
     Array.isArray(r?.actual)&&r.actual.length===3&&
     new Set(r.actual).size===3&&r.actual.every(x=>Number.isInteger(x)&&x>=1&&x<=6);
   const predicted=valid?scoreInsideStartRace(r.boats,{weights}):null;
   if(!valid||predicted.status!=='research_only'){
     excluded.push({race:r?.race??null,reason:'unverified_or_missing_pre_race_evidence'});continue;
   }
   const picks=predicted.ranked.slice(0,3).map(x=>x.boat);
   eligible++;top1+=Number(picks[0]===r.actual[0]);
   podiumOverlap+=picks.filter(x=>r.actual.includes(x)).length;
   exactTop3+=Number(picks.join('-')===r.actual.join('-'));
 }
 return {status:'research_only',eligible,excluded,top1,exactTop3,podiumOverlap,
   calibrated:false,approvedForDeployment:false,
   note:'A historical comparison is not a live forecast or proof of improvement. Hold out later races before any weight change.'};
}
