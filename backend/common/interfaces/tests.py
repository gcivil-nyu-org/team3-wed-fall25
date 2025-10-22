# Create your tests here.
from unittest import TestCase

from common.interfaces.data_crawler import DataCrawler


class DataCrawlerTests(TestCase):
    def test_data_crawler_headers(self):
        """Test that DataCrawler has proper headers"""
        headers = DataCrawler.headers
        self.assertIn("User-Agent", headers)
        self.assertIn("Accept", headers)
        self.assertIn("Accept-Encoding", headers)
        self.assertIn("Connection", headers)
        self.assertIn("Mozilla", headers["User-Agent"])

    def test_data_crawler_abstract_methods(self):
        """Test that DataCrawler is abstract and has required methods"""
        # DataCrawler should be abstract
        with self.assertRaises(TypeError):
            DataCrawler()

        # Check that abstract methods exist
        self.assertTrue(hasattr(DataCrawler, "fetch"))
        self.assertTrue(hasattr(DataCrawler, "load"))

    def test_data_crawler_subclass_implementation(self):
        """Test that a concrete subclass can be created"""

        class ConcreteCrawler(DataCrawler):
            def fetch(self):
                return [{"test": "data"}]

            def load(self, rows):
                pass

        crawler = ConcreteCrawler()
        self.assertIsInstance(crawler, DataCrawler)
        self.assertEqual(crawler.fetch(), [{"test": "data"}])

    def test_data_crawler_subclass_without_implementation(self):
        """Test that subclass without implementation raises TypeError"""

        class IncompleteCrawler(DataCrawler):
            pass

        with self.assertRaises(TypeError):
            IncompleteCrawler()

    def test_data_crawler_headers_are_readonly(self):
        """Test that headers are class-level and consistent"""
        headers1 = DataCrawler.headers
        headers2 = DataCrawler.headers
        self.assertEqual(headers1, headers2)
        self.assertIs(headers1, headers2)
