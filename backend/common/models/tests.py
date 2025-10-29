# Create your tests here.
from datetime import datetime
from unittest import TestCase

from common.models.neighborhood import (
    HeatmapPoint,
    NeighborhoodStats,
    NeighborhoodSummary,
    as_heatmap_point,
    as_neighborhood_summary,
    calculate_risk_score,
)


class NeighborhoodModelsTests(TestCase):
    def test_neighborhood_stats_initialization(self):
        """Test NeighborhoodStats initialization with all fields"""
        stats = NeighborhoodStats(
            bbl="1013510030",
            address="123 Main St",
            borough="Manhattan",
            zip_code="10001",
            latitude=40.7589,
            longitude=-73.9851,
            total_violations=10,
            open_violations=5,
            class_a_violations=2,
            class_b_violations=3,
            class_c_violations=5,
            rent_impairing_violations=1,
            total_evictions=3,
            evictions_3yr=2,
            evictions_1yr=1,
            total_complaints=8,
            open_complaints=4,
            emergency_complaints=2,
            is_rent_stabilized=True,
            risk_score=75.5,
            risk_level="High Risk",
            last_updated=datetime.now(),
        )

        self.assertEqual(stats.bbl, "1013510030")
        self.assertEqual(stats.address, "123 Main St")
        self.assertEqual(stats.borough, "Manhattan")
        self.assertEqual(stats.zip_code, "10001")
        self.assertEqual(stats.latitude, 40.7589)
        self.assertEqual(stats.longitude, -73.9851)
        self.assertEqual(stats.total_violations, 10)
        self.assertEqual(stats.open_violations, 5)
        self.assertEqual(stats.class_a_violations, 2)
        self.assertEqual(stats.class_b_violations, 3)
        self.assertEqual(stats.class_c_violations, 5)
        self.assertEqual(stats.rent_impairing_violations, 1)
        self.assertEqual(stats.total_evictions, 3)
        self.assertEqual(stats.evictions_3yr, 2)
        self.assertEqual(stats.evictions_1yr, 1)
        self.assertEqual(stats.total_complaints, 8)
        self.assertEqual(stats.open_complaints, 4)
        self.assertEqual(stats.emergency_complaints, 2)
        self.assertTrue(stats.is_rent_stabilized)
        self.assertEqual(stats.risk_score, 75.5)
        self.assertEqual(stats.risk_level, "High Risk")
        self.assertIsInstance(stats.last_updated, datetime)

    def test_neighborhood_stats_default_values(self):
        """Test NeighborhoodStats with default values"""
        stats = NeighborhoodStats(
            bbl="1013510030",
            address="123 Main St",
            borough="Manhattan",
            zip_code="10001",
        )

        self.assertEqual(stats.bbl, "1013510030")
        self.assertEqual(stats.address, "123 Main St")
        self.assertEqual(stats.borough, "Manhattan")
        self.assertEqual(stats.zip_code, "10001")
        self.assertIsNone(stats.latitude)
        self.assertIsNone(stats.longitude)
        self.assertEqual(stats.total_violations, 0)
        self.assertEqual(stats.open_violations, 0)
        self.assertEqual(stats.class_a_violations, 0)
        self.assertEqual(stats.class_b_violations, 0)
        self.assertEqual(stats.class_c_violations, 0)
        self.assertEqual(stats.rent_impairing_violations, 0)
        self.assertEqual(stats.total_evictions, 0)
        self.assertEqual(stats.evictions_3yr, 0)
        self.assertEqual(stats.evictions_1yr, 0)
        self.assertEqual(stats.total_complaints, 0)
        self.assertEqual(stats.open_complaints, 0)
        self.assertEqual(stats.emergency_complaints, 0)
        self.assertFalse(stats.is_rent_stabilized)
        self.assertEqual(stats.risk_score, 0.0)
        self.assertEqual(stats.risk_level, "Low Risk")
        self.assertIsNone(stats.last_updated)

    def test_heatmap_point_initialization(self):
        """Test HeatmapPoint initialization"""
        point = HeatmapPoint(
            bbl="1013510030",
            latitude=40.7589,
            longitude=-73.9851,
            intensity=0.75,
            data_type="violations",
            count=15,
            address="123 Main St",
            borough="Manhattan",
        )

        self.assertEqual(point.bbl, "1013510030")
        self.assertEqual(point.latitude, 40.7589)
        self.assertEqual(point.longitude, -73.9851)
        self.assertEqual(point.intensity, 0.75)
        self.assertEqual(point.data_type, "violations")
        self.assertEqual(point.count, 15)
        self.assertEqual(point.address, "123 Main St")
        self.assertEqual(point.borough, "Manhattan")

    def test_neighborhood_summary_initialization(self):
        """Test NeighborhoodSummary initialization"""
        summary = NeighborhoodSummary(
            borough="Manhattan",
            total_buildings=100,
            avg_violations_per_building=0.5,
            avg_evictions_per_building=0.1,
            total_rent_stabilized=60,
            high_risk_buildings=20,
            medium_risk_buildings=30,
            low_risk_buildings=50,
        )

        self.assertEqual(summary.borough, "Manhattan")
        self.assertEqual(summary.total_buildings, 100)
        self.assertEqual(summary.avg_violations_per_building, 0.5)
        self.assertEqual(summary.avg_evictions_per_building, 0.1)
        self.assertEqual(summary.total_rent_stabilized, 60)
        self.assertEqual(summary.high_risk_buildings, 20)
        self.assertEqual(summary.medium_risk_buildings, 30)
        self.assertEqual(summary.low_risk_buildings, 50)

    def test_calculate_risk_score_low_risk(self):
        """Test calculate_risk_score for low risk scenarios"""
        # Low violations, no evictions, few complaints
        score, level = calculate_risk_score(
            violations=2,
            evictions=0,
            complaints=1,
            rent_stabilized=False,
        )
        self.assertLess(score, 30)
        self.assertIn(level, ["Low Risk", "Moderate Risk", "High Risk"])

    def test_calculate_risk_score_medium_risk(self):
        """Test calculate_risk_score for medium risk scenarios"""
        # Moderate violations, some evictions, moderate complaints
        score, level = calculate_risk_score(
            violations=5,
            evictions=2,
            complaints=8,
            rent_stabilized=False,
        )
        self.assertGreaterEqual(score, 0)
        self.assertLessEqual(score, 100)
        self.assertIn(level, ["Low Risk", "Moderate Risk", "High Risk"])

    def test_calculate_risk_score_high_risk(self):
        """Test calculate_risk_score for high risk scenarios"""
        # High violations, many evictions, many complaints
        score, level = calculate_risk_score(
            violations=25,
            evictions=10,
            complaints=30,
            rent_stabilized=False,
        )
        self.assertGreaterEqual(score, 0)
        self.assertLessEqual(score, 100)
        self.assertIn(level, ["Low Risk", "Moderate Risk", "High Risk"])

    def test_calculate_risk_score_edge_cases(self):
        """Test calculate_risk_score with edge cases"""
        # All zeros
        score, level = calculate_risk_score(
            violations=0,
            evictions=0,
            complaints=0,
            rent_stabilized=False,
        )
        self.assertEqual(score, 0.0)
        self.assertEqual(level, "Low Risk")

        # Very high values
        score, level = calculate_risk_score(
            violations=100,
            evictions=50,
            complaints=100,
            rent_stabilized=False,
        )
        self.assertGreater(score, 0)
        self.assertIn(level, ["Low Risk", "Moderate Risk", "High Risk"])

    def test_calculate_risk_score_rent_stabilized(self):
        """Test calculate_risk_score with rent stabilized building"""
        score, level = calculate_risk_score(
            violations=5,
            evictions=2,
            complaints=8,
            rent_stabilized=True,
        )
        self.assertGreaterEqual(score, 0)
        self.assertLessEqual(score, 100)
        self.assertIn(level, ["Low Risk", "Moderate Risk", "High Risk"])

    def test_as_heatmap_point(self):
        """Test as_heatmap_point factory function"""
        row = {
            "bbl": "1013510030",
            "latitude": 40.7589,
            "longitude": -73.9851,
            "intensity": 0.75,
            "data_type": "violations",
            "count": 15,
            "address": "123 Main St",
            "borough": "Manhattan",
        }

        point = as_heatmap_point(row)

        self.assertIsInstance(point, HeatmapPoint)
        self.assertEqual(point.bbl, "1013510030")
        self.assertEqual(point.latitude, 40.7589)
        self.assertEqual(point.longitude, -73.9851)
        self.assertEqual(point.intensity, 0.75)
        self.assertEqual(point.data_type, "violations")
        self.assertEqual(point.count, 15)
        self.assertEqual(point.address, "123 Main St")
        self.assertEqual(point.borough, "Manhattan")

    def test_as_neighborhood_summary(self):
        """Test as_neighborhood_summary factory function"""
        row = {
            "borough": "Manhattan",
            "total_buildings": 100,
            "avg_violations_per_building": 0.5,
            "avg_evictions_per_building": 0.1,
            "total_rent_stabilized": 60,
            "high_risk_buildings": 20,
            "medium_risk_buildings": 30,
            "low_risk_buildings": 50,
        }

        summary = as_neighborhood_summary(row)

        self.assertIsInstance(summary, NeighborhoodSummary)
        self.assertEqual(summary.borough, "Manhattan")
        self.assertEqual(summary.total_buildings, 100)
        self.assertEqual(summary.avg_violations_per_building, 0.5)
        self.assertEqual(summary.avg_evictions_per_building, 0.1)
        self.assertEqual(summary.total_rent_stabilized, 60)
        self.assertEqual(summary.high_risk_buildings, 20)
        self.assertEqual(summary.medium_risk_buildings, 30)
        self.assertEqual(summary.low_risk_buildings, 50)
