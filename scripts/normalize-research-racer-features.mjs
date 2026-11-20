// Research-only feature normalization. Preserve raw values and provenance.
// A zero local win rate is a defined fallback, not an observed local performance.
export function normalizeResearchRacer(racer){
 if(!racer||!Number.isFinite(racer.nationalWinRate)||!Number.isFinite(racer.localWinRate))throw Error('win_rates_required');
 const fallback=racer.localWinRate===0;
 return {...racer,rawLocalWinRate:racer.localWinRate,effectiveLocalWinRate:fallback?racer.nationalWinRate:racer.localWinRate,localWinRateFallbackApplied:fallback,winRateAverage:(racer.nationalWinRate+(fallback?racer.nationalWinRate:racer.localWinRate))/2,averageSTMissing:racer.averageST===null};
}
