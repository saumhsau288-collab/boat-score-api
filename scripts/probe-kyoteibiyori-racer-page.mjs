// Read-only public page diagnostics for Kyoteibiyori racer data availability.
// No bypass, API guessing, personal accounts, bulk scraping or app changes.
const HOST='kyoteibiyori.com';
export function inspectRacerPageHtml(html){
 if(typeof html!=='string')throw Error('HTML string required');
 const text=html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,' ').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ');
 const scripts=[...html.matchAll(/<script\b[^>]*src=["']([^"']+)["']/gi)].map(m=>m[1]);
 return {htmlBytes:Buffer.byteLength(html),loadingMessagePresent:text.includes('データ取得中です'),
  recentSixMonthDisclaimer:text.includes('直近6カ月'),registrationNumberLabelPresent:/登録番号|登録No|登番/.test(text),
  externalScriptCount:scripts.filter(s=>/^https?:\/\//.test(s)).length,
  sameOriginScriptCount:scripts.filter(s=>s.startsWith('/')||!/^https?:\/\//.test(s)).length,
  racerRowsIndependentlyConfirmed:false,
  automatedRegistrationSearchConfirmed:false,
  historicalAsOfDataConfirmed:false,
  warning:'Static HTML structure alone does not confirm server-side racer records, registration-number lookup, permission to automate, or historically valid pre-race statistics.'};
}
// Do not programmatically access this provider: its terms prohibit automated access
// without prior permission. Inspect only HTML supplied by an authorized user.
