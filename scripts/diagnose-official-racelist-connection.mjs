// Research-only connection diagnostics; no retries, no production changes.
// Compare official host root and exact racelist, with bounded 20s timeout.
const date=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Tokyo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()).replaceAll('-','');
const targets=[
 ['official-root','https://www.boatrace.jp/'],
 ['official-racelist',`https://www.boatrace.jp/owpc/pc/race/racelist?rno=1&jcd=02&hd=${date}`]
];
for(const [name,url] of targets){
 const started=Date.now();
 try{
  const response=await fetch(url,{headers:{Accept:'text/html'},signal:AbortSignal.timeout(20000)});
  console.log(JSON.stringify({name,url,status:'http_response',httpStatus:response.status,contentType:response.headers.get('content-type'),elapsedMs:Date.now()-started}));
  await response.body?.cancel();
 }catch(e){
  console.log(JSON.stringify({name,url,status:'fetch_failed',error:String(e?.message||e),errorName:e?.name||null,causeCode:e?.cause?.code||null,elapsedMs:Date.now()-started}));
 }
}
