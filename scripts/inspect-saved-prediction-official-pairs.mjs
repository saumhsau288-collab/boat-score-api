// Research-only offline inspection of saved JSON pairs. No network calls.
import fs from 'node:fs';
import {joinPredictionWithOfficialSource} from './join-prediction-official-source.mjs';
export function inspectSavedPredictionOfficialPairs(pairs){
 if(!Array.isArray(pairs))throw Error('pairs must be an array');
 const rows=pairs.map((pair,index)=>{
  try{
   const result=joinPredictionWithOfficialSource(pair?.prediction,pair?.official,pair?.stage??'morning');
   return {index,status:result.status,joined:result.joined,
    temporalOrderPlausible:result.temporalOrderPlausible===true,
    temporalErrors:result.temporalEvidence?.errors??[],
    sourceMissing:result.sourceCompleteness?.missing??{},
    accuracyEligible:false};
  }catch(error){return {index,status:'invalid_pair',joined:false,temporalOrderPlausible:false,
    temporalErrors:['invalid_pair'],sourceMissing:{},accuracyEligible:false};}
 });
 return {pairsScanned:rows.length,joined:rows.filter(x=>x.joined).length,
  temporallyPlausible:rows.filter(x=>x.temporalOrderPlausible).length,
  accuracyEligible:0,rows,
  warning:'No independent source authentication, cutoff verification or result verification performed.'};
}
if(process.argv[1]&&import.meta.url===new URL('file://'+process.argv[1]).href){
 const file=process.argv[2];
 if(!file)throw Error('Usage: node scripts/inspect-saved-prediction-official-pairs.mjs pairs.json');
 const pairs=JSON.parse(fs.readFileSync(file,'utf8'));
 console.log(JSON.stringify(inspectSavedPredictionOfficialPairs(pairs),null,2));
}
