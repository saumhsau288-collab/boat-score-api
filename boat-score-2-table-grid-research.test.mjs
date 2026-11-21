import assert from 'node:assert/strict';
import {expandTableGrid} from './boat-score-2-table-grid-research.js';

const html = '<table><tr><th rowspan="2">艇番</th><th colspan="2">全国</th><th rowspan="2">当地</th></tr>'+
 '<tr><th>勝率</th><th>2連率</th></tr>'+
 '<tr><td>1</td><td>6.50</td><td>45.0</td><td>5.20</td></tr></table>';
const grid = expandTableGrid(html);
assert.equal(grid.length, 3);
assert.equal(grid[0].length, 4);
assert.equal(grid[0][0], grid[1][0]);
assert.equal(grid[0][1], grid[0][2]);
assert.equal(grid[0][3], grid[1][3]);
assert.match(grid[2][1].html, /6\.50/);
assert.equal(grid[2][1].originCol, 1);
assert.throws(() => expandTableGrid('<table><tr><td rowspan="0">bad</td></tr></table>'), /invalid_rowspan/);
assert.throws(() => expandTableGrid('<table><tr><td colspan="101">bad</td></tr></table>'), /invalid_colspan/);
assert.deepEqual(expandTableGrid('<table></table>'), []);
console.log('Official table grid research tests passed');
