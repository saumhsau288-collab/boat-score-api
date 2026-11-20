import assert from 'node:assert/strict';
import {compareResearchOfficialRaceSchedules as compare} from './compare-research-official-race-schedules.mjs';
const date='20261120',venue=2;
const times=['10:45','11:12','11:39','12:06','12:33','13:00','13:27','13:54','14:21','14:48','15:15','15:42'];
function page(race,{urlDate=date,linkDate=date,linkVenue='02',timesOverride=times}={}){
 const url='https://www.boatrace.jp/owpc/pc/race/racelist?hd='+urlDate+'&jcd=02&rno='+race;
 const headers=Array.from({length:12},(_,i)=>'<th><a href="/owpc/pc/race/racelist?rno='+(i+1)+'&amp;jcd='+linkVenue+'&amp;hd='+linkDate+'">'+(i+1)+'R</a></th>').join('');
 const html='<table><tr><th>レース</th>'+headers+'</tr><tr><td>締切予定時刻</td>'+timesOverride.map(t=>'<td>'+t+'</td>').join('')+'</tr></table>';
 return {race,requestedUrl:url,responseUrl:url,html};
}
assert.equal(compare([page(1),page(2)],{date,venue}).status,'cross_page_schedule_consistent_not_authenticated');
assert.equal(compare([page(1),page(2,{urlDate:'20261119'})],{date,venue}).status,'page_evidence_inconsistent');
assert.equal(compare([page(1),page(2,{linkDate:'20261119'})],{date,venue}).status,'page_evidence_inconsistent');
assert.equal(compare([page(1),page(2,{linkVenue:'03'})],{date,venue}).status,'page_evidence_inconsistent');
console.log('Cross-date and cross-venue schedule contamination tests passed');
