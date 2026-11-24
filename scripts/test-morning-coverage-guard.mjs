import assert from 'node:assert/strict';
import fs from 'node:fs';
const worker=fs.readFileSync(new URL('../worker.js',import.meta.url),'utf8');
const deploy=fs.readFileSync(new URL('../.github/workflows/boat-score-2-preview-deploy.yml',import.meta.url),'utf8');
const crons=[...(deploy.match(/crons\s*=\s*\[([^\]]+)\]/)?.[1]||'').matchAll(/"([^"]+)"/g)].map(m=>m[1]);
const cron=crons.find(x=>x==='0 23 * * *'||x==='*/5 23 * * *')??null;
const venueCap=Number(worker.match(/const remaining=venues\.filter\([\s\S]*?\.slice\(0,(\d+)\)/)?.[1]??0);
const daily=cron==='0 23 * * *';
const retryEveryFiveMinutes=cron==='*/5 23 * * *';
assert.ok(cron,'Morning cron trigger must be configured');
assert.ok(venueCap>0,'Morning per-invocation venue cap must be discoverable');
assert.ok(daily||retryEveryFiveMinutes,'Unexpected morning cron cadence: '+cron);
const maxInvocations=retryEveryFiveMinutes?12:1;
const theoreticalVenueCapacity=venueCap*maxInvocations;
const guaranteedCoverage=false; // Requires live official schedule, six-boat inputs and saved records.
console.log(JSON.stringify({cron,venueCap,maxInvocations,theoreticalVenueCapacity,guaranteedCoverage,
 note:'Capacity is only an upper bound, not proof of verified venue/race coverage.'}));
