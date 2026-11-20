import {inspectResearchCutoffEvidence} from './inspect-research-cutoff-evidence.mjs';
const race={date:'20261120',venue:2,race:1};
const url='https://www.boatrace.jp/owpc/pc/race/racelist?hd=20261120&jcd=02&rno=1';
try {
 const response=await fetch(url,{signal:AbortSignal.timeout(12000),headers:{'User-Agent':'Mozilla/5.0 (BoatScore2Research/1.0)'}});
 const html=await response.text();
 const result=inspectResearchCutoffEvidence({requestedUrl:url,responseUrl:response.url,httpStatus:response.status,contentType:response.headers.get('content-type'),html,race});
 console.log(JSON.stringify({race,httpStatus:response.status,htmlLength:html.length,sourceUrl:url,...result,productionChanged:false},null,2));
} catch(e) {console.log(JSON.stringify({race,status:'fetch_failed',error:String(e.message||e),verified:false,productionChanged:false},null,2));}
