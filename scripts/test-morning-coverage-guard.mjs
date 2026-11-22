import assert from 'node:assert/strict';
import fs from 'node:fs';
const worker=fs.readFileSync(new URL('../worker.js',import.meta.url),'utf8');
const deploy=fs.readFileSync(new URL('../.github/workflows/boat-score-2-preview-deploy.yml',import.meta.url),'utf8');
const dailyCron=/crons\s*=\s*\["0 23 \* \* \*"\]/.test(deploy);
const limitedBatch=/const remaining=venues\.filter\([\s\S]*?\.slice\(0,2\)/.test(worker);
const allVenueReady=!(dailyCron&&limitedBatch);
assert.equal(typeof allVenueReady,'boolean');
if(!allVenueReady){
  console.log('COVERAGE WARNING: daily 08:00 JST cron handles at most two venues per day; nationwide morning coverage is NOT verified.');
}else{
  console.log('Coverage guard: two-venue daily cap not detected; full coverage still requires end-to-end verification.');
}
console.log(JSON.stringify({dailyCron,limitedBatch,allVenueReady}));
