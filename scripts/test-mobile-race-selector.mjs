// Static mobile selector regression: check inline JS syntax without browser dependencies.
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const html=fs.readFileSync(new URL('../research/boat-score-2-race-selector.html',import.meta.url),'utf8');
const start=html.indexOf('<script>');const end=html.indexOf('</script>',start);const scripts=start>=0&&end>start?[html.slice(start+8,end)]:[];
assert.equal(scripts.length,1,'Expected one inline selector script');
new vm.Script(scripts[0],{filename:'boat-score-2-race-selector.inline.js'});
for(const selector of ['#date','#venue','#race','#prediction-file','#prediction-view','#open-makulabo'])assert.ok(html.includes(selector),selector);
assert.ok(html.includes('data.status!==\'experimental\''),'Must reject unavailable predictions');
assert.ok(html.includes('data.date!==chosen.date'),'Must reject mismatched date');
assert.ok(html.includes('data.venue!==Number(chosen.venue)'),'Must reject mismatched venue');
assert.ok(html.includes('data.race!==Number(chosen.race)'),'Must reject mismatched race');
console.log('Mobile selector static regression passed');
