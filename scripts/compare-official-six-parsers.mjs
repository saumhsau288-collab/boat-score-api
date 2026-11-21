// Research-only diagnostics. Never promote parser candidates to live verified predictions.
import {parseOfficialBoatRows} from '../boat-score-2-boat-mapping.js';
import {extractGroupedOfficialSix} from './extract-grouped-official-six.mjs';
export function compareOfficialSixParsers(html){
 const strict=parseOfficialBoatRows(html);
 const grouped=extractGroupedOfficialSix(html);
 const identity=x=>x.racers.map(r=>String(r.boat)+':'+String(r.racerId)).sort();
 const sameSix=strict.verified&&grouped.verified&&JSON.stringify(identity(strict))===JSON.stringify(identity(grouped));
 return {strict:{verified:strict.verified,reason:strict.reason??null,candidateRows:strict.candidateRows??null},
 grouped:{verified:grouped.verified,reason:grouped.reason??null,candidateRows:grouped.candidateRows??null,
 rowDiagnostics:grouped.rowDiagnostics??null},
 identityAgreement:sameSix,needsManualReview:!sameSix,
 nextAction:strict.verified&&!grouped.verified?'inspect_grouped_metric_columns':!strict.verified&&grouped.verified?'inspect_strict_boat_cell_layout':!sameSix?'inspect_official_html':'both_parsers_agree',
 eligibleForCalibration:false};
}
