// Research-only: discover nested response key paths without recording values.
export function discoverNestedResponsePaths(capture,{maxDepth=5,maxNodes=3000}={}){
 if(!capture||!Array.isArray(capture.records)||capture.authenticatedBeforeRace!==false)
  throw Error('invalid_capture_provenance');
 if(!Number.isInteger(maxDepth)||maxDepth<1||maxDepth>8||
    !Number.isInteger(maxNodes)||maxNodes<1||maxNodes>20000)throw Error('invalid_limits');
 const paths=new Map();let visited=0,truncated=false,ready=0;
 function walk(value,path,depth){
  if(visited>=maxNodes){truncated=true;return;}
  visited++;
  if(value===null||typeof value!=='object'||depth>=maxDepth)return;
  if(Array.isArray(value)){
   paths.set(path+'[]',(paths.get(path+'[]')||0)+1);
   for(const child of value.slice(0,6))walk(child,path+'[]',depth+1);
  }else{
   for(const [key,child] of Object.entries(value).slice(0,100)){
    if(visited>=maxNodes){truncated=true;break;}
    const next=path?path+'.'+key:key;
    paths.set(next,(paths.get(next)||0)+1);
    walk(child,next,depth+1);
   }
  }
 }
 for(const record of capture.records){
  if(record.response?.ready!==true)continue;
  ready++;walk(record.response,'',0);
 }
 return {scope:'NESTED_RESPONSE_FIELD_PATHS_ONLY',readyResponses:ready,
  possibleInputPaths:[...paths.keys()].filter(p=>/score|input|win|rate|motor|exhib|recent|50|course|start|\bst\b/i.test(p)).sort(),
  pathsInspected:paths.size,visited,truncated,valuesExtracted:false,
  independentlyAuthenticatedBeforeRace:false,eligibleForCalibration:false};
}
