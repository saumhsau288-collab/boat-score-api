// Retry only network timeouts; retain each attempt's timestamps for audit.
export async function fetchWithTimeoutRetry(url,{fetchFn=fetch,headers={Accept:'application/json'},now=()=>new Date().toISOString(),timeouts=[20000,10000]}={}) {
  const attempts=[];
  for(let i=0;i<timeouts.length;i++) {
    const attempt=i+1,requestedAt=now();
    try {
      const response=await fetchFn(url,{signal:AbortSignal.timeout(timeouts[i]),headers});
      const responseText=await response.text();
      const receivedAt=now();
      attempts.push({attempt,requestedAt,receivedAt,httpStatus:response.status});
      return {response,responseText,receivedAt,attempts};
    }catch(e) {
      const receivedAt=now(),error=String(e?.message||e);
      attempts.push({attempt,requestedAt,receivedAt,error});
      if(i+1<timeouts.length && /timeout|timed out|aborted due to timeout/i.test(error))continue;
      return {error,receivedAt,attempts};
    }
  }
}
