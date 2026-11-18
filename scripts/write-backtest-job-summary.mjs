import fs from 'node:fs';
const date=process.env.BACKTEST_DATE||'';
const summaryPath=process.env.GITHUB_STEP_SUMMARY;
if(!summaryPath)throw Error('GITHUB_STEP_SUMMARY not set');
const file='backtest-results/'+date+'.json';
const lines=['## Boat Score 2 historical comparison',''];
if(!/^20\d{6}$/.test(date)||!fs.existsSync(file)){
 lines.push('No backtest result JSON available. Check the compare step logs.');
}else{
 const data=JSON.parse(fs.readFileSync(file,'utf8'));
 lines.push('Date: '+date,'','| Metric | Count |','| --- | ---: |',
 '| Verified venue candidates | '+(data.verifiedVenueCandidates?.join(', ')||'none')+' |',
 '| Checked races | '+(data.checkedRaces??0)+' |',
 '| Compared races | '+(data.comparedRaces??0)+' |',
 '| Held races | '+(data.heldRaces??0)+' |','',
 '### Hold reasons','','| Reason | Count |','| --- | ---: |');
 for(const [reason,count] of Object.entries(data.holdReasonCounts||{}))lines.push('| '+reason+' | '+count+' |');
 if(!Object.keys(data.holdReasonCounts||{}).length)lines.push('| none reported | 0 |');
 lines.push('','### Race details','','| Venue | Race | Status | Hold reasons |','| ---: | ---: | --- | --- |');
 for(const r of data.records||[])lines.push('| '+r.venue+' | '+r.race+' | '+r.status+' | '+(r.holdReasons?.join(', ')||'-')+' |');
 lines.push('','**Caution:** Retrospective API predictions are not saved pre-race predictions. Held races are not counted as misses.');
}
fs.appendFileSync(summaryPath,lines.join('\n')+'\n');
