// Read-only audit: duplicate race keys in saved morning captures must not be
// silently treated as independent prediction trials.
export function auditDuplicateCaptureKeys(capture) {
  const records = Array.isArray(capture?.records) ? capture.records : [];
  const counts = new Map();
  let invalidRaceKeyRecords = 0;
  for (const record of records) {
    const date = record?.date, venue = record?.venue, race = record?.race;
    if (!/^\d{8}$/.test(String(date)) ||
        !Number.isInteger(Number(venue)) || Number(venue) < 1 || Number(venue) > 24 ||
        !Number.isInteger(Number(race)) || Number(race) < 1 || Number(race) > 12) {
      invalidRaceKeyRecords++;
      continue;
    }
    const key = [date, Number(venue), Number(race)].join(':');
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  const duplicates = [...counts].filter(([, count]) => count > 1)
    .map(([key, count]) => ({key, count}));
  return {
    totalRecords: records.length,
    uniqueValidRaceKeys: counts.size,
    invalidRaceKeyRecords,
    duplicateRaceKeys: duplicates.length,
    excessDuplicateRecords: duplicates.reduce((sum, row) => sum + row.count - 1, 0),
    duplicates,
    safeForIndependentRaceHitRate: records.length > 0 && duplicates.length === 0 && invalidRaceKeyRecords === 0
  };
}
