// Only venues explicitly verified by the existing official-data endpoint are eligible.
export function verifiedVenueCandidates(checks) {
  return checks.filter(item => item.verified === true).map(item => item.venue);
}
