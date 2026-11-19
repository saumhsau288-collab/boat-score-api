// Read-only diagnostic of the Makulabo heatmap table headers and row context.
// Prints no raw HTML or personal details; never asserts semantics from numeric counts.
const [date,venue,race]=process.argv.slice(2);
if(!/^20\d{6}$/.test(date??'')||!/^\d{1,2}$/.test(venue??'')||!/^\d{1,2}$/.test(race??'')||+venue<1||+venue>24||+race<1||+race>12)process.exit(2);
const url='https://makulabo-jp.com/data/'+venue.padStart(2,'0')+'/'+Number(race)+'/heatmap?hd='+date;
const strip=s=>s.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,' ').replace(/<[^>]*>/g,' ').replace(/&nbsp;|&#160;/gi,' ').replace(/\s+/g,' ').trim();
try {
 const res=await fetch(url,{signal:AbortSignal.timeout(15000)});
 if(!res.ok)throw Error('HTTP '+res.status);
 const html=await res.text();
 const heading=html.indexOf('枠番別ヒートマップ');
 if(heading<0)throw Error('Heatmap heading not found');
 const tables=[...html.matchAll(/<table\b[^>]*>[\s\S]*?<\/table>/gi)];
 const candidates=tables.map((m,i)=>({index:i,start:m.index,end:m.index+m[0].length,html:m[0]}))
  .map(t=>({...t,distance:t.start<=heading&&t.end>=heading?0:Math.min(Math.abs(t.start-heading),Math.abs(t.end-heading))}))
  .sort((a,b)=>a.distance-b.distance).slice(0,5);
 const reports=candidates.map(t=>{
  const trs=[...t.html.matchAll(/<tr\b[^>]*>[\s\S]*?<\/tr>/gi)].map(m=>m[0]);
  return {tableIndex:t.index,relativeStart:t.start-heading,distanceFromHeading:t.distance,
   headerRows:trs.filter(tr=>/<th\b/i.test(tr)).slice(0,4).map(tr=>[...tr.matchAll(/<th\b[^>]*>([\s\S]*?)<\/th>/gi)].map(m=>strip(m[1]).slice(0,80))),
   sampleRows:trs.filter(tr=>/<td\b/i.test(tr)).slice(0,2).map(tr=>[...tr.matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map(m=>strip(m[1]).slice(0,32))),
   rowCount:trs.length};
 });
 console.log(JSON.stringify({date,venue,race,tableCount:tables.length,heatmapHeadingFound:true,candidateTables:reports,
  warning:'Headers and samples are diagnostics only; column meaning and 50-race sample are not automatically verified.'},null,2));
}catch(e){console.error('Heatmap structure check failed:',e.message);process.exitCode=1;}
