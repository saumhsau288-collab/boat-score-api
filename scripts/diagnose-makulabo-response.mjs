// Read-only diagnostic for an existing Boat Score Makulabo API JSON response.
// Usage: node --experimental-default-type=module scripts/diagnose-makulabo-response.mjs response.json
import fs from 'node:fs';
import {inspectMakulaboApiResponse} from '../boat-score-2-makulabo-api-adapter.js';
const path=process.argv[2];
if(!path){console.error('Usage: node scripts/diagnose-makulabo-response.mjs response.json');process.exitCode=2;}
else {
 try {
  const payload=JSON.parse(fs.readFileSync(path,'utf8'));
  const result=inspectMakulaboApiResponse(payload);
  const summary={
   status:result.status,reason:result.reason??null,
   upstreamStatus:payload?.status??null,
   officialVerified:payload?.officialRacersInspection?.verified===true,
   officialCount:payload?.officialRacersInspection?.racers?.length??0,
   heatmapCount:payload?.heatmapRows?.length??0,
   matchedCount:result.racers?.length??0,
   recent50Ready:result.recent50Ready===true,
   boats:(result.racers??[]).map(r=>({boat:r.boat,racerId:r.racerId,runs:r.runs,firstColumnShare:r.firstColumnShare,firstPlaceRate:r.firstPlaceRate}))
  };
  console.log(JSON.stringify(summary,null,2));
  if(result.status!=='heatmap_matched')process.exitCode=1;
 }catch(e){console.error('Invalid or unreadable API JSON:',e.message);process.exitCode=2;}
}
