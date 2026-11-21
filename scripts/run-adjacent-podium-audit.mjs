// Read-only CLI for verified official historical result rows.
// Usage: node scripts/run-adjacent-podium-audit.mjs input.json [output.json]
import fs from 'node:fs';
import {auditAdjacentAgainstChance} from './audit-adjacent-baseline.mjs';
export function runAudit(data) {
  const rows=Array.isArray(data)?data:data?.records;
  if(!Array.isArray(rows)) throw new TypeError('Expected an array or {records:array}');
  return auditAdjacentAgainstChance(rows);
}
if(process.argv[1] && import.meta.url===new URL('file://'+process.argv[1]).href) {
  const [input,output]=process.argv.slice(2);
  if(!input) {console.error('Usage: node scripts/run-adjacent-podium-audit.mjs input.json [output.json]');process.exitCode=2;}
  else {
    try {
      const result=runAudit(JSON.parse(fs.readFileSync(input,'utf8')));
      const json=JSON.stringify(result,null,2)+'\n';
      if(output) fs.writeFileSync(output,json);
      else process.stdout.write(json);
    } catch(error) {console.error(error.message);process.exitCode=1;}
  }
}
