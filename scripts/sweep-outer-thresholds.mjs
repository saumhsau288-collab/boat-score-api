// Research-only fixed threshold grid. Do not choose a winning threshold on test data.
import fs from 'node:fs';
import {auditOuterChallenges} from './audit-outer-challenges.mjs';
import {validateHistoricalProvenance} from './validate-historical-provenance.mjs';
export const DEFAULT_ST_GAPS=[0,0.02,0.03,0.04,0.06];
export const DEFAULT_EXHIBITION_GAPS=[0,0.03,0.05,0.07,0.10];
export function sweepOuterThresholds(rows,{stGaps=DEFAULT_ST_GAPS,exhibitionGaps=DEFAULT_EXHIBITION_GAPS,strictProvenance=true}={}){
 if(!Array.isArray(stGaps)||!Array.isArray(exhibitionGaps)||!stGaps.length||!exhibitionGaps.length||stGaps.some(x=>!Number.isFinite(x)||x<0)||exhibitionGaps.some(x=>!Number.isFinite(x)||x<0))throw Error('invalid_threshold_grid');
 const eligibleRows=strictProvenance?rows.filter(row=>validateHistoricalProvenance(row).valid):rows;
 const rejectedByProvenance=strictProvenance?rows.length-eligibleRows.length:0;
 const grid=[];
 for(const st of stGaps)for(const ex of exhibitionGaps){
  const r=auditOuterChallenges(eligibleRows,{minSTGap:st,minExhibitionGap:ex});
  grid.push({minSTGap:st,minExhibitionGap:ex,eligibleRaces:r.eligible,comparisons:r.comparisons,missingSignals:r.missingSignals,flagged:r.flagged,flaggedOuterWon:r.flaggedOuterWon,flaggedWinRate:r.flaggedWinRate,unflagged:r.unflagged,unflaggedOuterWon:r.unflaggedOuterWon,unflaggedWinRate:r.unflaggedWinRate,byScoreRelation:r.byScoreRelation});
 }
 return {totalRows:rows.length,provenanceEligibleRows:eligibleRows.length,rejectedByProvenance,strictProvenance,grid,warning:'Descriptive and correlated pair-level counts, NOT race-level prediction hit rate. Thresholds are predeclared; do not select on test sample. Requires authenticated pre-cutoff inputs.'};
}
if(process.argv[1]&&import.meta.url===new URL('file://'+process.argv[1]).href)console.log(JSON.stringify(sweepOuterThresholds(JSON.parse(fs.readFileSync(process.argv[2],'utf8'))),null,2));
