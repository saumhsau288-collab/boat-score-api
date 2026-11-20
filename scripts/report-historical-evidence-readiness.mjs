import fs from 'node:fs';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import {evaluateWeightCandidates} from './evaluate-historical-weight-candidates.mjs';
import {inspectArchivedResearchPair} from './inspect-archived-research-pair.mjs';
export function reportHistoricalEvidenceReadiness({records=[],archivedPairs=[]}={}){
 if(!Array.isArray(records)||!Array.isArray(archivedPairs))throw new TypeError('records_and_archivedPairs_must_be_arrays');
 const candidateReport=evaluateWeightCandidates(records);
 const missingCounts={};const archived=[];
 for(const pair of archivedPairs){
  const diagnosis=inspectArchivedResearchPair(pair.official,pair.makulabo);
  archived.push({race:diagnosis.race,missing:diagnosis.missing,boats:diagnosis.rows.map(row=>({boat:row.boat,officialRacerId:row.officialRacerId,sourceRacerId:row.sourceRacerId,sampleRuns:row.sampleRuns,exactly50:row.exactly50,sourceIdentityVerified:row.sourceIdentityVerified,entryCourseVerified:row.officialEntryCourseVerified,recent50Verified:row.recent50Verified,startTimingVerified:row.startTimingVerified,exhibitionVerified:row.exhibitionVerified})),eligibleForWeightTuning:false});
  for(const missing of diagnosis.missing)missingCounts[missing]=(missingCounts[missing]||0)+1;
 }
 return {status:'research_evidence_readiness',recordCount:records.length,archivedPairCount:archivedPairs.length,
  eligibleForHistoricalWeightComparison:candidateReport.eligible,
  requiredVerifiedRaces:candidateReport.required??130,
  excludedHistoricalRecords:candidateReport.excluded,
  archivedMissingCounts:missingCounts,archived,
  weightComparisonStatus:candidateReport.status,
  eligibleForDeployment:false,
  warning:'No fabricated recent-50, source identities, score snapshots or finish positions; all gaps remain excluded.'};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 const [officialPath,makulaboPath,recordsPath]=process.argv.slice(2);
 if(!officialPath||!makulaboPath)throw Error('Usage: node scripts/report-historical-evidence-readiness.mjs official.json makulabo.json [verified-records.json]');
 const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
 console.log(JSON.stringify(reportHistoricalEvidenceReadiness({records:recordsPath?read(recordsPath):[],archivedPairs:[{official:read(officialPath),makulabo:read(makulaboPath)}]}),null,2));
}
