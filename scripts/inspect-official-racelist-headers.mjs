// Research-only: identify split national/local headers in archived official pages.
// No numeric values or racer associations are inferred.
export function inspectOfficialRaceListHeaders(html){
 if(typeof html!=='string')throw Error('html_required');
 const withoutScripts=html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,' ');
 const visible=withoutScripts.replace(/<[^>]*>/g,' ').replace(/&nbsp;|&#160;/gi,' ').replace(/\s+/g,' ');
 const national=visible.indexOf('全国'),local=visible.indexOf('当地');
 const winRate=visible.indexOf('勝率'),avgST=visible.indexOf('平均ST');
 const headerEvidence=national>=0&&local>national&&winRate>local&&avgST>=0;
 return {hasNationalHeader:national>=0,hasLocalHeader:local>=0,hasWinRateHeader:winRate>=0,hasAverageStartTimingHeader:avgST>=0,splitHeaderCandidate:headerEvidence,verifiedSixRacerRows:false,verifiedWinRateValues:false,authenticatedBeforeRace:false};
}
