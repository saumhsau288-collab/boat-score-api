// Determine metric columns only when grouped header ancestry is unambiguous.
import {buildOfficialTableGrid} from './build-official-table-grid.mjs';
const clean=s=>String(s).replace(/<[^>]*>/g,' ').replace(/&nbsp;|&#160;/gi,' ').replace(/\s+/g,' ').trim();
export function identifyOfficialGroupedMetricColumns(html){
 const grid=buildOfficialTableGrid(html);
 if(!grid.valid)return {verified:false,reason:grid.reason};
 const headers=grid.rows.filter(r=>r.every(c=>c.tag==='th'));
 if(headers.length<2)return {verified:false,reason:'two_header_rows_required'};
 const find=(group,metric)=>{
  const hits=[];
  for(let x=0;x<grid.columns;x++){
   const labels=headers.map(r=>clean(r[x]?.html)).filter(Boolean);
   if(labels.some(v=>v===group)&&labels.some(v=>metric.test(v)))hits.push(x);
  }
  return hits;
 };
 const national=find('全国',/^勝率$/),local=find('当地',/^勝率$/);
 const motor=find('モーター',/^(?:2連対率|2連率)$/);
 if(national.length!==1||local.length!==1||motor.length!==1||
  new Set([national[0],local[0],motor[0]]).size!==3)
  return {verified:false,reason:'ambiguous_grouped_metric_columns',candidates:{national,local,motor},
   headerRowCount:headers.length,
   headerGridLabels:headers.slice(0,4).map(row=>row.map(cell=>{
    const label=clean(cell?.html);
    return ['枠','選手','全国','当地','モーター','勝率','2連率','2連対率','番号'].includes(label)?label:null;
   }))};
 return {verified:true,columns:{nationalWinRate:national[0],localWinRate:local[0],motorTwoWinRate:motor[0]},
  grid};
}
