// Offline CLI: node --experimental-default-type=module scripts/check-boat-score-2-history.mjs data.json
// Reads local pre-race snapshots only. No network, no deployments, no score mutation.
import {readFile} from 'node:fs/promises';
import {summarizeHistoricalComparisons} from '../boat-score-2-historical-evidence-check.js';
const path=process.argv[2];
if(!path){console.error('Usage: node scripts/check-boat-score-2-history.mjs <snapshots.json>');process.exit(2);}
try{
 const data=JSON.parse(await readFile(path,'utf8'));
 if(!Array.isArray(data)){console.error('Expected JSON array of historical snapshots');process.exit(2);}
 const result=summarizeHistoricalComparisons(data);
 console.log(JSON.stringify(result,null,2));
 if(result.status==='invalid_input'||result.status==='duplicate_races')process.exitCode=2;
}catch(e){console.error('Could not validate historical snapshots:',e.message);process.exitCode=2;}
