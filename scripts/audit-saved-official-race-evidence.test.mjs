import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {auditSavedOfficialRaceEvidence} from './audit-saved-official-race-evidence.mjs';
test('offline saved evidence audit writes separate unverified report and preserves originals',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'boat-score-evidence-'));
 try{
  const html='<a href="?hd=20261120&jcd=18&rno=1">race</a> 締切予定時刻 10:45';
  const url='https://www.boatrace.jp/owpc/pc/race/beforeinfo?hd=20261120&jcd=18&rno=1';
  const metadata={expected:{date:'20261120',venue:'18',race:1},requestedUrl:url,finalUrl:url,
   receivedAt:'2026-11-20T00:00:00Z',sha256:createHash('sha256').update(html).digest('hex')};
  const h=join(dir,'source.html'),m=join(dir,'source.json'),o=join(dir,'audit.json');
  await writeFile(h,html);await writeFile(m,JSON.stringify(metadata));
  const report=await auditSavedOfficialRaceEvidence({htmlPath:h,metadataPath:m,outputPath:o});
  assert.equal(report.status,'needs_independent_verification');
  assert.equal(report.eligibleForCalibration,false);
  assert.equal(JSON.parse(await readFile(o,'utf8')).eligibleForCalibration,false);
  assert.equal(await readFile(h,'utf8'),html);
  await assert.rejects(auditSavedOfficialRaceEvidence({htmlPath:h,metadataPath:m,outputPath:o}),/EEXIST/);
 }finally{await rm(dir,{recursive:true,force:true});}
});
