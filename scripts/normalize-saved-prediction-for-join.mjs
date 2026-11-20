// Research-only input normalizer for saved deployed-predictor responses.
// Never reconstruct missing six-racer inputs or source verification from rankings.
export function normalizeSavedPredictionForJoin(record={}) {
 const source=record?.source??{};
 const original=record?.response??record?.prediction??record;
 const six=Array.isArray(original?.scoreInputsByBoat)&&original.scoreInputsByBoat.length===6
  ?original.scoreInputsByBoat:null;
 const result=Array.isArray(record?.finishByBoat)&&record.finishByBoat.length===6
  ?record.finishByBoat:null;
 return {
  expected:record?.expected,
  source,
  schedule:record?.schedule,
  scoreInputsByBoat:six,
  finishByBoat:result,
  predictorMethod:typeof original?.method==='string'?original.method:null,
  missing:[
   ...(!six?['original_six_boat_score_inputs']:[]),
   ...(!result?['verified_six_boat_finish']:[]),
   ...(!record?.schedule?['verified_schedule']:[]),
   ...(!source?.raceIdentityVerified?['official_race_identity']:[]),
   ...(!source?.cutoffLabelVerified?['official_cutoff']:[])
  ],
  reconstructed:false
 };
}
