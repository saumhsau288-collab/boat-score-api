import test from 'node:test';
import assert from 'node:assert/strict';
import {discoverNestedResponsePaths} from './discover-nested-response-paths.mjs';
test('discovers nested arrays and objects without leaking values or declaring provenance',()=>{
 const data={authenticatedBeforeRace:false,records:[{response:{ready:true,
  boats:[{score:{nationalWinRate:7.1,motorTwoWinRate:44},st:0.14}],
  unrelated:{text:'secret-value'}}}]};
 const out=discoverNestedResponsePaths(data);
 assert.ok(out.possibleInputPaths.includes('boats[].score.nationalWinRate'));
 assert.ok(out.possibleInputPaths.includes('boats[].score.motorTwoWinRate'));
 assert.equal(out.eligibleForCalibration,false);
 assert.equal(out.valuesExtracted,false);
 assert.equal(JSON.stringify(out).includes('secret-value'),false);
});
test('rejects unauthenticated provenance claims and bounds recursion',()=>{
 assert.throws(()=>discoverNestedResponsePaths({authenticatedBeforeRace:true,records:[]}),/provenance/);
 const data={authenticatedBeforeRace:false,records:[{response:{ready:true,score:{value:1}}}]};
 const out=discoverNestedResponsePaths(data,{maxNodes:1});
 assert.equal(out.truncated,true);
 assert.equal(out.eligibleForCalibration,false);
});
