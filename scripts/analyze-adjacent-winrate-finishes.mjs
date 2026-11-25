// Read-only descriptive research: adjacent win-rate differences and finishes.
// Input: verified entry and result reports, joined by date, venue, race and racer ID.
import fs from 'node:fs';
export function analyze(entries,results){
 const key=r=>[r.date,r.venue,r.race].join(':');
 const index=new Map();
 for(const r of results.rows||[]){const k=key(r);if(index.has(k))throw Error('Duplicate result '+k);index.set(k,r);}
 const groups={},seen=new Set();let matched=0,rejected=0;
 for(const e of entries.rows||[]){
  const k=key(e);if(seen.has(k))throw Error('Duplicate entry '+k);seen.add(k);
  const r=index.get(k),a=[...(e.racers||[])].sort((x,y)=>x.boat-y.boat),b=r?.racers||[];
  if(!e.statsVerified||a.length!==6||b.length!==6||new Set(a.map(x=>String(x.racerId))).size!==6||new Set(b.map(x=>x.finish)).size!==6||!a.every((x,i)=>x.boat===i+1&&x.racerId!=null&&[x.nationalWinRate,x.localWinRate].every(v=>Number.isFinite(v)&&v>=0&&v<=10)&&b.some(y=>y.boat===x.boat&&String(y.racerId)===String(x.racerId)&&Number.isInteger(y.finish)&&y.finish>=1&&y.finish<=6))){rejected++;continue;}
  matched++;const finish=n=>b.find(x=>x.boat===n).finish;
  for(const mode of ['average','local']){
   const rates=a.map(x=>{const l=x.localWinRate===0?x.nationalWinRate:x.localWinRate;return mode==='local'?l:(l+x.nationalWinRate)/2;});
   for(let i=0;i<5;i++){
    const d=Math.round((rates[i]-rates[i+1])*1000)/1000,abs=Math.abs(d),band=abs<.5?'0-.5':abs<1?'.5-1':abs<1.5?'1-1.5':'1.5+';
    for(const scope of ['all',...(finish(1)===1?['boat1_won']:[])]){
     const id=[e.date,mode,scope,i+1,i+2,d>0?'inner':d<0?'outer':'equal',band].join('|');
     const g=groups[id]??={n:0,inner:[0,0,0,0,0,0],outer:[0,0,0,0,0,0],boat1Wins:0,nextOuterPodium:0,nextOuterEligible:0,localFallbackRaces:0};
     g.n++;g.inner[finish(i+1)-1]++;g.outer[finish(i+2)-1]++;g.boat1Wins+=Number(finish(1)===1);if(i<4){g.nextOuterEligible++;g.nextOuterPodium+=Number(finish(i+3)<=3);}g.localFallbackRaces+=Number(a.some(x=>x.localWinRate===0));
    }
   }
  }
 }
 return {matched,rejected,groups,exploratoryOnly:true,warning:'Historical entry data may be post-race; conditional results are not prospective accuracy. No model calibration.'};
}
if(process.argv[1]&&new URL(import.meta.url).pathname===process.argv[1]){
 const [e,r,o]=process.argv.slice(2);if(!o)throw Error('Usage: entries.json results.json output.json');
 const report=analyze(JSON.parse(fs.readFileSync(e)),JSON.parse(fs.readFileSync(r)));fs.writeFileSync(o,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({matched:report.matched,rejected:report.rejected,groups:Object.keys(report.groups).length}));
}
