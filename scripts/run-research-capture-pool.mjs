// Research-only bounded batch dispatcher. No next batch begins after breaker opens.
// In-flight requests in the current batch finish; results retain original task order.
export async function runCapturePool(tasks,capture,{concurrency=3,breaker}={}){
 if(!Number.isInteger(concurrency)||concurrency<1)throw new Error('Invalid concurrency');
 if(!breaker||typeof breaker.observe!=='function')throw new Error('Missing breaker');
 const records=Array(tasks.length).fill(null);
 for(let start=0;start<tasks.length&&!breaker.stopped;start+=concurrency){
  const end=Math.min(start+concurrency,tasks.length);
  const batch=await Promise.all(tasks.slice(start,end).map((task,offset)=>capture(task,start+offset)));
  for(let offset=0;offset<batch.length;offset++){
   const record=batch[offset];
   records[start+offset]=record;
   breaker.observe(record);
  }
 }
 return {records,attempted:records.filter(Boolean).length,planned:tasks.length,stoppedForOfficial403:breaker.stopped};
}
