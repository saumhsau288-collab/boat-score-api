import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {auditSavedEvidenceDirectory} from './audit-saved-evidence-directory.mjs';
test('batch audit never upgrades candidates to verified and keeps source unchanged',async()=>{
 const root=await mkdtemp(join(tmpdir(),'boat-score-batch-'));
 try{
  const source=join(root,'source'),output=join(root,'output');
  await mkdir(source);
  const html='<a href="?hd=20261120&jcd=18&rno=1">race</a>';
  const url='https://www.boatrace.jp/owpc/pc/race/beforeinfo?hd=20261120&jcd=18&rno=1';
  const metadata={expected:{date:'20261120',venue:'18',race:1},requestedUrl:url,finalUrl:url,
   requestedAt:'2026-11-19T23:59:59Z',receivedAt:'2026-11-20T00:00:00Z',
   httpStatus:200,contentType:'text/html',byteLength:Buffer.byteLength(html),
   sha256:createHash('sha256').update(html).digest('hex')};
  const stem='20261120-18-1-'+metadata.sha256.slice(0,12);
  await writeFile(join(source,stem+'.html'),html);
  await writeFile(join(source,stem+'.json'),JSON.stringify(metadata));
  const result=await auditSavedEvidenceDirectory({sourceDir:source,outputDir:output});
  assert.equal(result.scanned,1);
  assert.equal(result.needsIndependentVerification,1);
  assert.equal(result.eligibleForCalibration,0);
  assert.equal(JSON.parse(await readFile(join(output,'summary.json'),'utf8')).eligibleForCalibration,0);
  assert.equal(await readFile(join(source,stem+'.html'),'utf8'),html);
  await assert.rejects(auditSavedEvidenceDirectory({sourceDir:source,outputDir:source}),/separate/);
 }finally{await rm(root,{recursive:true,force:true});}
});
