// Research-only: summarize deadline labels and nearby clock values without asserting race mapping.
export function inspectResearchDeadlineTimeSequence(html){
 if(typeof html!=='string')return {status:'invalid_html',verified:false};
 const label='締切予定時刻',at=html.indexOf(label);
 if(at<0)return {status:'deadline_label_missing',verified:false};
 const tail=html.slice(at+label.length,at+label.length+2800);
 const plain=tail.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'').replace(/<[^>]*>/g,' ').replace(/&nbsp;|&#160;/g,' ').replace(/\s+/g,' ').trim();
 const times=[...plain.matchAll(/(?:^|\s)([01]?\d|2[0-3]):([0-5]\d)(?=\s|$)/g)].map(x=>x[1].padStart(2,'0')+':'+x[2]).slice(0,12);
 return {status:times.length===12?'twelve_times_found_unmapped':'incomplete_time_sequence',timeCount:times.length,times,verified:false};
}
