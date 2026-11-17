// Boat Score 2 only: conservative identity matching for Makulabo recent-50 data.
// Never infer a boat from row order. Prefer an exact 4-digit registration ID.
export function normalizeRacerName(value) {
  return String(value ?? '').normalize('NFKC').replace(/[\s\u3000・･]/g, '');
}
export function matchRecent50Racers(official, recent) {
  if (!Array.isArray(official) || official.length !== 6 ||
      new Set(official.map(r => r.boat)).size !== 6 ||
      official.some(r => !Number.isInteger(r.boat) || r.boat < 1 || r.boat > 6) ||
      !Array.isArray(recent)) return {verified:false,reason:'invalid_input',matches:[]};
  const used = new Set();
  const matches = official.map(o => {
    const name = normalizeRacerName(o.name);
    const id = String(o.racerId ?? '');
    let candidates = [];
    let method = null;
    if (/^\d{4}$/.test(id)) {
      candidates = recent.map((r,i)=>({r,i})).filter(({r}) => String(r.racerId ?? '') === id);
      if (candidates.length) method = 'registration_id';
    }
    if (!candidates.length && name) {
      candidates = recent.map((r,i)=>({r,i})).filter(({r}) => normalizeRacerName(r.name) === name);
      if (candidates.length) method = 'exact_name';
    }
    // Only one-character suffix omission is accepted, and only if unique.
    if (!candidates.length && name.length >= 4) {
      candidates = recent.map((r,i)=>({r,i})).filter(({r}) => {
        const n = normalizeRacerName(r.name);
        return n.length === name.length - 1 && name.startsWith(n);
      });
      if (candidates.length) method = 'unique_suffix_omission';
    }
    if (candidates.length !== 1 || used.has(candidates[0].i))
      return {boat:o.boat,status:'unverified',reason:candidates.length>1?'ambiguous_identity':'identity_not_verified'};
    const {r,i} = candidates[0];
    // Explicitly conflicting IDs must never be accepted via names.
    if (/^\d{4}$/.test(id) && /^\d{4}$/.test(String(r.racerId ?? '')) && id !== String(r.racerId))
      return {boat:o.boat,status:'unverified',reason:'registration_id_conflict'};
    used.add(i);
    return {boat:o.boat,status:'verified',method,recentIndex:i};
  });
  return {verified:matches.every(m=>m.status==='verified'),matches,
    reason:matches.every(m=>m.status==='verified')?null:'identity_not_verified'};
}
