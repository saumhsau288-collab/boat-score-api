// Read-only research probe for one official beforeinfo page.
// Never infer course from boat, nor treat page reachability as pre-race evidence.
import {validateOfficialRaceUrl} from './capture-official-html-evidence.mjs';
const date=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Tokyo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()).replaceAll('-','');
const expected={date,venue:'02',race:1};
const url=`https://www.boatrace.jp/owpc/pc/race/beforeinfo?rno=1&jcd=02&hd=${date}`;
validateOfficialRaceUrl(url,expected);
try{
 const response=await fetch(url,{redirect:'manual',headers:{Accept:'text/html'},signal:AbortSignal.timeout(20000)});
 const html=await response.text();
 const headings=[...html.matchAll(/<th\b[^>]*>([\s\S]*?)<\/th>/gi)].map(m=>m[1].replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim()).filter(Boolean);
 const labels=['スタート展示','展示タイム','進入','ST','コース','選手名','艇番'];
 const textOnly=s=>s.replace(/<[^>]*>/g,' ').replace(/&nbsp;|&#160;/gi,' ').replace(/\\s+/g,' ').trim();
 const tableSummaries=[...html.matchAll(/<table\\b[^>]*>([\\s\\S]*?)<\\/table>/gi)].map((m,index)=>{
  const cells=[...m[1].matchAll(/<(th|td)\\b[^>]*>([\\s\\S]*?)<\\/\\1>/gi)].map(x=>({tag:x[1].toLowerCase(),text:textOnly(x[2]).slice(0,45)}));
  return {index,headerCells:cells.filter(x=>x.tag==='th').slice(0,22),dataCellCount:cells.filter(x=>x.tag==='td').length,firstDataCells:cells.filter(x=>x.tag==='td').slice(0,12)};
 });
 console.log(JSON.stringify({tableSummaries}));
 console.log(JSON.stringify({url,httpStatus:response.status,contentType:response.headers.get('content-type'),htmlBytes:Buffer.byteLength(html),tableCount:(html.match(/<table\b/gi)||[]).length,matchingLabels:Object.fromEntries(labels.map(x=>[x,headings.filter(h=>h.includes(x)).length])),beforeRaceVerified:false,courseMappingVerified:false}));
 if(response.status!==200||!/text\/html/i.test(response.headers.get('content-type')||''))process.exitCode=1;
}catch(e){console.error(JSON.stringify({url,status:'fetch_failed',error:String(e?.message||e)}));process.exitCode=1;}
