#!/usr/bin/env node
// Offline research bridge: use saved official snapshot and saved Makulabo HTML.
// No remote fetch, no placeholder values, no changes to the deployed Worker.
import fs from 'node:fs';
import {extractMakulaboFinishTable} from '../boat-score-2-makulabo-source-table.js';
import {evaluateVerifiedMakulaboResearch} from './evaluate-verified-makulabo-research.mjs';

export function runSavedMakulaboResearch(snapshot,html){
 if(typeof html!=='string'||html.length>2_000_000)
  return {status:'held',reason:'valid_saved_makulabo_html_required',eligibleForCalibration:false};
 const extracted=extractMakulaboFinishTable(html);
 if(!extracted.verified)
  return {status:'held',reason:extracted.reason||'makulabo_source_table_not_verified',eligibleForCalibration:false};
 // This labelled finish table provides counts; do not invent the distinct
 // verified recent-50 winRate needed for the existing morning scoring engine.
 return evaluateVerifiedMakulaboResearch(snapshot,extracted);
}
if(process.argv[1]&&import.meta.url===new URL('file://'+process.argv[1]).href){
 const [snapshotPath,makulaboHtmlPath]=process.argv.slice(2);
 if(!snapshotPath||!makulaboHtmlPath)
  throw Error('Usage: node scripts/run-saved-makulabo-research.mjs official-snapshot.json makulabo.html');
 const result=runSavedMakulaboResearch(JSON.parse(fs.readFileSync(snapshotPath,'utf8')),
  fs.readFileSync(makulaboHtmlPath,'utf8'));
 console.log(JSON.stringify(result,null,2));
}
