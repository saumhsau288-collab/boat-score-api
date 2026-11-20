import assert from 'node:assert/strict';
import {classifyOfficialCaptureHtml as classify} from './classify-official-capture-html.mjs';
assert.deepEqual(classify('<table class="race"><tr></tr></table>'),{explicitNoRaceNotice:false,tableCount:1});
assert.deepEqual(classify('<TABLE><table></table></TABLE>'),{explicitNoRaceNotice:false,tableCount:2});
assert.equal(classify('<p>本日のレースはありません</p>').explicitNoRaceNotice,true);
assert.equal(classify('<p>開催しておりません</p>').explicitNoRaceNotice,true);
assert.equal(classify('<p>開催中</p>').explicitNoRaceNotice,false);
assert.throws(()=>classify(null));
console.log('Official capture HTML diagnostics passed');
