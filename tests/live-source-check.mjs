const targets = [
  ['official', 'https://www.boatrace.jp/owpc/pc/race/racelist?rno=1&jcd=01&hd=20261113'],
  ['makulabo', 'https://makulabo-jp.com/data/01/1?hd=20261113']
];
for (const [label,url] of targets) {
  try {
    const response = await fetch(url,{redirect:'follow',signal:AbortSignal.timeout(10000),headers:{Accept:'text/html'}});
    const type=response.headers.get('content-type') || '';
    const body=await response.text();
    const text=body.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ').replace(/<[^>]*>/g,' ');
    const summary={source:label,status:response.status,contentType:type.split(';')[0],htmlLength:body.length,
      heatmapHeading:/枠番別ヒートマップ/.test(text),
      racerProfiles:(body.match(/racersearch\/profile/g)||[]).length,
      loginOrSignup:/ログイン|会員登録|新規登録/.test(text)};
    console.log(JSON.stringify(summary));
  } catch (e) {
    console.log(JSON.stringify({source:label,error:String(e?.message||e)}));
  }
}
console.log('Diagnostics only: no login bypass, no page contents stored, no deployment');
