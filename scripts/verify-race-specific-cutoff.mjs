// Research-only official cutoff gate. Never scrape arbitrary HH:MM from page text.
export function verifyRaceSpecificCutoff({expected,source}={}){
 const failures=[];
 const validDate=s=>typeof s==='string'&&/^\d{8}$/.test(s);
 const validVenue=s=>typeof s==='string'&&/^(0[1-9]|1[0-9]|2[0-4])$/.test(s);
 const validRace=n=>Number.isInteger(n)&&n>=1&&n<=12;
 if(!validDate(expected?.date)||!validVenue(expected?.venue)||!validRace(expected?.race))failures.push('invalid_expected_race');
 if(source?.officialDomainVerified!==true)failures.push('official_domain_unverified');
 if(source?.sourceDocumentVerified!==true)failures.push('source_document_unverified');
 if(source?.raceIdentityVerified!==true||source?.date!==expected?.date||source?.venue!==expected?.venue||source?.race!==expected?.race)failures.push('race_identity_mismatch');
 if(source?.cutoffLabelVerified!==true||!/^([01]\d|2[0-3]):[0-5]\d$/.test(source?.cutoffJst??''))failures.push('cutoff_label_unverified');
 if(source?.sourceCaptureVerified!==true||!Number.isSafeInteger(source?.sourceCapturedAtEpochMs))failures.push('source_capture_unverified');
 const cutoff=failures.length?null:Date.parse(expected.date.slice(0,4)+'-'+expected.date.slice(4,6)+'-'+expected.date.slice(6,8)+'T'+source.cutoffJst+':00+09:00');
 if(cutoff!==null&&!Number.isFinite(cutoff))failures.push('invalid_calendar_date');
 return {verified:failures.length===0,cutoffEpochMs:failures.length===0?cutoff:null,reasons:failures};
}
