// Research-only bridge: generate twelve method decisions from a saved pre-race
// snapshot, but NEVER manufacture verification flags or write-time evidence.
import {generateTwelveIndependentMethods} from './generate-twelve-independent-methods.mjs';
const validTime=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(s)&&Number.isFinite(Date.parse(s));
const num=x=>typeof x==='number'&&Number.isFinite(x)?x:null;
export function prepareIndependentMethodPrediction(snapshot,{predictedAt,writtenAt}={}){
 if(!snapshot||!/^20\d{6}$/.test(String(snapshot.date))||
  !Number.isInteger(snapshot.race)||snapshot.race<1||snapshot.race>12||
  !(Number.isInteger(snapshot.venue)&&snapshot.venue>=1&&snapshot.venue<=24))throw Error('invalid race identity');
 const capturedAt=snapshot.preRaceSnapshot?.capturedAt;
 const scheduledStartAt=snapshot.preRaceSnapshot?.scheduledStartAt;
 if(![capturedAt,scheduledStartAt,predictedAt,writtenAt].every(validTime))throw Error('explicit offset timestamps required');
 if(!(Date.parse(capturedAt)<=Date.parse(predictedAt)&&Date.parse(predictedAt)<=Date.parse(writtenAt)&&Date.parse(writtenAt)<Date.parse(scheduledStartAt)))throw Error('prediction must be written before scheduled start');
 if(!Array.isArray(snapshot.racers)||snapshot.racers.length!==6)throw Error('six racers required');
 const racers=snapshot.racers.map(r=>({
  boat:r.boat,course:r.entryCourse,
  nationalRate:num(r.nationalWinRate),localRate:num(r.localWinRate),
  averageST:num(r.averageStartTiming),motor2Rate:num(r.motorTwoRate),
  exhibitionTime:num(r.exhibitionTime),last50CoursePodiumRate:num(r.last50CoursePodiumRate)
 }));
 const generated=generateTwelveIndependentMethods({racers});
 const methods=Object.fromEntries(Object.entries(generated.methods).map(([id,decision])=>[
  id,decision.status==='predicted'?{trifecta:decision.trifecta,ruleVersion:decision.ruleVersion}:{
   abstained:true,reason:decision.reason,ruleVersion:decision.ruleVersion
  }
 ]));
 return {date:String(snapshot.date),venue:snapshot.venue,race:snapshot.race,
  capturedAt,predictedAt,writtenAt,scheduledStartAt,
  methods,methodVersion:generated.version,
  preRaceVerified:false,ruleVersionsFrozen:false,savedBeforeStart:false,
  sourceVerified:false,
  warning:'DRAFT ONLY. Timing strings, preRaceVerified, ruleVersionsFrozen and savedBeforeStart require independent authentication; never automatically promote these flags.'};
}
