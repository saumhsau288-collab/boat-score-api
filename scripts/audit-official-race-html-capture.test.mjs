import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {auditOfficialRaceHtmlCapture} from './audit-official-race-html-capture.mjs';
const html='<a href="?hd=20261120&jcd=18&rno=1">race</a><p>締切予定時刻 10:45</p>';
const metadata={expected:{date:'20261120',venue:'18',race:1},receivedAt:'2026-11-20T00:00:00Z',requestedUrl:'https://www.boatrace.jp/owpc/pc/race/beforeinfo?hd=20261120&jcd=18&rno=1',finalUrl:'https://www.boatrace.jp/owpc/pc/race/beforeinfo?hd=20261120&jcd=18&rno=1',sha256:createHash('sha256').update(html).digest('hex')};
test('reports identity and cutoff candidates without granting verified status',()=>{
 const out=auditOfficialRaceHtmlCapture({html,metadata});
 assert.equal(out.status,'needs_independent_verification');
 assert.equal(out.eligibleForCalibration,false);
 assert.equal(out.identity.verified,false);
 assert.equal(out.cutoff.verified,false);
 assert.equal(out.officialCutoffVerified,false);
});
test('does not accept ambiguous or missing race markers as verification',()=>{
 const altered=html+'<a href="?hd=20261120&jcd=18&rno=2">other</a>';
 const out=auditOfficialRaceHtmlCapture({html:altered,metadata:{...metadata,sha256:createHash('sha256').update(altered).digest('hex')}});
 assert.equal(out.identity.verified,false);
 assert.equal(out.eligibleForCalibration,false);
});
test('rejects invalid metadata and non-race-specific index capture',()=>{
 assert.equal(auditOfficialRaceHtmlCapture({html,metadata:{...metadata,sha256:'invalid'}}).status,'invalid_capture');
 assert.equal(auditOfficialRaceHtmlCapture({html,metadata:{...metadata,expected:{...metadata.expected,race:null}}}).status,'race_specific_capture_required');
});

test('rejects altered official HTML when the stored SHA-256 no longer matches',()=>{
 const out=auditOfficialRaceHtmlCapture({html:html+' tampered',metadata});
 assert.equal(out.status,'capture_hash_mismatch');
 assert.equal(out.eligibleForCalibration,false);
});

test('rejects official URL metadata from another race or origin',()=>{
 const other=auditOfficialRaceHtmlCapture({html,metadata:{...metadata,finalUrl:metadata.finalUrl.replace('rno=1','rno=2')}});
 assert.equal(other.status,'invalid_official_source_url');
 const external=auditOfficialRaceHtmlCapture({html,metadata:{...metadata,requestedUrl:metadata.requestedUrl.replace('www.boatrace.jp','example.org')}});
 assert.equal(external.status,'invalid_official_source_url');
});
