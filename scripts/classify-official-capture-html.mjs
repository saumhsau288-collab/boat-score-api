// Pure research-only classifier; does not claim independent schedule verification.
export function classifyOfficialCaptureHtml(html){
 if(typeof html!=='string')throw Error('html_required');
 const text=html.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ');
 return {explicitNoRaceNotice:/本日のレースはありません|レースは開催されておりません|開催しておりません|開催はありません/.test(text),
  tableCount:(html.match(/<table\b/gi)||[]).length};
}
