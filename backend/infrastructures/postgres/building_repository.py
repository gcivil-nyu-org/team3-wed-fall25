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
    ) -> List[Dict[str, Any]]:
        """
        Search buildings by address or zip code.

        Args:
            query: Address (street name, house number) or zip code
            limit: Maximum number of results (default 10)
            borough: Optional borough filter

        Returns:
            List of building search results with formatted address, borough, zip,
            evictions count, violations count, and rent stabilized status.
        """
        with self.client_factory() as db:
            query_clean = query.strip()
            if not query_clean:
                return []

            # Check if query is a zip code (5 digits)
            is_zip_code = query_clean.isdigit() and len(query_clean) == 5

            # Build WHERE clause
            where_conditions = []
            params = []

            if is_zip_code:
                # Exact zip code match
                where_conditions.append("br.zip = %s")
                params.append(query_clean)
            else:
                # Address search - try to match full address or parts
                # Match on street name (most common) or full address
                search_pattern = f"%{query_clean}%"
                where_conditions.append(
                    "(br.street_name ILIKE %s OR (br.house_number || ' ' || br.street_name) ILIKE %s)"
                )
                params.extend([search_pattern, search_pattern])

            # Borough filter
            if borough and borough != "All Boroughs":
                where_conditions.append("br.boro = %s")
                params.append(borough)

            where_clause = " AND ".join(where_conditions) if where_conditions else "1=1"

            # Build query with aggregations for relevance scoring
            query_sql = f"""
                SELECT
                    br.bbl,
                    br.house_number,
                    br.street_name,
                    br.zip,
                    br.boro as borough,
                    COALESCE(ev.evictions_count, 0) as evictions_count,
                    COALESCE(v.open_violations_count, 0) as open_violations_count,
                    BOOL_OR(rs.bbl IS NOT NULL) as rent_stabilized,
                    -- Build formatted address
                    CASE 
                        WHEN br.house_number IS NOT NULL AND br.street_name IS NOT NULL 
                        THEN br.house_number || ' ' || br.street_name
                        WHEN br.street_name IS NOT NULL 
                        THEN br.street_name
                        ELSE 'Address not available'
                    END as address
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
                    WHERE violation_status = 'OPEN'
                    GROUP BY bbl
                ) v ON br.bbl = v.bbl
                LEFT JOIN building_rent_stabilized_list rs ON br.bbl = rs.bbl
                WHERE {where_clause}
                GROUP BY br.bbl, br.house_number, br.street_name, br.zip, br.boro, 
                         ev.evictions_count, v.open_violations_count
                ORDER BY 
                    (COALESCE(ev.evictions_count, 0) + COALESCE(v.open_violations_count, 0)) DESC,
                    br.street_name ASC,
                    br.house_number ASC
                LIMIT %s
            """

            params.append(limit)
            results = db.query_all(query_sql, tuple(params))

            # Format results
            formatted_results = []
            for row in results:
                # Calculate risk level based on evictions and violations
                evictions = row.get("evictions_count", 0) or 0
                violations = row.get("open_violations_count", 0) or 0
                total_issues = evictions + violations

                if total_issues >= 10:
                    risk_level = "High Risk"
                elif total_issues >= 3:
                    risk_level = "Moderate Risk"
                else:
                    risk_level = "Low Risk"

                formatted_results.append(
                    {
                        "bbl": str(row.get("bbl", "")),
                        "address": row.get("address", "Address not available"),
                        "borough": row.get("borough", ""),
                        "zip": row.get("zip", ""),
                        "evictions3yr": int(evictions),
                        "openViolations": int(violations),
                        "rentStabilized": bool(row.get("rent_stabilized", False)),
                        "riskLevel": risk_level,
                    }
                )

            return formatted_results
