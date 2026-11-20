// Join research comparison records to a saved capture, without implying historical authentication.
import fs from 'node:fs/promises';
import path from 'node:path';
import {validateResearchJoin} from './validate-research-join-integrity.mjs';
const dir=process.argv[2]||'research-official-racelists';
const captureFile=process.argv[3];
if(!captureFile)throw Error('capture_file_required');
const capture=JSON.parse(await fs.readFile(captureFile,'utf8'));
const comparison=JSON.parse(await fs.readFile(path.join(dir,'racer-comparison-tables.json'),'utf8'));
const coverage=JSON.parse(await fs.readFile(path.join(dir,'prediction-feature-coverage.json'),'utf8'));
const integrity=validateResearchJoin({capture,comparison,coverage});
console.log('Research join integrity:',JSON.stringify(integrity));
const key=r=>[String(r.date),Number(r.venue),Number(r.race)].join(':');
const index=new Map(comparison.races.map(r=>[key(r),r]));
const coverageIndex=new Map(coverage.records.map(r=>[key(r),r]));
const rows=(capture.records||[]).filter(r=>r.response?.ready===true).map(r=>{
 const k=key(r),comparisonRow=index.get(k),coverageRow=coverageIndex.get(k);
 return {date:r.date,venue:r.venue,race:r.race,predictionResponseSha256:r.responseSha256??null,predictionReceivedAt:r.receivedAt??null,hasSavedPrediction:true,hasResearchComparison:Boolean(comparisonRow),hasResearchCoverage:Boolean(coverageRow),savedRankedScoresPresent:Array.isArray(r.response?.rankedScores),descriptiveWinRateOrder:comparisonRow?.byWinRate??null,descriptiveSTOrder:comparisonRow?.byST??null,missingSTBoats:comparisonRow?.missingST??[],originalSixRacerInputsAuthenticated:false,comparisonIsPostHoc:true,calibrationEligible:false};
});
const report={savedReadyRecords:rows.length,joinedComparisons:rows.filter(x=>x.hasResearchComparison).length,missingComparisons:rows.filter(x=>!x.hasResearchComparison).length,originalSixRacerInputsAuthenticated:0,calibrationEligible:0,rows,warning:'Matching date/venue/race is only an identity join. Post-hoc racer comparisons are NOT original app inputs or validated pre-race predictions.'};
await fs.writeFile(path.join(dir,'saved-prediction-research-join.json'),JSON.stringify(report,null,2)+'\n');
console.log('Saved prediction research join:',JSON.stringify({savedReadyRecords:report.savedReadyRecords,joinedComparisons:report.joinedComparisons,missingComparisons:report.missingComparisons,calibrationEligible:0}));
