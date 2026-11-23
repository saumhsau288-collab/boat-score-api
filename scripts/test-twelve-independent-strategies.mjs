import assert from 'node:assert/strict';
import {generateTwelveResearchPicks,STRATEGY_DEFINITIONS} from './twelve-independent-strategies.mjs';
const boats=[90,82,74,88,70,65].map((score,i)=>({boat:i+1,course:i+1,courseVerified:true,score,averageST:.20,exhibitionTime:6.80,motorTwoWinRate:40}));
boats[5].averageST=.10;boats[5].exhibitionTime=6.70;boats[5].motorTwoWinRate=80;
const r=generateTwelveResearchPicks(boats);assert.equal(r.picks.length,12);assert.equal(STRATEGY_DEFINITIONS.length,12);
const present=r.picks.filter(p=>p.order);assert.equal(new Set(present.map(p=>p.order.join('-'))).size,present.length);
assert.ok(present.some(p=>p.group==='upset'&&p.order[0]===6));
for(const p of present.filter(p=>p.group==='upset')){const first=boats[p.order[0]-1];assert.ok(p.order.slice(1).some(id=>{const inner=boats[id-1];return inner.course<first.course&&inner.score>=first.score;}));}
assert.equal(generateTwelveResearchPicks(boats.map(b=>({...b,courseVerified:false}))).status,'insufficient_verified_features');
console.log('Twelve independent research strategies synthetic assertions passed.');
