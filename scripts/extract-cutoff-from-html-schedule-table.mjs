// Research-only conservative extraction from a single HTML <table>.
// No full-page deadline search, no implicit source authentication.
import {parseBoundedRaceScheduleText} from './parse-bounded-race-schedule-text.mjs';
const clean=s=>s.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ').replace(/<[^>]*>/g,' ').replace(/&nbsp;|&#160;/gi,' ').replace(/\s+/g,' ').trim();
export function extractCutoffFromHtmlScheduleTable({html,expectedRace,sourceVerified=false}={}){
 const fail=reason=>({verified:false,cutoffJst:null,reason});
 if(typeof html!=='string'||html.length>2_000_000)return fail('invalid_html');
 const tables=[...html.matchAll(/<table\b[^>]*>[\s\S]*?<\/table>/gi)];
 const matches=[];
 for(const table of tables){
  const rows=[...table[0].matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)].map(m=>
   [...m[1].matchAll(/<(?:th|td)\b[^>]*>([\s\S]*?)<\/(?:th|td)>/gi)].map(x=>clean(x[1])));
  const raceRows=rows.filter(c=>c[0]==='レース');
  const cutoffRows=rows.filter(c=>c[0]==='締切予定時刻');
  if(raceRows.length!==1||cutoffRows.length!==1)continue;
  const raceCells=raceRows[0],cutoffCells=cutoffRows[0];
  if(raceCells.length!==13||cutoffCells.length!==13)continue;
  const text='レース '+raceCells.slice(1).join(' ')+'\n締切予定時刻 '+cutoffCells.slice(1).join(' ');
  matches.push(text);
 }
 if(matches.length!==1)return fail(matches.length?'ambiguous_schedule_tables':'schedule_table_not_found');
 return parseBoundedRaceScheduleText({scheduleText:matches[0],expectedRace,sourceVerified});
}
