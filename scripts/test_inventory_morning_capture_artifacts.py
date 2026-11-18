import unittest
import urllib.request
from inventory_morning_capture_artifacts import summarize_capture, diagnose_capture, SafeArtifactRedirect


class InventoryTests(unittest.TestCase):
    def test_cross_host_redirect_strips_github_authentication(self):
        source = urllib.request.Request(
            'https://api.github.com/repos/owner/repo/actions/artifacts/1/zip',
            headers={'Authorization': 'Bearer secret',
                     'X-GitHub-Api-Version': '2022-11-28'})
        redirected = SafeArtifactRedirect().redirect_request(
            source, None, 302, 'Found', {},
            'https://signed-storage.example.net/archive.zip')
        self.assertNotIn('Authorization', redirected.headers)
        self.assertNotIn('X-github-api-version', redirected.headers)

    def test_same_host_redirect_keeps_authentication(self):
        source = urllib.request.Request(
            'https://api.github.com/a', headers={'Authorization': 'Bearer secret'})
        redirected = SafeArtifactRedirect().redirect_request(
            source, None, 302, 'Found', {}, 'https://api.github.com/b')
        self.assertIn('Authorization', redirected.headers)

    def test_diagnoses_http_and_readiness_states(self):
        rows = [
            {'venue': 1, 'race': 1, 'httpStatus': 200, 'response': {'ready': True}},
            {'venue': 1, 'race': 2, 'httpStatus': 200, 'response': {'ready': False}},
            {'venue': 2, 'race': 1, 'httpStatus': 404, 'response': {'error': 'missing'}},
            {'venue': 2, 'race': 2, 'error': 'timeout'},
            {'venue': 3, 'race': 1, 'httpStatus': 200, 'response': None}]
        result = diagnose_capture({'authenticatedBeforeRace': False, 'records': rows})
        self.assertEqual(result['states'], {'http200_non_json': 1, 'http_404': 1,
                                            'not_ready': 1, 'ready': 1, 'transport_error': 1})
        self.assertEqual(result['readyRaceIdentities'], [{'venue': 1, 'race': 1}])
        self.assertEqual(result['byVenue']['1'], {'ready': 1, 'not_ready': 1})

    def test_not_ready_fields_and_transport_causes_are_aggregated_without_values(self):
        rows = [
            {'venue': 1, 'race': 1, 'httpStatus': 200,
             'response': {'ready': False, 'reason': 'private detail'}},
            {'venue': 1, 'race': 2, 'httpStatus': 200,
             'response': {'ready': False, 'reason': 'different private detail'}},
            {'venue': 1, 'race': 3, 'error': 'The operation timed out'},
            {'venue': 1, 'race': 4, 'error': 'fetch failed'}]
        result = diagnose_capture({'authenticatedBeforeRace': False, 'records': rows})
        self.assertEqual(result['notReadyResponseFieldSets'], {'ready,reason': 2})
        self.assertEqual(result['transportErrorCategories'], {'network': 1, 'timeout': 1})
        self.assertNotIn('private detail', str(result))

    def test_missing_input_diagnostics_do_not_leak_values(self):
        rows = [
            {'venue': 1, 'race': 1, 'httpStatus': 200,
             'response': {'ready': False, 'missingInputs': {'motor': 'secret value'},
                          'officialVerified': False, 'statsVerified': True,
                          'officialStatsRetry': None}},
            {'venue': 1, 'race': 2, 'httpStatus': 200,
             'response': {'ready': False, 'missingInputs': ['private item'],
                          'officialVerified': False, 'statsVerified': False,
                          'officialStatsRetry': True}}]
        result = diagnose_capture({'authenticatedBeforeRace': False, 'records': rows})
        self.assertEqual(result['missingInputStructures'], {'list': 1, 'object:motor': 1})
        self.assertEqual(result['verificationFlagCounts']['officialVerified:false'], 2)
        self.assertEqual(result['verificationFlagCounts']['statsVerified:true'], 1)
        self.assertEqual(result['verificationFlagCounts']['officialStatsRetry:other'], 1)
        self.assertNotIn('secret value', str(result))
        self.assertNotIn('private item', str(result))

    def test_missing_input_counts_and_retry_types_are_private(self):
        rows = [
            {'venue': 1, 'race': 1, 'httpStatus': 200,
             'response': {'ready': False, 'missingInputs': ['secret A', 'secret B'],
                          'officialStatsRetry': {'secret': 'value'}}},
            {'venue': 1, 'race': 2, 'httpStatus': 200,
             'response': {'ready': False, 'missingInputs': [],
                          'officialStatsRetry': 'private detail'}}]
        result = diagnose_capture({'authenticatedBeforeRace': False, 'records': rows})
        self.assertEqual(result['missingInputListLengths'], {'0': 1, '2': 1})
        self.assertEqual(result['officialStatsRetryTypes'], {'object': 1, 'string': 1})
        self.assertNotIn('secret', str(result))
        self.assertNotIn('private', str(result))

    def test_rejects_invalid_captured_identity(self):
        with self.assertRaisesRegex(ValueError, 'Invalid captured venue/race'):
            diagnose_capture({'authenticatedBeforeRace': False, 'records': [
                {'venue': True, 'race': 1, 'httpStatus': 200, 'response': {'ready': True}}]})

    def test_counts_only_raw_usable_responses(self):
        six = [[1,2,3], [1,3,2], [2,1,3], [2,3,1], [3,1,2], [3,2,1]]
        rows = [{'httpStatus': 200, 'response': {'ready': True, 'main': six, 'upset': six}},
                {'httpStatus': 200, 'response': {'ready': False}},
                {'httpStatus': 503, 'response': None}]
        result = summarize_capture({'authenticatedBeforeRace': False, 'records': rows})
        self.assertEqual(result, {'captured': 3, 'http200': 2, 'ready': 1, 'usableSixPlusSix': 1})

    def test_rejects_claimed_authenticated_capture(self):
        with self.assertRaises(ValueError):
            summarize_capture({'authenticatedBeforeRace': True, 'records': []})

    def test_rejects_duplicate_tickets(self):
        six = [[1,2,3]] * 6
        result = summarize_capture({'authenticatedBeforeRace': False, 'records': [
            {'httpStatus': 200, 'response': {'ready': True, 'main': six, 'upset': six}}]})
        self.assertEqual(result['ready'], 1)
        self.assertEqual(result['usableSixPlusSix'], 0)


if __name__ == '__main__':
    unittest.main()
