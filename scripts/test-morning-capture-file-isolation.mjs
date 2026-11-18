import assert from 'node:assert/strict';
import fs from 'node:fs';
const workflow=fs.readFileSync('.github/workflows/boat-score-2-capture-morning-predictions.yml','utf8');
const selection="filter(name => /^20\\d{6}-\\d+\\.json$/.test(name))";
assert.ok(workflow.includes(selection),'Final guard must select dated prediction captures only');
assert.ok(workflow.includes("name => /^20\\d{6}-\\d+\\.json$/.test(name)"),'Raw summary must select dated captures only');
const loops=[...workflow.matchAll(/for file in prediction-captures\/\*\.json; do([\s\S]*?)done/g)];
assert.ok(loops.length>=6,'Expected all morning audit loops');
for(const [index,match] of loops.entries()){
 assert.ok(match[1].includes('20??????-[0-9]*.json'),'Audit loop '+index+' must skip non-dated artifacts');
}
assert.ok(workflow.includes('*-source-evidence.json'),'Official source evidence must be excluded from audits');
const examples=['20261118-12345.json','official-cutoff-source-evidence.json','20261118-12345-quality.json','20261118-12345-cutoff-audit.json'];
const raw=examples.filter(name=>/^20\d{6}-\d+\.json$/.test(name)&&!/-quality\.json$|-score-inputs\.json$|-response-shape\.json$|-cutoff-audit\.json$/.test(name));
assert.deepEqual(raw,['20261118-12345.json']);
console.log('Morning capture file isolation regression tests passed');
