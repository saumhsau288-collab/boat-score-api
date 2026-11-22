// Research-only: explain why each independent method can/cannot run on a snapshot.
// Does not invent missing features or authenticate sources.
import {generateTwelveIndependentMethods,METHOD_IDS} from './generate-twelve-independent-methods.mjs';
const num=x=>typeof x==='number'&&Number.isFinite(x)?x:null;
export function auditTwelveMethodReadiness(snapshots){
 if(!Array.isArray(snapshots))throw TypeError('snapshots[] required');
 const methods=Object.fromEntries(METHOD_IDS.map(id=>[id,{ready:0,abstained:0,reasons:{}}]));
 const rows=[];
 for(const s of snapshots){
  const row={date:s?.date??null,venue:s?.venue??null,race:s?.race??null,ready:[],abstained:[],invalid:null};
  try{
   const racers=(s?.racers??[]).map(r=>({
    boat:r.boat,course:r.entryCourse,
    nationalRate:num(r.nationalWinRate),localRate:num(r.localWinRate),
    averageST:num(r.averageStartTiming),motor2Rate:num(r.motorTwoRate),
    exhibitionTime:num(r.exhibitionTime),last50CoursePodiumRate:num(r.last50CoursePodiumRate)
   }));
   const output=generateTwelveIndependentMethods({racers});
   for(const id of METHOD_IDS){
    const d=output.methods[id],m=methods[id];
    if(d.status==='predicted'){m.ready++;row.ready.push(id);}
    else{m.abstained++;m.reasons[d.reason]=(m.reasons[d.reason]??0)+1;row.abstained.push({id,reason:d.reason});}
   }
  }catch(e){
   row.invalid=String(e.message||e);
   // A structurally invalid snapshot is not an evaluated method or a miss.
   // Explain why no method could be run without inventing entry courses.
   row.blockedMethods=[...METHOD_IDS];
   row.blockedReason='invalid_six_racer_entry_course_snapshot';
  }
  rows.push(row);
 }
 return {totalSnapshots:snapshots.length,validSnapshots:rows.filter(r=>r.invalid===null).length,
  invalidSnapshots:rows.filter(r=>r.invalid!==null).length,methods,rows,
  warning:'Readiness is NOT historical accuracy or independent provenance verification. Never count missing fields as misses.'};
}
