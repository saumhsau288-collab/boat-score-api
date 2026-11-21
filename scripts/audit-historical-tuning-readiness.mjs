// Identify which actual historical races have the evidence required for honest weight tuning.
// No guessing missing fields and no substitution of post-race information.
import {FIELDS} from './tune-historical-weights-research.mjs';
const timed=s=>typeof s==='string'&&/T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(s)?Date.parse(s):NaN;
const officialRaceUrl=r=>{try{const u=new URL(r.officialResultSourceUrl);return u.protocol==='https:'&&u.hostname==='www.boatrace.jp'&&u.pathname==='/owpc/pc/race/raceresult'&&!u.username&&!u.password&&['hd','jcd','rno'].every(k=>u.searchParams.getAll(k).length===1)&&u.searchParams.get('hd')===String(r.date)&&Number(u.searchParams.get('jcd'))===r.venue&&Number(u.searchParams.get('rno'))===r.race;}catch{return false;}};
export function auditHistoricalTuningReadiness(rows){
 if(!Array.isArray(rows))throw Error('Expected historical rows[]');
 const out={total:rows.length,ready:0,blocked:0,missing:{},races:[],warning:'Readiness only; true provenance flags and URLs must be independently checked against saved pre-race records.'};
 for(const r of rows){
  const missing=[];
  if(!/^20\d{6}$/.test(String(r?.date)))missing.push('date');
  if(!Number.isInteger(r?.venue)||r.venue<1||r.venue>24||!Number.isInteger(r?.race)||r.race<1||r.race>12)missing.push('race_key');
  if(!Array.isArray(r?.actual)||r.actual.length!==3||new Set(r.actual).size!==3||r.actual.some(x=>!Number.isInteger(x)||x<1||x>6))missing.push('official_podium');
  if(r?.independentlyVerifiedResult!==true||!officialRaceUrl(r))missing.push('official_result_evidence');
  if(r?.historicalInputProvenanceVerified!==true||!r?.historicalInputSourceUrl)missing.push('historical_input_evidence');
  if(!Number.isFinite(timed(r?.historicalInputCapturedAt))||!Number.isFinite(timed(r?.officialCutoffAt))||timed(r.historicalInputCapturedAt)>=timed(r.officialCutoffAt))missing.push('pre_cutoff_timing');
  if(!Array.isArray(r?.boats)||r.boats.length!==6||new Set(r.boats.map(b=>b?.boat)).size!==6)missing.push('six_boats');
  else for(const f of FIELDS)if(r.boats.some(b=>!Number.isFinite(b?.[f])))missing.push('six_boat_'+f);
  for(const key of missing)out.missing[key]=(out.missing[key]||0)+1;
  if(missing.length)out.blocked++;else out.ready++;
  out.races.push({date:r?.date??null,venue:r?.venue??null,race:r?.race??null,ready:missing.length===0,missing});
 }
 return out;
}
