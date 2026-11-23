// Research capture safety: stop new requests after repeated explicit upstream 403 reports.
// Count consecutive completed responses; failures without an upstream signal reset the streak.
export function createOfficial403CircuitBreaker(threshold=3){
 if(!Number.isInteger(threshold)||threshold<1)throw new Error('Invalid threshold');
 let consecutive=0,stopped=false;
 return {
  observe(record){
   if(stopped)return true;
   consecutive=record?.response?.officialStatsRetry==='official_http_403'?consecutive+1:0;
   if(consecutive>=threshold)stopped=true;
   return stopped;
  },
  get stopped(){return stopped;},
  get consecutive(){return consecutive;},
  get threshold(){return threshold;}
 };
}
