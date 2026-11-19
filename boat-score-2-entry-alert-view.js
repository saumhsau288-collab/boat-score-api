// Safe HTML fragment for an experimental Boat Score 2 entry warning panel.
// This module does not touch the production page or deploy anything.
const escapeHtml=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function renderEntryAlertPanel(entryAlerts){
 if(!entryAlerts||entryAlerts.status!=='evaluated'||!Array.isArray(entryAlerts.alerts))
  return '<section class="bs2-entry-alerts" aria-label="進入変動注意"><p>進入予想データを確認できません。</p></section>';
 const source=entryAlerts.source==='exhibition'?'スタート展示':'進入予想';
 const list=entryAlerts.alerts.map(a=>{
  const label=Number.isInteger(a.boat)&&a.boat>=1&&a.boat<=6&&Number.isInteger(a.entryCourse)&&a.entryCourse>=1&&a.entryCourse<=6
   ?`${a.boat}号艇 → ${a.entryCourse}コース`:'進入情報を確認してください';
  return `<li><strong>${escapeHtml(label)}</strong> <span>${escapeHtml(a.message||'進入変動に注意')}</span></li>`;
 }).join('');
 return `<section class="bs2-entry-alerts" aria-label="進入変動注意"><h3>⚠️ 進入変動注意（${source}）</h3>${list?`<ul>${list}</ul>`:'<p>外枠から内側への進入変動は検出されていません。</p>'}<small>${escapeHtml(entryAlerts.note||'進入は変わる可能性があります。')}</small></section>`;
}
