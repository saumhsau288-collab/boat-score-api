// Read-only structural inspection of archived official race-list HTML.
// Does not infer six racer identities, parse win rates, or authenticate pre-race data.
import fs from 'node:fs/promises';
import path from 'node:path';
const dir=process.argv[2]||'research-official-racelists';
const manifest=JSON.parse(await fs.readFile(path.join(dir,'manifest.json'),'utf8'));
const rows=[];
for(const item of manifest.rows){
 const result={date:item.date,venue:item.venue,race:item.race,httpStatus:item.httpStatus??null,archived:!!item.file,htmlDocument:false,boatraceBrandText:false,racerNameMarker:false,tableMarker:false,sourceSha256:item.sha256??null,verifiedSixRacerInputs:false,preRaceAuthenticated:false};
 if(item.file){
  const html=await fs.readFile(path.join(dir,item.file),'utf8');
  result.htmlDocument=/<html[\s>]/i.test(html);
  result.boatraceBrandText=/BOAT\s*RACE|ボートレース|boatrace/i.test(html);
  result.racerNameMarker=/選手名|選手|レーサー/i.test(html);
  result.tableMarker=/<table[\s>]/i.test(html);
 }
 rows.push(result);
}
const report={total:rows.length,archived:rows.filter(x=>x.archived).length,htmlDocuments:rows.filter(x=>x.htmlDocument).length,brandMarkers:rows.filter(x=>x.boatraceBrandText).length,racerMarkers:rows.filter(x=>x.racerNameMarker).length,tableMarkers:rows.filter(x=>x.tableMarker).length,verifiedSixRacerInputs:0,preRaceAuthenticated:0,rows,warning:'Markers only; page content and six racer inputs are not yet parsed or verified. These post-hoc pages cannot authenticate pre-race feature values.'};
await fs.writeFile(path.join(dir,'structure-report.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({total:report.total,htmlDocuments:report.htmlDocuments,brandMarkers:report.brandMarkers,racerMarkers:report.racerMarkers,tableMarkers:report.tableMarkers,verifiedSixRacerInputs:0},null,2));
