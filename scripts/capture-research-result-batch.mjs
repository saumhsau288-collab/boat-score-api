#!/usr/bin/env node
// Research-only bounded multi-race official result source collection.
// Does not claim that raw HTML constitutes verified finish evidence.
import fs from 'node:fs';
import {captureOfficialResultEvidence} from './capture-official-result-evidence.mjs';
import {parseOfficialResultFinishRows} from './parse-official-result-finish-rows.mjs';
import {inspectOfficialResultMarkup} from './inspect-official-result-markup.mjs';
import {verifyOfficialResultEvidencePair} from './verify-official-result-evidence-pair.mjs';
export async function captureResultBatch(selections,{fetcher=fetch,now=()=>new Date().toISOString(),outputDir='prediction-captures'}={}){
 if(!Array.isArray(selections)||selections.length<1||selections.length>24)throw Error('batch_size_must_be_1_to_24');
 const unique=new Set(selections.map(s=>[s.date,String(s.venue).padStart(2,'0'),s.race].join('|')));
 if(unique.size!==selections.length)throw Error('duplicate_race_selection');
 fs.mkdirSync(outputDir,{recursive:true});
 const results=[];
 for(const selection of selections){
  const evidence=await captureOfficialResultEvidence(selection,fetcher,now,true);
  const {rawHtml,...metadata}=evidence;
  const name='research-result-'+selection.date+'-'+String(selection.venue).padStart(2,'0')+'-'+selection.race;
  let integrity='not_captured',parserStatus='not_parsed',matchedRows=0;
  if(typeof rawHtml==='string'){
   fs.writeFileSync(outputDir+'/'+name+'.html',rawHtml);
   const pair=verifyOfficialResultEvidencePair(metadata,rawHtml);
   integrity=pair.status;
   const parsed=parseOfficialResultFinishRows(rawHtml);
   if(!parsed.verified){
    const markup=inspectOfficialResultMarkup(rawHtml);
    fs.writeFileSync(outputDir+'/'+name+'-markup.json',JSON.stringify(markup,null,2)+'\n');
   }
   parserStatus=parsed.reason??'six_rows_structurally_parsed';
   matchedRows=parsed.verified?6:0;
   fs.writeFileSync(outputDir+'/'+name+'-structure.json',JSON.stringify({...parsed,independentlyAuthenticated:false,eligibleForCalibration:false},null,2)+'\n');
  }
  fs.writeFileSync(outputDir+'/'+name+'.json',JSON.stringify(metadata,null,2)+'\n');
  results.push({date:String(selection.date),venue:String(selection.venue).padStart(2,'0'),race:Number(selection.race),
   status:metadata.status,integrity,parserStatus,matchedRows,eligibleForCalibration:false});
  console.log(JSON.stringify({event:'historical_result_capture_progress',completed:results.length,total:selections.length,...results[results.length-1]}));
 }
 const summary={status:'research_batch_diagnostic',requested:results.length,
  sourceCaptured:results.filter(r=>r.status==='official_result_source_captured').length,
  integrityValid:results.filter(r=>r.integrity==='evidence_pair_valid').length,
  structurallyParsed:results.filter(r=>r.matchedRows===6).length,
  independentlyVerifiedFinishes:0,eligibleForCalibration:0,results};
 fs.writeFileSync(outputDir+'/research-result-batch-summary.json',JSON.stringify(summary,null,2)+'\n');
 return summary;
}
if(process.argv[1]&&import.meta.url===new URL('file://'+process.argv[1]).href){
 const date=process.env.CAPTURE_DATE||'20261120';
 const venues=(process.env.CAPTURE_VENUES||process.env.CAPTURE_VENUE||'18').split(',').map(v=>v.trim().padStart(2,'0'));
 const races=(process.env.CAPTURE_RACES||'1,2,3,4,5,6,7,8,9,10,11,12').split(',').map(Number);
 if(races.some(r=>!Number.isInteger(r)||r<1||r>12)||venues.some(v=>!/^[0-9]{2}$/.test(v)||Number(v)<1||Number(v)>24))throw Error('invalid_venue_or_race_numbers');
 const selections=venues.flatMap(venue=>races.map(race=>({date,venue,race})));
 const summary=await captureResultBatch(selections);
 console.log(JSON.stringify(summary,null,2));
 if(summary.sourceCaptured===0)process.exitCode=2;
}
