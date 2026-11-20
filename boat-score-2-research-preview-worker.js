// Isolated research preview API. Does not replace the deployed Boat Score 2 UI.
// The caller must supply independently verified six-racer data; no live feed is implied.
import {evaluateVerifiedPayload} from './boat-score-2-adapter.js';

const json=(data,status=200)=>new Response(JSON.stringify(data),{
  status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store',
  'access-control-allow-origin':'*','access-control-allow-methods':'GET, POST, OPTIONS',
  'access-control-allow-headers':'content-type'}
});
export default {
  async fetch(request){
    const url=new URL(request.url);
    if(request.method==='OPTIONS')return new Response(null,{status:204,headers:{
      'access-control-allow-origin':'*','access-control-allow-methods':'GET, POST, OPTIONS',
      'access-control-allow-headers':'content-type'}});
    if(url.pathname==='/health'&&request.method==='GET')
      return json({status:'ok',service:'boat-score-2-research-preview',deployedScoring:false,liveData:false});
    if(url.pathname!=='/api/research/evaluate')return json({error:'not_found'},404);
    if(request.method!=='POST')return json({error:'method_not_allowed'},405);
    const type=request.headers.get('content-type')||'';
    if(!/^application\/json(?:\s*;|$)/i.test(type))return json({error:'json_required'},415);
    const length=Number(request.headers.get('content-length')||0);
    if(length>32768)return json({error:'payload_too_large'},413);
    let raw;
    try{raw=await request.text();if(raw.length>32768)return json({error:'payload_too_large'},413);}
    catch{return json({error:'invalid_body'},400);}
    let payload;
    try{payload=JSON.parse(raw);}catch{return json({error:'invalid_json'},400);}
    if(!payload||typeof payload!=='object'||Array.isArray(payload))
      return json({error:'invalid_payload'},400);
    const result=evaluateVerifiedPayload(payload);
    return json({previewOnly:true,liveData:false,sourceVerification:'caller_asserted_not_independently_audited',
      ...result},result.status==='evaluated'?200:422);
  }
};
