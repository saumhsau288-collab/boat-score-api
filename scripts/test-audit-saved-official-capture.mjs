import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {auditSavedOfficialCapture} from './audit-saved-official-capture.mjs';
const body=Buffer.from('<html>test</html>');
const expected={date:'20261120',venue:'18',race:1};
const metadata={expected,sha256:createHash('sha256').update(body).digest('hex'),
 byteLength:body.length,requestedAt:'2026-11-19T23:40:00Z',
 receivedAt:'2026-11-19T23:40:01Z',raceIdentityVerified:false,cutoffVerified:false};
assert.equal(auditSavedOfficialCapture({body,metadata,expected}).status,'captured_unverified');
assert.equal(auditSavedOfficialCapture({body:Buffer.from('tampered'),metadata,expected}).status,'hold');
assert.equal(auditSavedOfficialCapture({body,metadata:{...metadata,cutoffVerified:true},expected}).status,'hold');
assert.equal(auditSavedOfficialCapture({body,metadata,expected:{...expected,race:3}}).status,'hold');
console.log('Saved capture integrity audit: four synthetic checks passed');
