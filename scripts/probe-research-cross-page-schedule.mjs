import {compareResearchOfficialRaceSchedules} from './compare-research-official-race-schedules.mjs';
const date='20261120',venue=2;
const races=[1,2,3];
const pages=[];
for(const race of races){
 const requestedUrl='https://www.boatrace.jp/owpc/pc/race/racelist?hd='+date+'&jcd=02&rno='+race;
 try{
  const response=await fetch(requestedUrl,{signal:AbortSignal.timeout(12000),headers:{'User-Agent':'Mozilla/5.0 (BoatScore2Research/1.0)'}});
  const html=await response.text();
  pages.push({race,requestedUrl,responseUrl:response.url,html});
 }catch(e){console.log(JSON.stringify({status:'fetch_failed',race,error:String(e.message||e),verified:false,productionChanged:false}));process.exit(0);}
}
const result=compareResearchOfficialRaceSchedules(pages,{date,venue});
console.log(JSON.stringify({...result,date,venue,httpRequests:pages.length,productionChanged:false},null,2));
