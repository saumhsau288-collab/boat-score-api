import unittest
from inventory_morning_capture_artifacts import summarize_capture


class InventoryTests(unittest.TestCase):
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
