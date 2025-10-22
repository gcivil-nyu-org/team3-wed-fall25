from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

from common.models.neighborhood import (
    HeatmapPoint,
    NeighborhoodStats,
    NeighborhoodSummary,
    as_heatmap_point,
    as_neighborhood_summary,
    calculate_risk_score,
)
from infrastructures.postgres.postgres_client import PostgresClient


class NeighborhoodRepository:
    """Repository for neighborhood-level data aggregation and analysis"""

    def __init__(self):
        self.client_factory = PostgresClient

    def get_neighborhood_stats_by_bounds(
        self,
        min_lat: float,
        max_lat: float,
        min_lng: float,
        max_lng: float,
        data_type: str = "violations",
    ) -> List[NeighborhoodStats]:
        """
        Get neighborhood statistics for buildings within geographic bounds.

        Args:
            min_lat, max_lat, min_lng, max_lng: Geographic bounds
            data_type: Type of data to focus on ('violations', 'evictions', 'complaints')

        Returns:
            List of NeighborhoodStats objects
        """
        with self.client_factory() as db:
            # Get buildings with coordinates in the bounds
            buildings_query = """
                SELECT DISTINCT 
                    e.bbl,
                    e.eviction_address as address,
                    e.borough,
                    e.eviction_zip as zip_code,
                    e.latitude,
                    e.longitude
                FROM building_evictions e
                WHERE e.latitude IS NOT NULL 
                    AND e.longitude IS NOT NULL
                    AND e.latitude BETWEEN %s AND %s
                    AND e.longitude BETWEEN %s AND %s
                
                UNION
                
                SELECT DISTINCT 
                    v.bbl,
                    CONCAT(v.house_number, ' ', v.street_name) as address,
                    v.boro as borough,
                    NULL::text as zip_code,
                    NULL::numeric as latitude,
                    NULL::numeric as longitude
                FROM building_violations v
                WHERE v.bbl NOT IN (
                    SELECT DISTINCT bbl FROM building_evictions 
                    WHERE latitude IS NOT NULL AND longitude IS NOT NULL
                )
                AND v.bbl IN (
                    SELECT DISTINCT bbl FROM building_registrations
                    WHERE bbl IN (
                        SELECT DISTINCT bbl FROM building_evictions
                        WHERE latitude BETWEEN %s AND %s
                        AND longitude BETWEEN %s AND %s
                    )
                )
            """

            buildings = db.query_all(
                buildings_query,
                (
                    min_lat,
                    max_lat,
                    min_lng,
                    max_lng,
                    min_lat,
                    max_lat,
                    min_lng,
                    max_lng,
                ),
            )

            if not buildings:
                return []

            # Get BBLs for batch processing
            bbls = [b["bbl"] for b in buildings if b["bbl"]]
            if not bbls:
                return []

            placeholders = ", ".join(["%s"] * len(bbls))

            # Get violation statistics
            violations_query = f"""
                SELECT 
                    bbl,
                    COUNT(*) as total_violations,
                    SUM(CASE WHEN violation_status = 'Open' THEN 1 ELSE 0 END) as open_violations,
                    SUM(CASE WHEN class_ = 'A' THEN 1 ELSE 0 END) as class_a_violations,
                    SUM(CASE WHEN class_ = 'B' THEN 1 ELSE 0 END) as class_b_violations,
                    SUM(CASE WHEN class_ = 'C' THEN 1 ELSE 0 END) as class_c_violations,
                    SUM(CASE WHEN rent_impairing = true THEN 1 ELSE 0 END) as rent_impairing_violations
                FROM building_violations
                WHERE bbl IN ({placeholders})
                GROUP BY bbl
            """

            violations = db.query_all(violations_query, tuple(bbls))
            violations_dict = {v["bbl"]: v for v in violations}

            # Get eviction statistics
            evictions_query = f"""
                SELECT 
                    bbl,
                    COUNT(*) as total_evictions,
                    SUM(CASE WHEN executed_date >= %s THEN 1 ELSE 0 END) as evictions_3yr,
                    SUM(CASE WHEN executed_date >= %s THEN 1 ELSE 0 END) as evictions_1yr
                FROM building_evictions
                WHERE bbl IN ({placeholders})
                GROUP BY bbl
            """

            three_years_ago = datetime.now() - timedelta(days=3 * 365)
            one_year_ago = datetime.now() - timedelta(days=365)

            evictions = db.query_all(
                evictions_query, (three_years_ago, one_year_ago) + tuple(bbls)
            )
            evictions_dict = {e["bbl"]: e for e in evictions}

            # Get complaint statistics
            complaints_query = f"""
                SELECT 
                    bbl,
                    COUNT(*) as total_complaints,
                    SUM(CASE WHEN complaint_status = 'Open' THEN 1 ELSE 0 END) as open_complaints,
                    SUM(CASE WHEN type IN ('EMERGENCY', 'IMMEDIATE EMERGENCY') THEN 1 ELSE 0 END) as emergency_complaints
                FROM building_complaints
                WHERE bbl IN ({placeholders})
                GROUP BY bbl
            """

            complaints = db.query_all(complaints_query, tuple(bbls))
            complaints_dict = {c["bbl"]: c for c in complaints}

            # Get rent stabilization status
            rent_stabilized_query = f"""
                SELECT DISTINCT bbl
                FROM building_rent_stabilized_list
                WHERE bbl IN ({placeholders})
            """

            rent_stabilized = db.query_all(rent_stabilized_query, tuple(bbls))
            rent_stabilized_set = {r["bbl"] for r in rent_stabilized}

            # Combine all data
            results = []
            for building in buildings:
                bbl = building["bbl"]
                if not bbl:
                    continue

                # Get data for this building
                violation_data = violations_dict.get(bbl, {})
                eviction_data = evictions_dict.get(bbl, {})
                complaint_data = complaints_dict.get(bbl, {})

                # Calculate risk score
                risk_score, risk_level = calculate_risk_score(
                    violations=violation_data.get("open_violations", 0),
                    evictions=eviction_data.get("evictions_3yr", 0),
                    complaints=complaint_data.get("open_complaints", 0),
                    rent_stabilized=bbl in rent_stabilized_set,
                )

                # Create NeighborhoodStats object
                stats = NeighborhoodStats(
                    bbl=bbl,
                    address=building.get("address", ""),
                    borough=building.get("borough", ""),
                    zip_code=building.get("zip_code", ""),
                    latitude=building.get("latitude"),
                    longitude=building.get("longitude"),
                    total_violations=violation_data.get("total_violations", 0),
                    open_violations=violation_data.get("open_violations", 0),
                    class_a_violations=violation_data.get("class_a_violations", 0),
                    class_b_violations=violation_data.get("class_b_violations", 0),
                    class_c_violations=violation_data.get("class_c_violations", 0),
                    rent_impairing_violations=violation_data.get(
                        "rent_impairing_violations", 0
                    ),
                    total_evictions=eviction_data.get("total_evictions", 0),
                    evictions_3yr=eviction_data.get("evictions_3yr", 0),
                    evictions_1yr=eviction_data.get("evictions_1yr", 0),
                    total_complaints=complaint_data.get("total_complaints", 0),
                    open_complaints=complaint_data.get("open_complaints", 0),
                    emergency_complaints=complaint_data.get("emergency_complaints", 0),
                    is_rent_stabilized=bbl in rent_stabilized_set,
                    risk_score=risk_score,
                    risk_level=risk_level,
                    last_updated=datetime.now(),
                )

                results.append(stats)

            return results

    def get_heatmap_data(
        self,
        min_lat: float,
        max_lat: float,
        min_lng: float,
        max_lng: float,
        data_type: str = "violations",
        borough: Optional[str] = None,
        limit: int = 50000,
    ) -> List[HeatmapPoint]:
        """
        Get heatmap data points for visualization.

        Args:
            min_lat, max_lat, min_lng, max_lng: Geographic bounds
            data_type: Type of data ('violations', 'evictions', 'complaints')
            borough: Optional borough filter
            limit: Maximum number of data points to return

        Returns:
            List of HeatmapPoint objects
        """
        with self.client_factory() as db:
            if data_type == "violations":
                return self._get_violations_heatmap(
                    db, min_lat, max_lat, min_lng, max_lng, borough, limit
                )
            elif data_type == "evictions":
                return self._get_evictions_heatmap(
                    db, min_lat, max_lat, min_lng, max_lng, borough, limit
                )
            elif data_type == "complaints":
                return self._get_complaints_heatmap(
                    db, min_lat, max_lat, min_lng, max_lng, borough, limit
                )
            else:
                return []

    def _get_violations_heatmap(
        self,
        db: PostgresClient,
        min_lat: float,
        max_lat: float,
        min_lng: float,
        max_lng: float,
        borough: Optional[str] = None,
        limit: int = 50000,
    ) -> List[HeatmapPoint]:
        """Get violations heatmap data - optimized to use all data points"""
        # Build query with optional borough filter
        query = """
            SELECT 
                e.bbl,
                e.latitude,
                e.longitude,
                e.eviction_address as address,
                e.borough,
                COALESCE(v.violation_count, 0) as count,
                -- More granular intensity calculation using all data
                CASE 
                    WHEN COALESCE(v.violation_count, 0) = 0 THEN 0.0
                    WHEN COALESCE(v.violation_count, 0) <= 2 THEN 0.2
                    WHEN COALESCE(v.violation_count, 0) <= 5 THEN 0.4
                    WHEN COALESCE(v.violation_count, 0) <= 10 THEN 0.6
                    WHEN COALESCE(v.violation_count, 0) <= 20 THEN 0.8
                    ELSE 1.0
                END as intensity
            FROM building_evictions e
            LEFT JOIN (
                SELECT 
                    bbl,
                    COUNT(*) as violation_count
                FROM building_violations
                WHERE violation_status = 'Open'
                GROUP BY bbl
            ) v ON e.bbl = v.bbl
            WHERE e.latitude IS NOT NULL 
                AND e.longitude IS NOT NULL
                AND e.latitude BETWEEN %s AND %s
                AND e.longitude BETWEEN %s AND %s
        """

        # Add borough filter if specified
        if borough and borough != "All Boroughs":
            query += " AND e.borough = %s"
            query += " ORDER BY COALESCE(v.violation_count, 0) DESC LIMIT %s"
            rows = db.query_all(
                query, (min_lat, max_lat, min_lng, max_lng, borough, limit)
            )
        else:
            query += " ORDER BY COALESCE(v.violation_count, 0) DESC LIMIT %s"
            rows = db.query_all(query, (min_lat, max_lat, min_lng, max_lng, limit))
        return [as_heatmap_point({**row, "data_type": "violations"}) for row in rows]

    def _get_evictions_heatmap(
        self,
        db: PostgresClient,
        min_lat: float,
        max_lat: float,
        min_lng: float,
        max_lng: float,
        borough: Optional[str] = None,
        limit: int = 50000,
    ) -> List[HeatmapPoint]:
        """Get evictions heatmap data - optimized to use all data points"""
        three_years_ago = datetime.now() - timedelta(days=3 * 365)

        # Build query with optional borough filter
        query = """
            SELECT 
                bbl,
                latitude,
                longitude,
                eviction_address as address,
                borough,
                COUNT(*) as count,
                -- More granular intensity calculation
                CASE 
                    WHEN COUNT(*) = 0 THEN 0.0
                    WHEN COUNT(*) = 1 THEN 0.2
                    WHEN COUNT(*) = 2 THEN 0.4
                    WHEN COUNT(*) <= 4 THEN 0.6
                    WHEN COUNT(*) <= 8 THEN 0.8
                    ELSE 1.0
                END as intensity
            FROM building_evictions
            WHERE latitude IS NOT NULL 
                AND longitude IS NOT NULL
                AND latitude BETWEEN %s AND %s
                AND longitude BETWEEN %s AND %s
                AND executed_date >= %s
        """

        # Add borough filter if specified
        if borough and borough != "All Boroughs":
            query += " AND borough = %s"
            query += " GROUP BY bbl, latitude, longitude, eviction_address, borough ORDER BY COUNT(*) DESC LIMIT %s"
            rows = db.query_all(
                query,
                (min_lat, max_lat, min_lng, max_lng, three_years_ago, borough, limit),
            )
        else:
            query += " GROUP BY bbl, latitude, longitude, eviction_address, borough ORDER BY COUNT(*) DESC LIMIT %s"
            rows = db.query_all(
                query, (min_lat, max_lat, min_lng, max_lng, three_years_ago, limit)
            )
        return [as_heatmap_point({**row, "data_type": "evictions"}) for row in rows]

    def _get_complaints_heatmap(
        self,
        db: PostgresClient,
        min_lat: float,
        max_lat: float,
        min_lng: float,
        max_lng: float,
        borough: Optional[str] = None,
        limit: int = 50000,
    ) -> List[HeatmapPoint]:
        """Get complaints heatmap data - optimized to use all data points"""
        # Build query with optional borough filter
        query = """
            SELECT 
                e.bbl,
                e.latitude,
                e.longitude,
                e.eviction_address as address,
                e.borough,
                COALESCE(c.complaint_count, 0) as count,
                -- More granular intensity calculation
                CASE 
                    WHEN COALESCE(c.complaint_count, 0) = 0 THEN 0.0
                    WHEN COALESCE(c.complaint_count, 0) <= 2 THEN 0.2
                    WHEN COALESCE(c.complaint_count, 0) <= 5 THEN 0.4
                    WHEN COALESCE(c.complaint_count, 0) <= 10 THEN 0.6
                    WHEN COALESCE(c.complaint_count, 0) <= 15 THEN 0.8
                    ELSE 1.0
                END as intensity
            FROM building_evictions e
            LEFT JOIN (
                SELECT 
                    bbl,
                    COUNT(*) as complaint_count
                FROM building_complaints
                WHERE complaint_status = 'Open'
                GROUP BY bbl
            ) c ON e.bbl = c.bbl
            WHERE e.latitude IS NOT NULL 
                AND e.longitude IS NOT NULL
                AND e.latitude BETWEEN %s AND %s
                AND e.longitude BETWEEN %s AND %s
        """

        # Add borough filter if specified
        if borough and borough != "All Boroughs":
            query += " AND e.borough = %s"
            query += " ORDER BY COALESCE(c.complaint_count, 0) DESC LIMIT %s"
            rows = db.query_all(
                query, (min_lat, max_lat, min_lng, max_lng, borough, limit)
            )
        else:
            query += " ORDER BY COALESCE(c.complaint_count, 0) DESC LIMIT %s"
            rows = db.query_all(query, (min_lat, max_lat, min_lng, max_lng, limit))
        return [as_heatmap_point({**row, "data_type": "complaints"}) for row in rows]

    def get_borough_summary(self, borough: str = None) -> List[NeighborhoodSummary]:
        """
        Get summary statistics by borough.

        Args:
            borough: Specific borough to filter by (optional)

        Returns:
            List of NeighborhoodSummary objects
        """
        with self.client_factory() as db:
            where_clause = "WHERE e.borough = %s" if borough else ""
            params = (borough,) if borough else ()

            query = f"""
                SELECT 
                    e.borough,
                    COUNT(DISTINCT e.bbl) as total_buildings,
                    AVG(COALESCE(v.violation_count, 0)) as avg_violations_per_building,
                    AVG(COALESCE(ev.eviction_count, 0)) as avg_evictions_per_building,
                    COUNT(DISTINCT rs.bbl) as total_rent_stabilized,
                    SUM(CASE 
                        WHEN COALESCE(v.violation_count, 0) >= 10 
                             OR COALESCE(ev.eviction_count, 0) >= 3 
                        THEN 1 ELSE 0 
                    END) as high_risk_buildings,
                    SUM(CASE 
                        WHEN (COALESCE(v.violation_count, 0) BETWEEN 5 AND 9) 
                             OR (COALESCE(ev.eviction_count, 0) BETWEEN 1 AND 2)
                        THEN 1 ELSE 0 
                    END) as medium_risk_buildings,
                    SUM(CASE 
                        WHEN COALESCE(v.violation_count, 0) < 5 
                             AND COALESCE(ev.eviction_count, 0) = 0
                        THEN 1 ELSE 0 
                    END) as low_risk_buildings
                FROM building_evictions e
                LEFT JOIN (
                    SELECT bbl, COUNT(*) as violation_count
                    FROM building_violations
                    WHERE violation_status = 'Open'
                    GROUP BY bbl
                ) v ON e.bbl = v.bbl
                LEFT JOIN (
                    SELECT bbl, COUNT(*) as eviction_count
                    FROM building_evictions
                    WHERE executed_date >= %s
                    GROUP BY bbl
                ) ev ON e.bbl = ev.bbl
                LEFT JOIN building_rent_stabilized_list rs ON e.bbl = rs.bbl
                {where_clause}
                GROUP BY e.borough
                ORDER BY e.borough
            """

            three_years_ago = datetime.now() - timedelta(days=3 * 365)
            all_params = (three_years_ago,) + params

            rows = db.query_all(query, all_params)
            return [as_neighborhood_summary(row) for row in rows]

    def get_neighborhood_trends(self, bbl: str, days_back: int = 365) -> Dict[str, Any]:
        """
        Get trend data for a specific building/neighborhood.

        Args:
            bbl: Building BBL
            days_back: Number of days to look back

        Returns:
            Dictionary with trend data
        """
        with self.client_factory() as db:
            start_date = datetime.now() - timedelta(days=days_back)

            # Get violation trends
            violation_trends = db.query_all(
                """
                SELECT 
                    DATE_TRUNC('month', inspection_date) as month,
                    COUNT(*) as count
                FROM building_violations
                WHERE bbl = %s AND inspection_date >= %s
                GROUP BY DATE_TRUNC('month', inspection_date)
                ORDER BY month
            """,
                (bbl, start_date),
            )

            # Get eviction trends
            eviction_trends = db.query_all(
                """
                SELECT 
                    DATE_TRUNC('month', executed_date) as month,
                    COUNT(*) as count
                FROM building_evictions
                WHERE bbl = %s AND executed_date >= %s
                GROUP BY DATE_TRUNC('month', executed_date)
                ORDER BY month
            """,
                (bbl, start_date),
            )

            # Get complaint trends
            complaint_trends = db.query_all(
                """
                SELECT 
                    DATE_TRUNC('month', problem_status_date) as month,
                    COUNT(*) as count
                FROM building_complaints
                WHERE bbl = %s AND problem_status_date >= %s
                GROUP BY DATE_TRUNC('month', problem_status_date)
                ORDER BY month
            """,
                (bbl, start_date),
            )

            return {
                "violations": violation_trends,
                "evictions": eviction_trends,
                "complaints": complaint_trends,
            }
