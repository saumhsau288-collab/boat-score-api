// Standalone, mobile-readable research report generated from a selected-race prediction.
import fs from 'node:fs';
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function renderSelectedRaceHtml(r){
 const tickets=a=>Array.isArray(a)&&a.length?a.map(x=>'<li>'+escape(x.ticket??x)+'</li>').join(''):'<li>予想保留</li>';
 const ranking=(r.ranking??[]).map(x=>'<tr><td>'+escape(x.boat)+'号艇</td><td>'+escape(x.score)+'</td></tr>').join('');
 const comparison=r.makulaboComparison;
 const before=!!comparison;
 const applied=comparison?.applied===true;
 return `<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Boat Score 2 暫定予想</title><style>body{font:16px system-ui,sans-serif;background:#edf3f8;color:#183047;max-width:650px;margin:auto;padding:16px}section{background:white;padding:16px;margin:12px 0;border-radius:14px}h1{font-size:24px}h2{font-size:19px}li{padding:5px}table{width:100%;border-collapse:collapse}td,th{padding:9px;border-bottom:1px solid #ddd;text-align:left}.note{color:#9b4d12}small{line-height:1.6}</style></head><body><h1>Boat Score 2 検証用予想</h1><section><strong>${escape(r.date)} / ${escape(r.venue)}場 / ${escape(r.race)}R</strong><p>取得状態：${escape(r.status)}</p><p class="note">進入：${escape(r.entryScenario??'未確認')}。締切前の実際の進入・直前情報は未確認です。</p></section><section><h2>本命6点（まくらぼ反映前）</h2><ol>${tickets(r.main)}</ol><h2>穴6点（まくらぼ反映前）</h2><ol>${tickets(r.upset)}</ol></section><section><h2>選手評価点</h2><table><thead><tr><th>艇番</th><th>評価点</th></tr></thead><tbody>${ranking}</tbody></table></section><section><h2>まくらぼ直近50走</h2><p>${escape(applied?'選手IDとデータ出典を照合した研究用反映結果':before?'未反映：'+comparison.reason:'未反映：実データ未入力')}</p>${applied?'<h3>反映後・本命</h3><ol>'+tickets(comparison.adjusted.main)+'</ol><h3>反映後・穴</h3><ol>'+tickets(comparison.adjusted.upset)+'</ol>':''}</section><section><small>研究用の暫定評価です。実際の進入・取得時刻・まくらぼデータの原本確認なしに確定予想とは扱いません。自動取得できない値を0に置き換えません。</small></section></body></html>`;
}
if(process.argv[1]&&new URL(import.meta.url).pathname===process.argv[1]){
 const [input,output]=process.argv.slice(2);if(!input||!output)throw Error('Usage: input.json output.html');
 fs.writeFileSync(output,renderSelectedRaceHtml(JSON.parse(fs.readFileSync(input,'utf8'))));
}
