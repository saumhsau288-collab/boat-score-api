// Descriptive post-race course outcomes only. Never use these as pre-race model accuracy.
import fs from 'node:fs';
export function summarizeOfficialInsideCourses(report){
 if(!Array.isArray(report?.rows))throw Error('Expected parsed official rows');
 const out={total:report.rows.length,usable:0,blocked:0,insideWins:0,insidePodiumPlacements:0,insidePodiumSlots:0,insideWinsByCourse:{'1':0,'2':0,'3':0},podiumByCourse:{'1':0,'2':0,'3':0,'4':0,'5':0,'6':0},races:[],eligibleForWeightTuning:false,warning:'Post-race descriptive sample only; no verified pre-race prediction snapshots or independently authenticated results.'};
 for(const r of report.rows){
  const racers=r?.racers;
  const valid=r?.status==='parsed_needs_independent_review'&&Array.isArray(racers)&&racers.length===6&&
   new Set(racers.map(x=>x.boat)).size===6&&new Set(racers.map(x=>x.actualEntryCourse)).size===6&&
   [1,2,3,4,5,6].every(boat=>racers.some(x=>x.boat===boat))&&
   [1,2,3].every(rank=>racers.filter(x=>x.finish===rank).length===1)&&
   [1,2,3].every(rank=>racers.some(x=>x.finish===rank))&&
   racers.every(x=>Number.isInteger(x.actualEntryCourse)&&x.actualEntryCourse>=1&&x.actualEntryCourse<=6);
  if(!valid){out.blocked++;continue;}
  const podium=racers.filter(x=>[1,2,3].includes(x.finish));
  const inside=podium.filter(x=>x.actualEntryCourse<=3).length;
  const winner=podium.find(x=>x.finish===1);
  out.usable++;out.insideWins+=Number(winner.actualEntryCourse<=3);out.insidePodiumPlacements+=inside;out.insidePodiumSlots+=3;
  if(winner.actualEntryCourse<=3)out.insideWinsByCourse[String(winner.actualEntryCourse)]++;
  for(const p of podium)out.podiumByCourse[String(p.actualEntryCourse)]++;
  out.races.push({date:r.date,venue:r.venue,race:r.race,insideWinner:winner.actualEntryCourse<=3,insidePodiumPlacements:inside,independentlyVerified:false});
 }
 return out;
}
if(process.argv[1]&&new URL(import.meta.url).pathname===process.argv[1]){
 const report=summarizeOfficialInsideCourses(JSON.parse(fs.readFileSync(process.argv[2],'utf8')));
 console.log(JSON.stringify(report));
}
