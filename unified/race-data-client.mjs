// Read-only client for the unified sandbox. No production deployment.
export function createRaceDataClient({fetcher=globalThis.fetch, now=Date.now, ttl=15000}={}){
  const cache=new Map(), pending=new Map();
  function get(endpoint,{date,venue,race},{refresh=false}={}){
    if(!/^\/api\/official\/(race-data|beforeinfo|racers-only)$/.test(endpoint)) throw Error('Unsupported endpoint');
    if(!/^20\d{6}$/.test(String(date))||!Number.isInteger(Number(venue))||Number(venue)<1||Number(venue)>24||!Number.isInteger(Number(race))||Number(race)<1||Number(race)>12) throw Error('Invalid selection');
    const key=endpoint+'?'+new URLSearchParams({date:String(date),venue:String(Number(venue)),race:String(Number(race))});
    if(pending.has(key)) return pending.get(key);
    const saved=cache.get(key);
    if(!refresh&&saved&&now()-saved.at<ttl) return Promise.resolve(saved.data);
    const task=Promise.resolve().then(async()=>{
      const res=await fetcher(key,{cache:'no-store',signal:AbortSignal.timeout(20000)});
      if(!res.ok) throw Error('HTTP '+res.status);
      const data=await res.json();
      if(data?.error||data?.status==='error') throw Error('Data unavailable');
      if(data&&data.verified===true&&String(data.date)===String(date)&&Number(data.venue)===Number(venue)&&Number(data.race)===Number(race)){
        cache.set(key,{at:now(),data});
        if(cache.size>48) cache.delete(cache.keys().next().value);
      }
      return data;
    }).finally(()=>pending.delete(key));
    pending.set(key,task);return task;
  }
  return {get,clear:()=>cache.clear()};
}
