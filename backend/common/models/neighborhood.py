from __future__ import annotations
from dataclasses import dataclass, field
from typing import Optional, List, Dict, Any
from datetime import datetime
from decimal import Decimal


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
    # Optional fields for advanced filtering (violations only)
    open_violations: Optional[int] = None
    closed_violations: Optional[int] = None
    class_a_count: Optional[int] = None
    class_b_count: Optional[int] = None
    class_c_count: Optional[int] = None
    avg_response_days: Optional[float] = None


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
    # Base scoring weights - adjusted for better balance
    violation_weight = 0.5  # Increased from 0.4
    eviction_weight = 0.4
    complaint_weight = 0.1  # Decreased from 0.2

    # Normalize scores - adjusted for NYC to get ~45% High Risk
    # More lenient normalization so more buildings score higher
    violation_score = min(violations / 2.0, 1.0)  # Cap at 2 violations
    eviction_score = min(evictions / 1.0, 1.0)  # Cap at 1 eviction (very impactful)
    complaint_score = min(complaints / 3.0, 1.0)  # Cap at 3 complaints

    # Calculate weighted score
    risk_score = (
        violation_score * violation_weight
        + eviction_score * eviction_weight
        + complaint_score * complaint_weight
    )

    # Rent stabilized buildings get a slight risk reduction
    if rent_stabilized:
        risk_score *= 0.9

    # Determine risk level - NYC target: ~45% High Risk, rest split between Moderate and Low
    # Simple logic: prioritize by issues, then rent stabilization status
    total_issues = evictions + violations
    if total_issues >= 1:
        risk_level = "High Risk"
    elif not rent_stabilized:
        # Non-rent-stabilized with no issues = Moderate Risk (will be adjusted in repository)
        risk_level = "Moderate Risk"
    else:
        # Rent stabilized with no issues = Low Risk
        risk_level = "Low Risk"

    return round(risk_score, 2), risk_level


def as_neighborhood_stats(row: dict) -> NeighborhoodStats:
    """Convert database row to NeighborhoodStats object"""
    return NeighborhoodStats(**row)


def as_heatmap_point(row: dict) -> HeatmapPoint:
    """Convert database row to HeatmapPoint object"""
    # Only include fields that exist in the row
    point_data = {
        "bbl": row.get("bbl", ""),
        "latitude": row.get("latitude", 0.0),
        "longitude": row.get("longitude", 0.0),
        "intensity": row.get("intensity", 0.0),
        "data_type": row.get("data_type", ""),
        "count": row.get("count", 0),
        "address": row.get("address", ""),
        "borough": row.get("borough", ""),
    }
    # Add optional fields if they exist
    if "open_violations" in row:
        point_data["open_violations"] = row.get("open_violations")
    if "closed_violations" in row:
        point_data["closed_violations"] = row.get("closed_violations")
    if "class_a_count" in row:
        point_data["class_a_count"] = row.get("class_a_count")
    if "class_b_count" in row:
        point_data["class_b_count"] = row.get("class_b_count")
    if "class_c_count" in row:
        point_data["class_c_count"] = row.get("class_c_count")
    if "avg_response_days" in row:
        point_data["avg_response_days"] = row.get("avg_response_days")
    return HeatmapPoint(**point_data)


def as_neighborhood_summary(row: dict) -> NeighborhoodSummary:
    """Convert database row to NeighborhoodSummary object"""
    return NeighborhoodSummary(**row)
