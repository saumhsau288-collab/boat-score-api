import assert from 'node:assert/strict';
import {relativeFeatures} from './relative-features.mjs';
const boats=Array.from({length:6},(_,i)=>({boat:i+1,course:i+1,courseVerified:true,averageST:0.20-i*0.01,exhibitionTime:6.80-i*0.02}));
const r=relativeFeatures(boats);
assert.equal(r[0].startAdvantageVsInner,null);
assert.equal(r[3].startAdvantageVsInner,0.01);
assert.equal(r[3].exhibitionAdvantageVsInner,0.02);
const swap=boats.map(b=>({...b,course:b.boat===2?4:b.boat===4?2:b.course}));
const s=relativeFeatures(swap);
assert.equal(s[1].boat,4);
assert.equal(s[3].boat,2);
const missing=boats.map(b=>b.boat===4?{...b,averageST:null}:b);
assert.equal(relativeFeatures(missing)[3].startAdvantageVsInner,null);
assert.throws(()=>relativeFeatures(boats.map((b,i)=>i===0?{...b,course:2}:b)),/verified_unique/);
// A high-scored 4th-course boat can be challenged by a faster 5th-course boat.
const challenge=boats.map(b=>({...b,averageST:b.course===4?0.18:b.course===5?0.12:b.averageST,
 exhibitionTime:b.course===4?6.82:b.course===5?6.73:b.exhibitionTime}));
const adjacent=relativeFeatures(challenge);
assert.equal(adjacent[4].innerBoat,4);
assert.equal(adjacent[4].startAdvantageVsInner,0.06);
assert.equal(adjacent[4].exhibitionAdvantageVsInner,0.09);
// No fictitious value when exhibition data is missing.
const noExhibition=challenge.map(b=>b.boat===5?{...b,exhibitionTime:undefined}:b);
assert.equal(relativeFeatures(noExhibition)[4].exhibitionAdvantageVsInner,null);
// Missing course verification must fail closed.
assert.throws(()=>relativeFeatures(boats.map((b,i)=>i===3?{...b,courseVerified:false}:b)),/verified_unique/);
console.log('Relative features: synthetic assertions passed; no historical accuracy claim.');
