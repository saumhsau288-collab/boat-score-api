// Research-only storage adapter. No public Worker routes, cron hooks or KV bindings are changed.
// Cloudflare KV lacks an atomic create-if-absent primitive; therefore this adapter
// deliberately refuses writes until an external collision-safe writer is available.
import {planRacerEvidenceKvWrite} from './plan-racer-evidence-kv-write.mjs';
export async function storeRacerEvidenceResearchOnly(snapshot,{kv,dryRun=true}={}){
 const plan=planRacerEvidenceKvWrite(snapshot);
 if(!plan.ready)return {stored:false,reason:plan.reason};
 if(dryRun!==true)return {stored:false,reason:'atomic_create_if_absent_not_available_on_cloudflare_kv',key:plan.key};
 if(!kv||typeof kv.get!=='function')return {stored:false,reason:'research_kv_not_connected',key:plan.key};
 const existing=await kv.get(plan.key);
 if(existing!==null&&existing!==undefined)return {stored:false,reason:'existing_snapshot_key',key:plan.key};
 return {stored:false,dryRun:true,reason:'write_not_enabled',key:plan.key,ttlSeconds:plan.ttlSeconds};
}
