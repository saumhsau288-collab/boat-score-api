import assert from 'node:assert/strict';
import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
const workflow=fs.readFileSync('.github/workflows/boat-score-2-capture-morning-predictions.yml','utf8');
const selection="filter(name => /^20\\d{6}-\\d+\\.json$/.test(name))";
assert.ok(workflow.includes(selection),'Final guard must select dated prediction captures only');
assert.ok(workflow.includes("name => /^20\\d{6}-\\d+\\.json$/.test(name)"),'Raw summary must select dated captures only');
const loops=[...workflow.matchAll(/for file in prediction-captures\/\*\.json; do([\s\S]*?)done/g)];
assert.ok(loops.length>=6,'Expected all morning audit loops');
for(const [index,match] of loops.entries()){
 assert.ok(match[1].includes('[[ "${file##*/}" =~ ^20[0-9]{6}-[0-9]+\\.json$ ]] || continue'),'Audit loop '+index+' must strictly select raw dated captures');
}
assert.ok(workflow.includes('*-source-evidence.json'),'Official source evidence must be excluded from audits');
const examples=['20261118-12345.json','official-cutoff-source-evidence.json','20261118-12345-quality.json','20261118-12345-cutoff-audit.json'];
const raw=examples.filter(name=>/^20\d{6}-\d+\.json$/.test(name)&&!/-quality\.json$|-score-inputs\.json$|-response-shape\.json$|-cutoff-audit\.json$/.test(name));
assert.deepEqual(raw,['20261118-12345.json']);
// Execute the exact Bash guard, rather than only checking that its text exists.
const guard='[[ "${file##*/}" =~ ^20[0-9]{6}-[0-9]+\\.json$ ]]';
const cases=[
 ['prediction-captures/20261118-12345.json',true],
 ['prediction-captures/20261118-12345-diagnostics.json',false],
 ['prediction-captures/20261118-12345-base-vs-adjusted.json',false],
 ['prediction-captures/20261118-12345-explicit-exclusions.json',false],
 ['prediction-captures/20261118-12345-applied-adjustments.json',false],
 ['prediction-captures/20261118-12345-quality.json',false],
 ['prediction-captures/20261118-12345.json.bak',false],
 ['prediction-captures/20261118-abc.json',false],
 ['prediction-captures/official-cutoff-source-evidence.json',false]
];
for(const [filename,expected] of cases){
 const p=spawnSync('bash',['-c','file="$1"; '+guard,'--',filename],{encoding:'utf8'});
 assert.equal(p.status===0,expected,'Bash raw capture selection: '+filename);
}
console.log('Morning capture file isolation regression tests passed');
