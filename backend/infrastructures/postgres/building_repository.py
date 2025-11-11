from typing import Any, Dict, List, Sequence, Optional

from common.models.building import (
    build_building_from_rows,
)
from infrastructures.postgres.postgres_client import PostgresClient


class BuildingRepository:

    def __init__(self):
        self.client_factory = PostgresClient

    def get_by_bbl(self, bbl: str):
        with self.client_factory() as db:
            reg_row = db.query_one(
                """
                SELECT
                    bbl, bin, boro_id, boro, block, lot,
                    house_number, street_name, zip, community_board,
                    last_registration_date, registration_end_date,
                    registration_id, building_id
                FROM building_registrations
                WHERE bbl = %s
                """,
                (bbl,),
            )

            contact_rows: List[Dict[str, Any]] = []
            if reg_row and reg_row.get("registration_id") is not None:
                contact_rows = db.query_all(
                    """
                    SELECT
                        registration_contact_id, registration_id, type, contact_description,
                        first_name, last_name, corporation_name,
                        business_house_number, business_street_name,
                        business_city, business_state, business_zip, business_apartment
                    FROM building_registration_contacts
                    WHERE registration_id = %s
                    """,
                    (reg_row["registration_id"],),
                )

            affordable_rows = db.query_all(
                """
                SELECT
                    project_id,bbl,project_name,project_start_date,
                    reporting_construction_type,extended_affordability_status,prevailing_wage_status,
                    extremely_low_income_units,very_low_income_units,low_income_units,
                    counted_rental_units,all_counted_units,total_units
                FROM building_affordable_housing
                WHERE bbl = %s
                """,
                (bbl,),
            )

            complaint_rows = db.query_all(
                """
                SELECT
                    complaint_id, bbl, borough, block, lot, problem_id, unit_type, space_type,
                    type, major_category, minor_category, complaint_status, complaint_status_date,
                    problem_status, problem_status_date, status_description,
                    house_number, street_name, post_code, apartment
                FROM building_complaints
                WHERE bbl = %s
                """,
                (bbl,),
            )

            violation_rows = db.query_all(
                """
                SELECT
                    violation_id,bbl,bin,block,lot,boro,
                    nov_description,nov_type,class,rent_impairing,
                    violation_status,current_status,current_status_id,current_status_date,
                    inspection_date,nov_issued_date,approved_date,
                    house_number,street_name,apartment,story
                FROM building_violations
                WHERE bbl = %s
                """,
                (bbl,),
            )

            eviction_rows = db.query_all(
                """
                SELECT docket_number,
                       court_index_number,
                       bbl,
                       bin,
                       borough,
                       eviction_zip,
                       eviction_address,
                       eviction_apt_num,
                       community_board,
                       council_district,
                       census_tract,
                       nta,
                       latitude,
                       longitude,
                       executed_date,
                       residential_commercial_ind,
                       ejectment,
                       eviction_possession,
                       marshal_first_name,
                       marshal_last_name
                FROM building_evictions
                WHERE bbl = %s
                """,
                (bbl,),
            )

            rent_tag_row = db.query_one(
                """
                SELECT
                    bbl, borough, block, lot, zip, city, status, source_year
                FROM building_rent_stabilized_list
                WHERE bbl = %s
                """,
                (bbl,),
            )

            acris_legal_rows = db.query_all(
                """
                SELECT
                    document_id, bbl, borough, block, lot
                FROM building_acris_legals
                WHERE bbl = %s
                """,
                (bbl,),
            )
            doc_ids = sorted(
                {r["document_id"] for r in acris_legal_rows if r.get("document_id")}
            )

            acris_master_rows: List[Dict[str, Any]] = []
            acris_party_rows: List[Dict[str, Any]] = []
            if doc_ids:
                placeholders = ", ".join(["%s"] * len(doc_ids))

                acris_master_rows = db.query_all(
                    f"""
                    SELECT
                        document_id, borough, doc_type, doc_date, doc_amount
                    FROM building_acris_master
                    WHERE document_id IN ({placeholders})
                    """,
                    tuple(doc_ids),
                )

                acris_party_rows = db.query_all(
                    f"""
                    SELECT
                        document_id, party_type, name, address1, city, state, zip
                    FROM building_acris_parties
                    WHERE document_id IN ({placeholders})
                    """,
                    tuple(doc_ids),
                )

        building = build_building_from_rows(
            bbl=bbl,
            reg_row=reg_row,
            contact_rows=contact_rows,
            affordable_rows=affordable_rows,
            complaint_rows=complaint_rows,
            violation_rows=violation_rows,
            acris_master_rows=acris_master_rows,
            acris_legal_rows=acris_legal_rows,
            acris_party_rows=acris_party_rows,
            rent_tag_row=rent_tag_row,
            eviction_rows=eviction_rows,
        )
        return building

    def get_many_by_bbl(self, bbls: Sequence[str]) -> Dict[str, Any]:
        result = {}
        for bbl in bbls:
            try:
                result[bbl] = self.get_by_bbl(bbl)
            except Exception as e:
                print(f"[BuildingRepository] get_by_bbl failed for {bbl}: {e}")
        return result

    def get_registration_by_bbl(self, bbl: str) -> Optional[Dict[str, Any]]:
        """
        registration(및 contacts)만 반환한다.
        반환 스키마:
        {
          "bbl": ..., "bin": ..., "boro_id": ..., "boro": ..., "block": ..., "lot": ...,
          "house_number": ..., "street_name": ..., "zip": ..., "community_board": ...,
          "last_registration_date": ..., "registration_end_date": ...,
          "registration_id": ..., "building_id": ...,
          "contacts": [ { ... }, ... ]  # registration_id가 있을 때만
        }
        """
        with self.client_factory() as db:
            reg_row = db.query_one(
                """
                SELECT bbl,
                       bin,
                       boro_id,
                       boro,
                       block,
                       lot,
                       house_number,
                       street_name,
                       zip,
                       community_board,
                       last_registration_date,
                       registration_end_date,
                       registration_id,
                       building_id
                FROM building_registrations
                WHERE bbl = %s
                """,
                (bbl,),
            )

            if not reg_row:
                return None

            contacts: List[Dict[str, Any]] = []
            if reg_row.get("registration_id") is not None:
                contacts = db.query_all(
                    """
                    SELECT registration_contact_id,
                           registration_id,
                           type,
                           contact_description,
                           first_name,
                           last_name,
                           corporation_name,
                           business_house_number,
                           business_street_name,
                           business_city,
                           business_state,
                           business_zip,
                           business_apartment
                    FROM building_registration_contacts
                    WHERE registration_id = %s
                    """,
                    (reg_row["registration_id"],),
                )

            # 표준 반환 dict 구성
            reg = dict(reg_row)  # shallow copy
            if contacts:
                reg["contacts"] = contacts
            else:
                reg["contacts"] = []

            return reg

    def search_buildings(
        self,
        query: str,
        limit: int = 10,
        borough: Optional[str] = None,
        min_evictions: Optional[int] = None,
        max_evictions: Optional[int] = None,
        min_violations: Optional[int] = None,
        max_violations: Optional[int] = None,
        rent_stabilized: Optional[bool] = None,
        affordable_housing: Optional[bool] = None,
        violation_class: Optional[str] = None,  # 'A', 'B', 'C', or None
        rent_impairing: Optional[bool] = None,
        complaint_category: Optional[str] = None,  # 'HEAT/HOT WATER', 'PLUMBING', etc.
        recent_activity_days: Optional[int] = None,  # Violations/complaints in last N days
        risk_level: Optional[str] = None,  # 'High', 'Moderate', 'Low'
    ) -> List[Dict[str, Any]]:
        """
        Search buildings by address or zip code.
        Returns up to 'limit' results with aggregated data (evictions, violations).

        Args:
            query: Search query (address, zip code, or partial address)
            limit: Maximum number of results to return (default: 10)
            borough: Optional borough filter

        Returns:
            List of building search results with:
            - bbl
            - address (formatted: house_number street_name)
            - borough
            - zip
            - evictions_count (last 3 years)
            - open_violations_count
            - rent_stabilized (boolean)
        """
        with self.client_factory() as db:
            # Normalize query - remove extra spaces, convert to uppercase for matching
            query_clean = query.strip().upper()

            # Check if query is a zip code (5 digits)
            is_zip_code = query_clean.isdigit() and len(query_clean) == 5

            # Build WHERE clause
            where_conditions = []
            params: List[Any] = []

            if is_zip_code:
                # Exact zip code match
                where_conditions.append("br.zip = %s")
                params.append(query_clean)
            else:
                # Address search - try to match full address or parts
                # Match on street name (most common) or full address
                full_address_match = """
                    (br.street_name ILIKE %s
                    OR (br.house_number || ' ' || br.street_name) ILIKE %s)
                """
                where_conditions.append(full_address_match)
                params.append(f"%{query_clean}%")
                params.append(f"%{query_clean}%")

            # Add borough filter if provided
            if borough and borough != "All Boroughs":
                where_conditions.append("br.boro = %s")
                params.append(borough)

            # Add evictions range filters
            if min_evictions is not None:
                where_conditions.append("COALESCE(ev.evictions_count, 0) >= %s")
                params.append(min_evictions)
            if max_evictions is not None:
                where_conditions.append("COALESCE(ev.evictions_count, 0) <= %s")
                params.append(max_evictions)

            # Add violations range filters
            if min_violations is not None:
                where_conditions.append("COALESCE(v.open_violations_count, 0) >= %s")
                params.append(min_violations)
            if max_violations is not None:
                where_conditions.append("COALESCE(v.open_violations_count, 0) <= %s")
                params.append(max_violations)

            # Add rent stabilized filter
            if rent_stabilized is True:
                where_conditions.append("rs.bbl IS NOT NULL")
            elif rent_stabilized is False:
                where_conditions.append("rs.bbl IS NULL")

            # Add affordable housing filter
            if affordable_housing is True:
                where_conditions.append("ah.bbl IS NOT NULL")
            elif affordable_housing is False:
                where_conditions.append("ah.bbl IS NULL")

            # Build additional JOINs for advanced filters
            additional_joins = []
            join_params = []

            # Add violation class filter JOIN
            if violation_class:
                additional_joins.append("""
                    LEFT JOIN (
                        SELECT DISTINCT bbl FROM building_violations
                        WHERE violation_status = 'Open' AND class = %s
                    ) v_class ON br.bbl = v_class.bbl
                """)
                join_params.append(violation_class.upper())
                where_conditions.append("v_class.bbl IS NOT NULL")

            # Add rent impairing violations filter JOIN
            if rent_impairing is True:
                additional_joins.append("""
                    LEFT JOIN (
                        SELECT DISTINCT bbl FROM building_violations
                        WHERE violation_status = 'Open' AND rent_impairing = true
                    ) v_rent_impairing ON br.bbl = v_rent_impairing.bbl
                """)
                where_conditions.append("v_rent_impairing.bbl IS NOT NULL")
            elif rent_impairing is False:
                additional_joins.append("""
                    LEFT JOIN (
                        SELECT DISTINCT bbl FROM building_violations
                        WHERE violation_status = 'Open' AND rent_impairing = true
                    ) v_rent_impairing ON br.bbl = v_rent_impairing.bbl
                """)
                where_conditions.append("v_rent_impairing.bbl IS NULL")

            # Add complaint category filter JOIN
            if complaint_category:
                additional_joins.append("""
                    LEFT JOIN (
                        SELECT DISTINCT bbl FROM building_complaints
                        WHERE major_category = %s
                    ) compl ON br.bbl = compl.bbl
                """)
                join_params.append(complaint_category.upper())
                where_conditions.append("compl.bbl IS NOT NULL")

            # Add recent activity filter JOIN
            if recent_activity_days is not None:
                additional_joins.append(f"""
                    LEFT JOIN (
                        SELECT DISTINCT bbl FROM building_violations
                        WHERE violation_status = 'Open' 
                        AND nov_issued_date >= (CURRENT_DATE - INTERVAL '{recent_activity_days} days')::date
                    ) v_recent ON br.bbl = v_recent.bbl
                    LEFT JOIN (
                        SELECT DISTINCT bbl FROM building_complaints
                        WHERE complaint_status_date >= (CURRENT_DATE - INTERVAL '{recent_activity_days} days')::date
                    ) compl_recent ON br.bbl = compl_recent.bbl
                """)
                where_conditions.append("(v_recent.bbl IS NOT NULL OR compl_recent.bbl IS NOT NULL)")

            # Build the full query with aggregations
            where_clause = " AND ".join(where_conditions) if where_conditions else "1=1"

            query_sql = f"""
                SELECT
                    br.bbl,
                    MAX(br.house_number) as house_number,
                    MAX(br.street_name) as street_name,
                    MAX(br.zip) as zip,
                    MAX(br.boro) as borough,
                    MAX(COALESCE(ev.evictions_count, 0)) as evictions_count,
                    MAX(COALESCE(v.open_violations_count, 0)) as open_violations_count,
                    BOOL_OR(rs.bbl IS NOT NULL) as rent_stabilized,
                    -- Build formatted address
                    MAX(CASE
                        WHEN br.house_number IS NOT NULL AND br.street_name IS NOT NULL
                        THEN TRIM(br.house_number || ' ' || br.street_name)
                        WHEN br.street_name IS NOT NULL
                        THEN br.street_name
                        ELSE 'Address not available'
                    END) as address,
                    -- Add relevance score for ordering
                    MAX(COALESCE(ev.evictions_count, 0) + COALESCE(v.open_violations_count, 0)) as relevance_score
                FROM building_registrations br
                LEFT JOIN (
                    SELECT bbl, COUNT(*) as evictions_count
                    FROM building_evictions
                    WHERE executed_date >= (CURRENT_DATE - INTERVAL '3 years')::date
                    GROUP BY bbl
                ) ev ON br.bbl = ev.bbl
                LEFT JOIN (
                    SELECT bbl, COUNT(*) as open_violations_count
                    FROM building_violations
                    WHERE violation_status = 'Open'
                    GROUP BY bbl
                ) v ON br.bbl = v.bbl
                LEFT JOIN (
                    SELECT DISTINCT bbl FROM building_rent_stabilized_list
                ) rs ON br.bbl = rs.bbl
                LEFT JOIN (
                    SELECT DISTINCT bbl FROM building_affordable_housing
                ) ah ON br.bbl = ah.bbl
                {' '.join(additional_joins)}
                WHERE {where_clause}
                GROUP BY br.bbl
                ORDER BY relevance_score DESC, borough ASC, address ASC
                LIMIT %s
            """

            # Combine all parameters: join_params first, then where params, then limit
            all_params = tuple(join_params + params + [limit])

            results = db.query_all(query_sql, all_params)

            # Filter by risk level in Python if specified
            if risk_level:
                filtered_results = []
                for row in results:
                    evictions = int(row["evictions_count"])
                    violations = int(row["open_violations_count"])
                    calculated_risk = "High" if (evictions > 5 or violations > 10) else ("Moderate" if (evictions > 2 or violations > 5) else "Low")
                    if calculated_risk == risk_level:
                        filtered_results.append(row)
                results = filtered_results

            # Format results
            formatted_results = []
            for row in results:
                formatted_results.append({
                    "bbl": row["bbl"],
                    "address": row["address"],
                    "borough": row["borough"] or "Unknown",
                    "zip": row["zip"] or "",
                    "evictions3yr": int(row["evictions_count"]),
                    "openViolations": int(row["open_violations_count"]),
                    "rentStabilized": bool(row["rent_stabilized"]),
                })

            return formatted_results
