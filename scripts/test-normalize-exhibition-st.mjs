import assert from 'node:assert/strict';
import {normalizeExhibitionST as parse} from './normalize-exhibition-st.mjs';
for(const [raw,status,seconds] of [['.12','normal',.12],[' .25 ','normal',.25],['Ｆ．０３','flying',-.03],['L','late',null],['','missing',null],[null,'missing',null],[undefined,'missing',null],['abc','invalid',null],['-0.03','invalid',null],['1.2','invalid',null]]){
 assert.deepEqual(parse(raw),{status,seconds});
}
console.log('PASS: exhibition ST normalization (10 synthetic cases)');
