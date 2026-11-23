// Research-only bounded worker pool. Never dispatch new work after the shared breaker opens.
// Already in-flight tasks may complete; their results remain in original task order.
export async function runCapturePool(tasks,capture,{concurrency=3,breaker}={}){
 if(!Number.isInteger(concurrency)||concurrency<1)throw new Error('Invalid concurrency');
 if(!breaker||typeof breaker.observe!=='function')throw new Error('Missing breaker');
 const records=Array(tasks.length).fill(null);
 let next=0;
 await Promise.all(Array.from({length:Math.min(concurrency,tasks.length)},async()=>{
  while(next<tasks.length&&!breaker.stopped){
   const index=next++;
   const record=await capture(tasks[index],index);
   records[index]=record;
   breaker.observe(record);
  }
 }));
 return {records,attempted:records.filter(Boolean).length,planned:tasks.length,stoppedForOfficial403:breaker.stopped};
}
