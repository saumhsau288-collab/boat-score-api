// Research-only extraction from archived official racelist HTML. Never certifies pre-cutoff provenance.
import fs from 'node:fs';
const clean=s=>s.replace(/<[^>]+>/g,' ').replace(/&nbsp;|&#160;/gi,' ').replace(/\s+/g,' ').trim();
export function extractArchivedRacerFeatures(entry){
 const base={date:entry?.date,venue:entry?.venue,race:entry?.race,status:'not_parsed',preCutoffSnapshotAuthenticated:false,eligibleForWeightTuning:false,racers:[]};
 if(entry?.status!=='raw_html_saved'||typeof entry.html!=='string')return base;
 const racers=[];
 // Each racer starts a four-row block: boat, photo, racer identity, ST, national, local.
 for(const tr of entry.html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)){
  const cells=[...tr[1].matchAll(/<td\b[^>]*rowspan=["']4["'][^>]*>([\s\S]*?)<\/td>/gi)].map(x=>x[1]);
  if(cells.length<6)continue;
  const racerId=clean(cells[2]).match(/^(\d{4,6})\b/)?.[1];
  const st=clean(cells[3]).match(/(?:^|\s)(0\.\d{2})(?:\s|$)/);
  const national=clean(cells[4]).match(/^(\d{1,2}\.\d{2})(?:\s|$)/);
  const local=clean(cells[5]).match(/^(\d{1,2}\.\d{2})(?:\s|$)/);
  if(!racerId||!st||!national||!local)continue;
  racers.push({racerId,nationalWinRate:Number(national[1]),localWinRate:Number(local[1]),averageStartTiming:Number(st[1])});
 }
 if(racers.length!==6||new Set(racers.map(x=>x.racerId)).size!==6)return {...base,status:'incomplete_six_racer_features',found:racers.length};
 return {...base,status:'parsed_archival_features_unverified',racers};
}
export function joinArchivedRace(entry,result){
 const e=extractArchivedRacerFeatures(entry);
 const base={date:entry?.date,venue:entry?.venue,race:entry?.race,status:'incomplete',eligibleForWeightTuning:false,preCutoffSnapshotAuthenticated:false,racers:[]};
 if(e.status!=='parsed_archival_features_unverified'||result?.status!=='parsed_needs_independent_review'||!result.entryCoursesExtracted)return base;
 const byId=new Map(e.racers.map(x=>[x.racerId,x]));
 const racers=result.racers.map(r=>({...byId.get(String(r.racerId)),boat:r.boat,racerId:r.racerId,entryCourse:r.actualEntryCourse,finish:r.finish}));
 if(racers.length!==6||racers.some(r=>!Number.isFinite(r.nationalWinRate)||!Number.isFinite(r.localWinRate)||!Number.isFinite(r.averageStartTiming)||!Number.isInteger(r.entryCourse)))return base;
 return {...base,status:'research_only_joined_postrace_archive',racers};
}
if(process.argv[1]&&new URL(import.meta.url).pathname===process.argv[1]){
 const [directory,output]=process.argv.slice(2);if(!directory||!output)throw Error('Usage: directory output');
 const results=JSON.parse(fs.readFileSync(directory+'/20261118-tokuyama-results-parsed.json','utf8'));
 const rows=results.rows.map(r=>{const p=directory+'/20261118-tokuyama-'+r.race+'r-racelist.json';return joinArchivedRace(JSON.parse(fs.readFileSync(p,'utf8')),r)});
 const report={method:'postrace_archive_research_only',targets:rows.length,joined:rows.filter(r=>r.status==='research_only_joined_postrace_archive').length,eligibleForWeightTuning:0,rows};
 fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({targets:report.targets,joined:report.joined,eligibleForWeightTuning:0}));
}
