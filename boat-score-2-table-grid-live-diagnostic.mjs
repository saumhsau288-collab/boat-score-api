import {expandTableGrid} from './boat-score-2-table-grid-research.js';
import {extractSixOfficialRacers} from './boat-score-2-six-racers-research.js';
const venue=process.env.VENUE||'01', date=process.env.RACE_DATE||'20261121', race=process.env.RACE||'1';
if(!/^(0[1-9]|1[0-9]|2[0-4])$/.test(venue)||!/^20\d{6}$/.test(date)||!/^(?:[1-9]|1[0-2])$/.test(race)) throw Error('invalid_selection');
const url=new URL('https://www.boatrace.jp/owpc/pc/race/racelist');
url.search=new URLSearchParams({rno:race,jcd:venue,hd:date}).toString();
const response=await fetch(url,{signal:AbortSignal.timeout(25000)});
if(!response.ok)throw Error('official_http_'+response.status);
const html=await response.text();
if(html.length>2_000_000)throw Error('html_too_large');
const six=extractSixOfficialRacers(html);
console.log('SIX_RACERS_VERIFICATION',JSON.stringify(six));
if (!six.verified) process.exitCode = 1;
const tables=[...html.matchAll(/<table\b[^>]*>([\s\S]*?)<\/table>/gi)].map(m=>m[0]);
const clean=s=>s.replace(/<[^>]*>/g,' ').replace(/&nbsp;|&#160;/gi,' ').replace(/\s+/g,' ').trim().slice(0,40);
for(let i=0;i<tables.length;i++){
 if(!/全国/.test(tables[i])||!/当地/.test(tables[i])||!/モーター/.test(tables[i]))continue;
 const grid=expandTableGrid(tables[i]);
 const samples=grid.slice(0,7).map((row,index)=>({row:index+1,cells:row.map((cell,col)=>({col,text:clean(cell.html),originRow:cell.originRow,originCol:cell.originCol})).filter(c=>c.text).slice(0,35)}));
 console.log('GROUPED_TABLE_GRID',JSON.stringify({tableIndex:i,rows:grid.length,columns:grid[0]?.length||0,samples}));
}
