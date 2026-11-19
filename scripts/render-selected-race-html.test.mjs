import test from 'node:test';import assert from 'node:assert/strict';import {renderSelectedRaceHtml} from './render-selected-race-html.mjs';
test('renders six candidate tickets and Makulabo unavailable note safely',()=>{
 const html=renderSelectedRaceHtml({date:'20261119',venue:18,race:2,status:'experimental',main:[{ticket:'1-2-3'}],upset:[{ticket:'2-1-3'}],ranking:[{boat:1,score:70}]});
 assert.match(html,/1-2-3/);assert.match(html,/2-1-3/);assert.match(html,/実データ未入力/);
});
test('escapes untrusted text in HTML',()=>{
 const html=renderSelectedRaceHtml({date:'20261119',status:'<script>alert(1)</script>',main:[],upset:[]});
 assert.doesNotMatch(html,/<script>/);assert.match(html,/&lt;script&gt;/);
});
