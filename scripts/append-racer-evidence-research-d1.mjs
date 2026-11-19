// Research-only D1 adapter: caller must explicitly supply a dedicated research DB binding.
// No production routes or automatic jobs invoke this function.
import {buildRacerEvidenceD1Insert} from './racer-evidence-d1-append-only.mjs';
export async function appendRacerEvidenceToResearchD1(plan,{db,enabled=false}={}){
 const insert=buildRacerEvidenceD1Insert(plan);
 if(!insert.ready)return {stored:false,reason:insert.reason};
 if(enabled!==true)return {stored:false,reason:'research_d1_writes_disabled',key:plan.key};
 if(!db||typeof db.prepare!=='function')return {stored:false,reason:'dedicated_research_d1_binding_missing',key:plan.key};
 try{
  const result=await db.prepare(insert.sql).bind(...insert.params).run();
  if(result?.success!==true||result?.meta?.changes!==1)return {stored:false,reason:'insert_not_confirmed',key:plan.key};
  return {stored:true,key:plan.key};
 }catch(error){
  const message=String(error?.message??'');
  if(/UNIQUE constraint failed|PRIMARY KEY constraint failed|SQLITE_CONSTRAINT_PRIMARYKEY|SQLITE_CONSTRAINT_UNIQUE/i.test(message))return {stored:false,reason:'duplicate_event_key',key:plan.key};
  return {stored:false,reason:'research_d1_write_failed',key:plan.key};
 }
}
