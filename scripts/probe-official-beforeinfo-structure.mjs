// Read-only research probe for one official beforeinfo page.
// Never infer course from boat, nor treat page reachability as pre-race evidence.
import {extractStartDisplayBoats} from './extract-start-display-boats.mjs';
import {validateOfficialRaceUrl} from './capture-official-html-evidence.mjs';
const date=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Tokyo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()).replaceAll('-','');
const [requestedDate=date, requestedVenue='02', requestedRace='1'] = process.argv.slice(2);
const calendarDate = new Date(requestedDate.replace(/^(\d{4})(\d{2})(\d{2})$/, '$1-$2-$3') + 'T00:00:00Z');
if (!/^20\d{6}$/.test(requestedDate) || !Number.isFinite(calendarDate.getTime()) ||
    calendarDate.toISOString().slice(0,10).replaceAll('-','') !== requestedDate ||
    !/^\d{1,2}$/.test(requestedVenue) || Number(requestedVenue) < 1 || Number(requestedVenue) > 24 ||
    !/^\d{1,2}$/.test(requestedRace) || Number(requestedRace) < 1 || Number(requestedRace) > 12) {
 throw new Error('Expected a valid YYYYMMDD date, venue 1–24, and race 1–12');
}
const expected={date:requestedDate,venue:requestedVenue.padStart(2,'0'),race:Number(requestedRace)};
const url=`https://www.boatrace.jp/owpc/pc/race/beforeinfo?rno=${expected.race}&jcd=${expected.venue}&hd=${expected.date}`;
validateOfficialRaceUrl(url,expected);
try{
 const response=await fetch(url,{redirect:'manual',headers:{Accept:'text/html'},signal:AbortSignal.timeout(20000)});
 const contentType=response.headers.get('content-type')??'';
 if(response.status!==200||!/text\/html/i.test(contentType))
  throw new Error(`Unexpected HTTP response: ${response.status} ${contentType}`);
 const html=await response.text();
 const headings=[...html.matchAll(/<th\b[^>]*>([\s\S]*?)<\/th>/gi)].map(m=>m[1].replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim()).filter(Boolean);
 const labels=['スタート展示','展示タイム','進入','ST','コース','選手名','艇番'];
 const textOnly=s=>s.replace(/<[^>]*>/g,' ').replace(/&nbsp;|&#160;/gi,' ').replace(/\s+/g,' ').trim();
 const tableSummaries=[...html.matchAll(/<table\b[^>]*>([\s\S]*?)<\/table>/gi)].map((m,index)=>{
  const cells=[...m[1].matchAll(/<(th|td)\b[^>]*>([\s\S]*?)<\/\1>/gi)].map(x=>({tag:x[1].toLowerCase(),text:textOnly(x[2]).slice(0,45)}));
  return {index,headerCells:cells.filter(x=>x.tag==='th').slice(0,22),dataCellCount:cells.filter(x=>x.tag==='td').length,firstDataCells:cells.filter(x=>x.tag==='td').slice(0,12)};
 });
 const startTable=[...html.matchAll(/<table\b[^>]*>([\s\S]*?)<\/table>/gi)]
  .map(match=>match[1]).find(table=>table.includes('スタート展示')&&table.includes('table1_boatImage1Number'))??'';
 const startCells=[...startTable.matchAll(/<td\b([^>]*)>([\s\S]*?)<\/td>/gi)].map((m,i)=>({position:i+1,attributes:m[1].slice(0,180),text:textOnly(m[2]).slice(0,35),innerMarkup:m[2].replace(/\s+/g,' ').slice(0,320)}));
 console.log(JSON.stringify({startDisplayCells:startCells}));
 const parsedStartDisplay=extractStartDisplayBoats(html);
 console.log(JSON.stringify({parsedStartDisplay}));
 console.log(JSON.stringify({tableSummaries}));
 console.log(JSON.stringify({url,httpStatus:response.status,contentType:response.headers.get('content-type'),htmlBytes:Buffer.byteLength(html),tableCount:(html.match(/<table\b/gi)||[]).length,matchingLabels:Object.fromEntries(labels.map(x=>[x,headings.filter(h=>h.includes(x)).length])),beforeRaceVerified:false,courseMappingVerified:false}));
 if(parsedStartDisplay.status!=='parsed_start_display')process.exitCode=1;
}catch(e){console.error(JSON.stringify({url,status:'fetch_failed',error:String(e?.message||e)}));process.exitCode=1;}
