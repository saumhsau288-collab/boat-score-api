// Research-only extraction from the explicit /api/official/race-data response.
// Does not use derived rankedScores and never fabricates missing inputs.
import {inspectSixRacerStage} from './inspect-six-racer-stage.mjs';
const numeric=v=>typeof v==='number'&&Number.isFinite(v)?v:null;
export function extractOfficialSixRacerInputs(data,stage='morning'){
 if(!data||data.racersVerified!==true||data.statsVerified!==true||
   !Array.isArray(data.racersByBoat)||data.racersByBoat.length!==6||
   !Array.isArray(data.statsByBoat)||data.statsByBoat.length!==6)
  return {status:'official_six_racer_identity_unverified',rows:[],complete:false,authenticated:false};
 const racers=new Map();
 for(const r of data.racersByBoat){
  if(!Number.isInteger(r?.boat)||r.boat<1||r.boat>6||racers.has(r.boat)||!String(r.racerId??'').trim())
   return {status:'official_six_racer_identity_unverified',rows:[],complete:false,authenticated:false};
  racers.set(r.boat,String(r.racerId));
 }
 const ex=new Map((data.exhibitionVerified===true&&Array.isArray(data.exhibitionByBoat)?data.exhibitionByBoat:[]).map(r=>[r.boat,r]));
 const starts=new Map((data.startVerified===true&&Array.isArray(data.startByCourse)?data.startByCourse:[]).map(r=>[r.boat,r]));
 const rows=[];
 for(const r of data.statsByBoat){
  if(!racers.has(r?.boat)||String(r.racerId)!==racers.get(r.boat)||rows.some(x=>x.boat===r.boat))
   return {status:'official_six_racer_identity_unverified',rows:[],complete:false,authenticated:false};
  rows.push({boat:r.boat,racerId:String(r.racerId),
   course:starts.get(r.boat)?.course??null,
   nationalWinRate:numeric(r.nationwide?.winRate),
   localWinRate:numeric(r.local?.winRate),
   motorTwoWinRate:numeric(r.motor?.secondPlaceRate),
   recent50WinRate:null,
   averageStartTiming:numeric(r.averageST),
   exhibitionScore:null,
   exhibitionStartTiming:numeric(starts.get(r.boat)?.startTiming),
   exhibitionTime:numeric(ex.get(r.boat)?.exhibitionTime),
   source:'official_race_data_response_unverified_capture'});
 }
 const inspection=inspectSixRacerStage(rows,stage);
 return {status:inspection.status,rows:rows.sort((a,b)=>a.boat-b.boat),complete:inspection.complete,
  missing:inspection.missing,invalid:inspection.invalid,authenticated:false,
  warning:'API verification flags are not independent authentication; recent50 and exhibitionScore have no verified mapping.'};
}
