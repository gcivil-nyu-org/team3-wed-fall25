from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Optional


@dataclass
class NeighborhoodStats:
    """Aggregated statistics for a neighborhood/area"""

    bbl: str
    address: str
    borough: str
    zip_code: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None

    # Violation statistics
    total_violations: int = 0
    open_violations: int = 0
    class_a_violations: int = 0
    class_b_violations: int = 0
    class_c_violations: int = 0
    rent_impairing_violations: int = 0

    # Eviction statistics
    total_evictions: int = 0
    evictions_3yr: int = 0
    evictions_1yr: int = 0

    # Complaint statistics
    total_complaints: int = 0
    open_complaints: int = 0
    emergency_complaints: int = 0

    # Affordability
    is_rent_stabilized: bool = False

    # Risk scoring
    risk_score: float = 0.0
    risk_level: str = "Low Risk"

    # Additional metadata
    last_updated: Optional[datetime] = None


@dataclass
class HeatmapPoint:
    """Point data for heatmap visualization"""

    bbl: str
    latitude: float
    longitude: float
    intensity: float  # 0.0 to 1.0
    data_type: str  # 'violations', 'evictions', 'complaints'
    count: int
    address: str
    borough: str


@dataclass
class NeighborhoodSummary:
    """Summary data for neighborhood comparison"""

    borough: str
    total_buildings: int
    avg_violations_per_building: float
    avg_evictions_per_building: float
    total_rent_stabilized: int
    high_risk_buildings: int
    medium_risk_buildings: int
    low_risk_buildings: int


def calculate_risk_score(
    violations: int, evictions: int, complaints: int, rent_stabilized: bool = False
) -> tuple[float, str]:
    """
    Calculate risk score and level based on building data.

    Args:
        violations: Number of open violations
        evictions: Number of evictions in last 3 years
        complaints: Number of open complaints
        rent_stabilized: Whether building is rent stabilized

    Returns:
        Tuple of (risk_score, risk_level)
    """
    # Base scoring weights
    violation_weight = 0.4
    eviction_weight = 0.4
    complaint_weight = 0.2

    # Normalize scores (these thresholds can be adjusted based on data analysis)
    violation_score = min(violations / 10.0, 1.0)  # Cap at 10 violations
    eviction_score = min(evictions / 5.0, 1.0)  # Cap at 5 evictions
    complaint_score = min(complaints / 5.0, 1.0)  # Cap at 5 complaints

    # Calculate weighted score
    risk_score = (
        violation_score * violation_weight
        + eviction_score * eviction_weight
        + complaint_score * complaint_weight
    )

    # Rent stabilized buildings get a slight risk reduction
    if rent_stabilized:
        risk_score *= 0.9

    # Determine risk level
    if risk_score >= 0.7:
        risk_level = "High Risk"
    elif risk_score >= 0.4:
        risk_level = "Moderate Risk"
    else:
        risk_level = "Low Risk"

    return round(risk_score, 2), risk_level


def as_neighborhood_stats(row: dict) -> NeighborhoodStats:
    """Convert database row to NeighborhoodStats object"""
    return NeighborhoodStats(**row)


def as_heatmap_point(row: dict) -> HeatmapPoint:
    """Convert database row to HeatmapPoint object"""
    return HeatmapPoint(**row)


def as_neighborhood_summary(row: dict) -> NeighborhoodSummary:
    """Convert database row to NeighborhoodSummary object"""
    return NeighborhoodSummary(**row)
