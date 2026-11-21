import assert from 'node:assert/strict';
import {parseMakulaboHeatmapSix as parse} from './parse-makulabo-heatmap-six.mjs';
const header='<tr>'+['枠','選手','1 着','2 着','3 着','4 着','5 着','6 着','走','平均'].map(x=>'<th>'+x+'</th>').join('')+'</tr>';
const row=(i,counts,runs)=>'<tr>'+[i,'選手'+i,...counts,runs,'2.76'].map(x=>'<td>'+x+'</td>').join('')+'</tr>';
const rows=Array.from({length:6},(_,i)=>row(i+1,i===0?[19,7,5,7,7,4]:[4,10,11,8,9,8],i===0?49:50));
const html='<table>'+header+rows.join('')+'</table>';
const good=parse(html);
assert.equal(good.verified,true,JSON.stringify(good));
assert.equal(good.racers.length,6);
assert.equal(good.racers[0].runs,49);
assert.equal(good.racers[0].firstPlaceRate,38.78);
assert.equal(good.racers[0].eligibleAsVerifiedRecent50,false);
assert.equal(parse(html.replace('1 着','不明')).verified,false);
assert.equal(parse(html.replace('>49<','>50<')).verified,false);
assert.equal(parse(html+html).verified,false);
assert.equal(parse(html.replace('選手2','選手1')).verified,true); // names are not identity evidence
console.log('Makulabo finish count structural parser tests passed');
