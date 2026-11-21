// Research-only: parse a *bounded* race schedule text block, not the full HTML.
// The caller must isolate the official schedule table and authenticate its source.
// This function never independently verifies a deadline.
import {selectCutoffFromRaceSchedule} from './select-cutoff-from-race-schedule.mjs';
export function parseBoundedRaceScheduleText({scheduleText,expectedRace,sourceVerified=false}={}){
 const fail=reason=>({verified:false,cutoffJst:null,reason});
 if(typeof scheduleText!=='string'||scheduleText.length>5000)return fail('invalid_schedule_text');
 const lines=scheduleText.split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
 const raceLine=lines.filter(s=>/^レース(?:\s|　|:|：)/.test(s));
 const cutoffLine=lines.filter(s=>/^締切予定時刻(?:\s|　|:|：)/.test(s));
 if(raceLine.length!==1||cutoffLine.length!==1)return fail('schedule_rows_missing_or_ambiguous');
 const numbers=raceLine[0].replace(/^レース[\s　:：]*/,'').match(/\d{1,2}/g)?.map(Number)??[];
 const times=cutoffLine[0].replace(/^締切予定時刻[\s　:：]*/,'').match(/\b(?:[01]?\d|2[0-3]):[0-5]\d\b/g)??[];
 // Reject any non-time tokens in the time row, including placeholders.
 const remainder=cutoffLine[0].replace(/^締切予定時刻[\s　:：]*/,'').replace(/\b(?:[01]?\d|2[0-3]):[0-5]\d\b/g,'').trim();
 if(remainder)return fail('unparsed_cutoff_cells');
 return selectCutoffFromRaceSchedule({expectedRace,raceNumbers:numbers,cutoffTimes:times.map(t=>t.padStart(5,'0')),sourceVerified});
}
