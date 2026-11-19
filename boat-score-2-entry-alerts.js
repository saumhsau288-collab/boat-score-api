// Research-only entry prediction alerts. Boat number is NOT entry course.
export function analyzeEntryChanges(racers,{source='prediction'}={}){
 if(!['prediction','exhibition'].includes(source))return {status:'invalid_source',alerts:[]};
 if(!Array.isArray(racers)||racers.length!==6||
  racers.some(r=>!Number.isInteger(r.boat)||r.boat<1||r.boat>6||
   !Number.isInteger(r.entryCourse)||r.entryCourse<1||r.entryCourse>6)||
  new Set(racers.map(r=>r.boat)).size!==6||
  new Set(racers.map(r=>r.entryCourse)).size!==6)
  return {status:'invalid_entry_courses',alerts:[]};
 const alerts=racers.filter(r=>r.entryCourse<r.boat)
  .sort((a,b)=>(b.boat-b.entryCourse)-(a.boat-a.entryCourse)||a.boat-b.boat)
  .map(r=>({
   boat:r.boat,entryCourse:r.entryCourse,shift:r.boat-r.entryCourse,
   type:'outside_boat_moved_inside',severity:r.boat-r.entryCourse>=2?'high':'notice',
   confirmed:source==='exhibition',
   message:source==='exhibition'
    ?`展示進入変動：${r.boat}号艇が${r.entryCourse}コースに進入。進入位置とスタート展開に注意。`
    :`進入変動予想：${r.boat}号艇が${r.entryCourse}コースへ入る可能性。展示での確認が必要。`
  }));
 return {status:'evaluated',source,hasChanges:alerts.length>0,alerts,
  note:source==='prediction'?'進入予想であり、実際の進入を保証しません。':'スタート展示の進入であり、本番の進入を保証しません。'};
}
