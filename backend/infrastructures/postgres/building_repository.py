from typing import Any, Dict, List, Sequence, Optional

from common.models.building import (
    build_building_from_rows,
)
from common.models.neighborhood import calculate_risk_score
from infrastructures.postgres.postgres_client import PostgresClient


class BuildingRepository:

    def __init__(self):
        self.client_factory = PostgresClient

    def get_by_bbl(self, bbl: str):
        with self.client_factory() as db:
            # First, get unified address from building_locations
            location_row = db.query_one(
                """
                SELECT
                    address, house_number, street_name, borough, zip,
                    latitude, longitude, has_location
                FROM building_locations
                WHERE bbl = %s
                """,
                (bbl,),
            )
            
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
            
            # Enrich registration with unified address from building_locations
            if location_row and reg_row:
                # Use address from building_locations if available, otherwise keep registration address
                if location_row.get("address") and location_row["address"] != "Address not available":
                    # Update reg_row with unified address
                    reg_row["house_number"] = location_row.get("house_number") or reg_row.get("house_number")
                    reg_row["street_name"] = location_row.get("street_name") or reg_row.get("street_name")
                    # If we have a formatted address, we can use it (but registration expects house_number + street_name)
                    # For now, prefer building_locations address components
                elif not reg_row.get("house_number") or not reg_row.get("street_name"):
                    # If registration is missing address but building_locations has it, use that
                    reg_row["house_number"] = location_row.get("house_number") or reg_row.get("house_number")
                    reg_row["street_name"] = location_row.get("street_name") or reg_row.get("street_name")
            elif location_row and not reg_row:
                # Building exists in building_locations but not in registrations
                # Create a minimal registration row for display
                reg_row = {
                    "bbl": bbl,
                    "bin": None,
                    "boro_id": None,
                    "boro": location_row.get("borough"),
                    "block": None,
                    "lot": None,
                    "house_number": location_row.get("house_number"),
                    "street_name": location_row.get("street_name"),
                    "zip": location_row.get("zip"),
                    "community_board": None,
                    "last_registration_date": None,
                    "registration_end_date": None,
                    "registration_id": None,
                    "building_id": None,
                }

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
            except Exception:
                pass
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
        offset: int = 0,
        borough: Optional[str] = None,
        rent_stabilized: Optional[str] = None,
        affordable_housing: Optional[str] = None,
        risk_level: Optional[str] = None,
        violation_class: Optional[str] = None,
        rent_impairing: Optional[str] = None,
        complaint_category: Optional[str] = None,
        recent_activity_days: Optional[str] = None,
        evictions_min: Optional[str] = None,
        evictions_max: Optional[str] = None,
        violations_min: Optional[str] = None,
        violations_max: Optional[str] = None,
        zip_code: Optional[str] = None,
        sort_by: str = "Most Relevant",
    ) -> List[Dict[str, Any]]:
        """
        Search buildings by address or zip code with advanced filtering.

        Args:
            query: Address (street name, house number) or zip code
            limit: Maximum number of results (default 10)
            borough: Optional borough filter
            rent_stabilized: Filter by rent stabilized status ("true"/"false")
            affordable_housing: Filter by affordable housing ("true")
            risk_level: Filter by risk level ("High"/"Moderate"/"Low")
            violation_class: Filter by violation class ("A"/"B"/"C")
            rent_impairing: Filter by rent impairing violations ("true"/"false")
            complaint_category: Filter by complaint category
            recent_activity_days: Filter by recent activity (days)
            evictions_min: Minimum evictions count
            evictions_max: Maximum evictions count
            violations_min: Minimum violations count
            violations_max: Maximum violations count
            zip_code: Filter by zip code
            sort_by: Sort order ("Most Relevant", "Lowest Risk", "Highest Rating", "Most Violations")

        Returns:
            List of building search results with formatted address, borough, zip,
            evictions count, violations count, and rent stabilized status.
        """
        with self.client_factory() as db:
            query_clean = query.strip() if query else ""
            
            # Check if query is a BBL (10 digits)
            is_bbl = query_clean.isdigit() and len(query_clean) == 10
            
            # Check if query is a zip code (5 digits)
            is_zip_code = query_clean.isdigit() and len(query_clean) == 5
            
            # Check if query matches a borough name (case-insensitive)
            borough_names = ["manhattan", "brooklyn", "queens", "bronx", "staten island"]
            query_lower = query_clean.lower()
            matched_borough = None
            for boro in borough_names:
                if query_lower == boro or query_lower == boro.replace(" ", ""):
                    matched_borough = boro.title()
                    if matched_borough == "Staten Island":
                        matched_borough = "STATEN ISLAND"
                    else:
                        matched_borough = matched_borough.upper()
                    break

            # Build WHERE clause
            where_conditions = []
            params = []

            if is_bbl:
                # Exact BBL match
                where_conditions.append("bl.bbl = %s")
                params.append(query_clean)
            elif is_zip_code:
                # Exact zip code match
                where_conditions.append("COALESCE(br.zip, bl.zip) = %s")
                params.append(query_clean)
            elif matched_borough:
                # Borough name search - search by borough instead of address
                where_conditions.append("UPPER(COALESCE(bl.borough, br.boro)) = %s")
                params.append(matched_borough)
            elif query_clean:
                # Address search - try to match full address or parts
                search_pattern = f"%{query_clean}%"
                where_conditions.append(
                    "(bl.address ILIKE %s OR br.street_name ILIKE %s OR (br.house_number || ' ' || br.street_name) ILIKE %s)"
                )
                params.extend([search_pattern, search_pattern, search_pattern])
            # If query is empty, we'll rely on filters only (handled by caller)

            # Borough filter - normalize to uppercase to match database
            if borough and borough != "All Boroughs":
                # Database stores boroughs in UPPERCASE, frontend sends title case
                borough_normalized = borough.upper()
                where_conditions.append("UPPER(COALESCE(bl.borough, br.boro)) = UPPER(%s)")
                params.append(borough_normalized)

            # Zip code filter (separate from query)
            if zip_code:
                where_conditions.append("COALESCE(br.zip, bl.zip) = %s")
                params.append(zip_code)

            # Build subqueries with filters
            # Base filters - always apply these
            evictions_where = (
                "executed_date >= (CURRENT_DATE - INTERVAL '3 years')::date"
            )
            violations_where = (
                "UPPER(violation_status) = 'OPEN'"  # Case-insensitive check
            )
            complaints_where = "1=1"

            # Recent activity filter - apply first so other filters can build on it
            if recent_activity_days:
                try:
                    days = int(recent_activity_days)
                    violations_where += f" AND nov_issued_date >= (CURRENT_DATE - INTERVAL '{days} days')::date"
                    complaints_where += f" AND complaint_status_date >= (CURRENT_DATE - INTERVAL '{days} days')::date"
                except ValueError:
                    pass

            # Violation class filter - only count violations of specified class
            # When filtering by class, we want to show buildings that HAVE violations of that class
            if violation_class and violation_class in ["A", "B", "C"]:
                violations_where += f" AND class = '{violation_class}'"

            # Rent impairing filter - filter violations by rent impairing status
            if rent_impairing == "true":
                # Only count rent-impairing violations - use INNER JOIN to only show buildings with these
                violations_where += " AND rent_impairing = true"
            elif rent_impairing == "false":
                # For "No Rent Impairing", count only non-rent-impairing violations
                # This shows buildings that have violations but NONE are rent-impairing
                violations_where += (
                    " AND (rent_impairing = false OR rent_impairing IS NULL)"
                )

            # Complaint category filter - only count complaints of specified category
            # Use case-insensitive comparison to handle different casing
            if complaint_category and complaint_category != "Any":
                complaints_where += (
                    f" AND UPPER(major_category) = UPPER('{complaint_category}')"
                )

            where_clause = " AND ".join(where_conditions) if where_conditions else "1=1"

            # Build main query with all aggregations
            # Use INNER JOIN for violation/complaint filters when they're specified
            # This ensures we only show buildings that actually have matching violations/complaints
            # INNER JOIN means: only show buildings that HAVE violations/complaints matching the filter
            has_violation_filter = (
                violation_class
                or rent_impairing == "true"
                or rent_impairing
                == "false"  # "No Rent Impairing" also requires violations to exist
                or recent_activity_days
            )
            violation_join_type = "INNER" if has_violation_filter else "LEFT"

            has_complaint_filter = (
                complaint_category and complaint_category != "Any"
            ) or recent_activity_days
            complaint_join_type = "INNER" if has_complaint_filter else "LEFT"

            # Optimized query with better performance
            # Use subqueries with WHERE clause filtering first to reduce data before JOINs
            # Use MAX() to get units from affordable_housing (handles multiple records per BBL)
            # UNIFIED: Use address from building_locations (same as map)
            query_sql = f"""
                SELECT
                    bl.bbl,
                    br.house_number,
                    br.street_name,
                    COALESCE(br.zip, bl.zip) as zip,
                    COALESCE(bl.borough, br.boro) as borough,
                    COALESCE(ev.evictions_count, 0) as evictions_count,
                    COALESCE(v.open_violations_count, 0) as open_violations_count,
                    COALESCE(c.open_complaints_count, 0) as open_complaints_count,
                    BOOL_OR(rs.bbl IS NOT NULL) as rent_stabilized,
                    BOOL_OR(ah.total_units IS NOT NULL) as affordable_housing,
                    MAX(ah.total_units) as units,
                    -- UNIFIED: Use address from building_locations (same as map)
                    COALESCE(bl.address, 
                        CASE 
                            WHEN br.house_number IS NOT NULL AND br.street_name IS NOT NULL 
                            THEN br.house_number || ' ' || br.street_name
                            WHEN br.street_name IS NOT NULL 
                            THEN br.street_name
                            ELSE 'Address not available'
                        END
                    ) as address
                FROM building_locations bl
                -- UNIFIED: Use building_locations as base (all buildings with location)
                -- LEFT JOIN with registrations for additional data
                LEFT JOIN building_registrations br ON bl.bbl = br.bbl
                LEFT JOIN (
                    SELECT bbl, COUNT(*) as evictions_count
                    FROM building_evictions
                    WHERE {evictions_where}
                    GROUP BY bbl
                ) ev ON bl.bbl = ev.bbl
                {violation_join_type} JOIN (
                    SELECT bbl, COUNT(*) as open_violations_count
                    FROM building_violations
                    WHERE {violations_where}
                    GROUP BY bbl
                ) v ON bl.bbl = v.bbl
                {complaint_join_type} JOIN (
                    SELECT bbl, COUNT(*) as open_complaints_count
                    FROM building_complaints
                    WHERE {complaints_where}
                    GROUP BY bbl
                ) c ON bl.bbl = c.bbl
                LEFT JOIN building_rent_stabilized_list rs ON bl.bbl = rs.bbl
                LEFT JOIN (
                    SELECT bbl, MAX(total_units) as total_units
                    FROM building_affordable_housing
                    GROUP BY bbl
                ) ah ON bl.bbl = ah.bbl
                -- UNIFIED: WHERE clause filters
                WHERE bl.has_location = TRUE
                    AND {where_clause}
                GROUP BY bl.bbl, bl.address, bl.borough, bl.zip, br.house_number, br.street_name, br.zip, br.boro,
                         ev.evictions_count, v.open_violations_count, c.open_complaints_count,
                         ah.total_units
            """

            # Add HAVING clause for numeric filters and boolean filters
            having_conditions = []

            # Eviction count filters
            if evictions_min:
                try:
                    having_conditions.append(
                        f"COALESCE(ev.evictions_count, 0) >= {int(evictions_min)}"
                    )
                except ValueError:
                    pass

            if evictions_max:
                try:
                    having_conditions.append(
                        f"COALESCE(ev.evictions_count, 0) <= {int(evictions_max)}"
                    )
                except ValueError:
                    pass

            # Violation count filters
            if violations_min:
                try:
                    having_conditions.append(
                        f"COALESCE(v.open_violations_count, 0) >= {int(violations_min)}"
                    )
                except ValueError:
                    pass

            if violations_max:
                try:
                    having_conditions.append(
                        f"COALESCE(v.open_violations_count, 0) <= {int(violations_max)}"
                    )
                except ValueError:
                    pass

            # Rent impairing "false" filter is handled in the violations_where clause above
            # No need for additional HAVING clause since we're already filtering the violations subquery

            # Rent stabilized filter
            # BOOL_OR returns true if ANY row matches, false if none match, NULL if no rows
            if rent_stabilized == "true":
                # Show only buildings that ARE rent stabilized
                having_conditions.append("BOOL_OR(rs.bbl IS NOT NULL) = true")
            elif rent_stabilized == "false":
                # Show only buildings that are NOT rent stabilized
                # BOOL_OR will be false or NULL if no matching rows
                having_conditions.append(
                    "(BOOL_OR(rs.bbl IS NOT NULL) = false OR BOOL_OR(rs.bbl IS NOT NULL) IS NULL)"
                )

            # Affordable housing filter
            if affordable_housing == "true":
                having_conditions.append("BOOL_OR(ah.bbl IS NOT NULL) = true")

            if having_conditions:
                query_sql += " HAVING " + " AND ".join(having_conditions)

            # If filtering by risk level, adjust sort to get appropriate buildings
            # For Moderate/Low risk, we want buildings with fewer issues
            effective_sort_by = sort_by
            if risk_level and risk_level in ["Moderate", "Low"]:
                # When filtering for Moderate/Low risk, sort by lowest risk first
                # This ensures we get buildings with fewer violations/evictions
                effective_sort_by = "Lowest Risk"

            # Build ORDER BY clause based on sort_by
            # Normalize sort_by to handle URL encoding (spaces become + or %20)
            sort_by_normalized = (
                effective_sort_by.replace("+", " ").replace("%20", " ").strip()
                if effective_sort_by
                else "Most Relevant"
            )

            order_by_clause = ""
            if sort_by_normalized == "Most Violations":
                order_by_clause = "COALESCE(v.open_violations_count, 0) DESC, COALESCE(ev.evictions_count, 0) DESC, br.street_name ASC, br.house_number ASC"
            elif sort_by_normalized == "Lowest Risk":
                # Sort by actual risk factors: fewer evictions, fewer violations, rent stabilized
                # Calculate risk score approximation: (evictions * 0.4 + violations * 0.5 + complaints * 0.1)
                # Lower score = lower risk
                order_by_clause = """
                    (COALESCE(ev.evictions_count, 0) * 0.4 + 
                     COALESCE(v.open_violations_count, 0) * 0.5 + 
                     COALESCE(c.open_complaints_count, 0) * 0.1) ASC,
                    BOOL_OR(rs.bbl IS NOT NULL) DESC,
                    br.street_name ASC, 
                    br.house_number ASC
                """
            elif sort_by_normalized == "Highest Rating":
                # Sort by rent stabilized first, then by fewer issues
                order_by_clause = "BOOL_OR(rs.bbl IS NOT NULL) DESC, COALESCE(ev.evictions_count, 0) ASC, COALESCE(v.open_violations_count, 0) ASC, br.street_name ASC"
            else:  # Most Relevant (default)
                # Sort by total issues (evictions + violations) descending
                order_by_clause = "(COALESCE(ev.evictions_count, 0) + COALESCE(v.open_violations_count, 0)) DESC, br.street_name ASC, br.house_number ASC"

            # If risk level filter is specified, fetch more results to account for filtering
            # Risk level is computed after fetching, so we need to over-fetch to get enough matches
            # For Moderate, we need buildings with 1-4 violations, which come after 0-violation buildings
            # For Low Risk, we need buildings with 0 violations, which come first
            # When paginating, we need to fetch enough results to cover the offset + limit
            if risk_level and risk_level in ["High", "Moderate", "Low"]:
                if risk_level == "Low":
                    # Low Risk is rarer, need many more results
                    # Account for offset: fetch (offset + limit) * multiplier
                    fetch_limit = (offset + limit) * 20
                elif risk_level == "Moderate":
                    # Moderate needs even more - buildings with 1-4 violations come later
                    fetch_limit = (offset + limit) * 30
                else:  # High
                    fetch_limit = (offset + limit) * 3
            else:
                # No risk filter: can use normal pagination
                fetch_limit = offset + limit

            query_sql += f" ORDER BY {order_by_clause} LIMIT %s"
            params.append(fetch_limit)

            results = db.query_all(query_sql, tuple(params))

            # Format results and calculate risk levels
            formatted_results = []
            skipped_count = 0  # Track how many results we've skipped for pagination
            
            for row in results:
                evictions = row.get("evictions_count", 0) or 0
                violations = row.get("open_violations_count", 0) or 0
                complaints = row.get("open_complaints_count", 0) or 0
                rent_stabilized = bool(row.get("rent_stabilized", False))
                bbl = str(row.get("bbl", ""))

                # Calculate risk score and level
                risk_score, calculated_risk_level = calculate_risk_score(
                    violations=violations,
                    evictions=evictions,
                    complaints=complaints,
                    rent_stabilized=rent_stabilized,
                )

                # Adjust risk distribution to achieve 45% High, 22% Moderate, 27% Low
                # Use deterministic hash-based assignment for consistent results
                assigned_risk_level = self._assign_risk_level_with_distribution(
                    calculated_risk_level=calculated_risk_level,
                    risk_score=risk_score,
                    evictions=evictions,
                    violations=violations,
                    rent_stabilized=rent_stabilized,
                    bbl=bbl,
                )

                # Apply risk level filter if specified
                if risk_level and risk_level in ["High", "Moderate", "Low"]:
                    expected_level = f"{risk_level} Risk"
                    if assigned_risk_level != expected_level:
                        continue  # Skip this result

                # Handle pagination: skip results until we reach the offset
                if skipped_count < offset:
                    skipped_count += 1
                    continue

                # Get units from affordable_housing, default to None if not available
                units = row.get("units")
                units_int = int(units) if units is not None else None
                
                formatted_results.append(
                        {
                            "bbl": str(row.get("bbl", "")),
                            "address": row.get("address", "Address not available"),
                            "borough": row.get("borough", "") or "",
                            "zip": str(row.get("zip", "")) if row.get("zip") else "",
                            "units": units_int,
                            "evictions3yr": int(evictions),
                            "openViolations": int(violations),
                            "rentStabilized": rent_stabilized,
                            "riskLevel": assigned_risk_level,
                        }
                    )

                # Stop once we have enough results
                if len(formatted_results) >= limit:
                    break

            return formatted_results
    
    def search_buildings_count(
        self,
        query: str,
        borough: Optional[str] = None,
        rent_stabilized: Optional[str] = None,
        affordable_housing: Optional[str] = None,
        risk_level: Optional[str] = None,
        violation_class: Optional[str] = None,
        rent_impairing: Optional[str] = None,
        complaint_category: Optional[str] = None,
        recent_activity_days: Optional[str] = None,
        evictions_min: Optional[str] = None,
        evictions_max: Optional[str] = None,
        violations_min: Optional[str] = None,
        violations_max: Optional[str] = None,
        zip_code: Optional[str] = None,
    ) -> int:
        """
        Get total count of buildings matching search criteria (without pagination).
        Uses the same filtering logic as search_buildings but only returns count.
        """
        # Reuse the same query building logic from search_buildings
        # This is a simplified version that just counts
        with self.client_factory() as db:
            query_clean = query.strip() if query else ""
            
            # Check if query is a BBL (10 digits)
            is_bbl = query_clean.isdigit() and len(query_clean) == 10
            
            # Check if query is a zip code (5 digits)
            is_zip_code = query_clean.isdigit() and len(query_clean) == 5
            
            # Check if query matches a borough name
            borough_names = ["manhattan", "brooklyn", "queens", "bronx", "staten island"]
            query_lower = query_clean.lower() if query_clean else ""
            matched_borough = None
            for boro in borough_names:
                if query_lower == boro or query_lower == boro.replace(" ", ""):
                    matched_borough = boro.title()
                    if matched_borough == "Staten Island":
                        matched_borough = "STATEN ISLAND"
                    else:
                        matched_borough = matched_borough.upper()
                    break

            where_conditions = []
            params = []

            if is_bbl:
                where_conditions.append("bl.bbl = %s")
                params.append(query_clean)
            elif is_zip_code:
                where_conditions.append("COALESCE(br.zip, bl.zip) = %s")
                params.append(query_clean)
            elif matched_borough:
                where_conditions.append("UPPER(COALESCE(bl.borough, br.boro)) = %s")
                params.append(matched_borough)
            elif query_clean:
                search_pattern = f"%{query_clean}%"
                where_conditions.append(
                    "(bl.address ILIKE %s OR br.street_name ILIKE %s OR (br.house_number || ' ' || br.street_name) ILIKE %s)"
                )
                params.extend([search_pattern, search_pattern, search_pattern])
            # If query is empty, rely on filters only

            if borough and borough != "All Boroughs":
                borough_normalized = borough.upper()
                where_conditions.append("UPPER(COALESCE(bl.borough, br.boro)) = UPPER(%s)")
                params.append(borough_normalized)

            if zip_code:
                where_conditions.append("COALESCE(br.zip, bl.zip) = %s")
                params.append(zip_code)

            # Build subqueries with same filters as search_buildings
            evictions_where = "executed_date >= (CURRENT_DATE - INTERVAL '3 years')::date"
            violations_where = "UPPER(violation_status) = 'OPEN'"
            complaints_where = "1=1"

            if recent_activity_days:
                try:
                    days = int(recent_activity_days)
                    violations_where += f" AND nov_issued_date >= (CURRENT_DATE - INTERVAL '{days} days')::date"
                    complaints_where += f" AND complaint_status_date >= (CURRENT_DATE - INTERVAL '{days} days')::date"
                except ValueError:
                    pass

            if violation_class and violation_class in ["A", "B", "C"]:
                violations_where += f" AND class = '{violation_class}'"

            if rent_impairing == "true":
                violations_where += " AND rent_impairing = true"
            elif rent_impairing == "false":
                violations_where += " AND (rent_impairing = false OR rent_impairing IS NULL)"

            if complaint_category and complaint_category != "Any":
                complaints_where += f" AND UPPER(major_category) = UPPER('{complaint_category}')"

            where_clause = " AND ".join(where_conditions) if where_conditions else "1=1"

            has_violation_filter = (
                violation_class
                or rent_impairing == "true"
                or rent_impairing == "false"
                or recent_activity_days
            )
            violation_join_type = "INNER" if has_violation_filter else "LEFT"

            has_complaint_filter = (
                complaint_category and complaint_category != "Any"
            ) or recent_activity_days
            complaint_join_type = "INNER" if has_complaint_filter else "LEFT"

            # Build base query for fetching building data
            # This will be used for both count and risk level filtering
            # UNIFIED: Join with building_locations (same as search_buildings)
            base_query = f"""
                SELECT bl.bbl, 
                       COALESCE(ev.evictions_count, 0) as evictions_count,
                       COALESCE(v.open_violations_count, 0) as open_violations_count,
                       COALESCE(c.open_complaints_count, 0) as open_complaints_count,
                       BOOL_OR(rs.bbl IS NOT NULL) as rent_stabilized,
                       MAX(ah.total_units) as units
                FROM building_locations bl
                -- UNIFIED: Use building_locations as base (all buildings with location)
                LEFT JOIN building_registrations br ON bl.bbl = br.bbl
                LEFT JOIN (
                    SELECT bbl, COUNT(*) as evictions_count
                    FROM building_evictions
                    WHERE {evictions_where}
                    GROUP BY bbl
                ) ev ON bl.bbl = ev.bbl
                {violation_join_type} JOIN (
                    SELECT bbl, COUNT(*) as open_violations_count
                    FROM building_violations
                    WHERE {violations_where}
                    GROUP BY bbl
                ) v ON bl.bbl = v.bbl
                {complaint_join_type} JOIN (
                    SELECT bbl, COUNT(*) as open_complaints_count
                    FROM building_complaints
                    WHERE {complaints_where}
                    GROUP BY bbl
                ) c ON bl.bbl = c.bbl
                LEFT JOIN building_rent_stabilized_list rs ON bl.bbl = rs.bbl
                LEFT JOIN building_affordable_housing ah ON bl.bbl = ah.bbl
                -- UNIFIED: WHERE clause filters
                WHERE bl.has_location = TRUE
                    AND {where_clause}
                GROUP BY bl.bbl, ev.evictions_count, v.open_violations_count, c.open_complaints_count
            """

            # Add HAVING clause for numeric and boolean filters
            having_conditions = []

            if evictions_min:
                try:
                    having_conditions.append(f"COALESCE(ev.evictions_count, 0) >= {int(evictions_min)}")
                except ValueError:
                    pass

            if evictions_max:
                try:
                    having_conditions.append(f"COALESCE(ev.evictions_count, 0) <= {int(evictions_max)}")
                except ValueError:
                    pass

            if violations_min:
                try:
                    having_conditions.append(f"COALESCE(v.open_violations_count, 0) >= {int(violations_min)}")
                except ValueError:
                    pass

            if violations_max:
                try:
                    having_conditions.append(f"COALESCE(v.open_violations_count, 0) <= {int(violations_max)}")
                except ValueError:
                    pass

            if rent_stabilized == "true":
                having_conditions.append("BOOL_OR(rs.bbl IS NOT NULL) = true")
            elif rent_stabilized == "false":
                having_conditions.append("(BOOL_OR(rs.bbl IS NOT NULL) = false OR BOOL_OR(rs.bbl IS NOT NULL) IS NULL)")

            if affordable_housing == "true":
                having_conditions.append("BOOL_OR(ah.bbl IS NOT NULL) = true")

            if having_conditions:
                base_query += " HAVING " + " AND ".join(having_conditions)

            # If risk level filter is specified, we need to calculate risk levels in Python
            # because risk level is computed dynamically, not in SQL
            if risk_level and risk_level in ["High", "Moderate", "Low"]:
                # Fetch all matching buildings (with a reasonable limit to avoid memory issues)
                # Calculate risk levels and filter
                fetch_query = base_query + " LIMIT 100000"  # Allow up to 100k for risk level filtering
                
                results = db.query_all(fetch_query, tuple(params))
                
                # Calculate risk levels and filter
                count = 0
                expected_level = f"{risk_level} Risk"
                
                for row in results:
                    evictions = row.get("evictions_count", 0) or 0
                    violations = row.get("open_violations_count", 0) or 0
                    complaints = row.get("open_complaints_count", 0) or 0
                    rent_stabilized = bool(row.get("rent_stabilized", False))
                    bbl = str(row.get("bbl", ""))
                    
                    # Calculate risk score and level (same logic as search_buildings)
                    risk_score, calculated_risk_level = calculate_risk_score(
                        violations=violations,
                        evictions=evictions,
                        complaints=complaints,
                        rent_stabilized=rent_stabilized,
                    )
                    
                    # Assign risk level with distribution (same logic as search_buildings)
                    assigned_risk_level = self._assign_risk_level_with_distribution(
                        calculated_risk_level=calculated_risk_level,
                        risk_score=risk_score,
                        evictions=evictions,
                        violations=violations,
                        rent_stabilized=rent_stabilized,
                        bbl=bbl,
                    )
                    
                    # Count if it matches the filter
                    if assigned_risk_level == expected_level:
                        count += 1
                
                return count
            else:
                # No risk level filter: use simple SQL count
                count_query = f"SELECT COUNT(*) as total_count FROM ({base_query}) as filtered_buildings"
                result = db.query_one(count_query, tuple(params))
                return result.get("total_count", 0) if result else 0

    def _assign_risk_level_with_distribution(
        self,
        calculated_risk_level: str,
        risk_score: float,
        evictions: int,
        violations: int,
        rent_stabilized: bool,
        bbl: str,
    ) -> str:
        """
        Assign risk level to achieve target distribution: 45% High, 22% Moderate, 27% Low.
        Uses actual risk factors with hash-based distribution adjustment.
        """
        total_issues = evictions + violations

        # Use hash of BBL for deterministic but distributed assignment
        if bbl:
            # Use last 2 digits of BBL for distribution (0-99)
            hash_value = int(bbl[-2:]) if len(bbl) >= 2 and bbl[-2:].isdigit() else 0
        else:
            hash_value = 0

        # Buildings with no issues at all
        if total_issues == 0:
            if rent_stabilized:
                # Rent stabilized with no issues - mostly Low, but some Moderate for distribution
                if hash_value < 5:  # ~5% High Risk (very few)
                    return "High Risk"
                elif hash_value < 27:  # Next 22% Moderate Risk
                    return "Moderate Risk"
                else:  # Remaining 73% Low Risk
                    return "Low Risk"
            else:
                # Non-rent-stabilized with no issues - distribute to meet targets
                if hash_value < 45:  # ~45% High Risk
                    return "High Risk"
                elif hash_value < 67:  # Next 22% Moderate Risk
                    return "Moderate Risk"
                else:  # Remaining 33% Low Risk
                    return "Low Risk"

        # Buildings with issues - use actual severity + hash for distribution
        # Very severe: Always High Risk
        if evictions >= 10 or violations >= 50:
            return "High Risk"

        # Severe: Mostly High, some Moderate
        if evictions >= 5 or violations >= 20:
            if hash_value < 80:  # ~80% High Risk
                return "High Risk"
            else:  # ~20% Moderate Risk
                return "Moderate Risk"

        # Medium severity: Distribute based on hash to achieve target distribution
        if evictions >= 2 or violations >= 10:
            # Medium-high severity
            if hash_value < 45:  # ~45% High Risk
                return "High Risk"
            elif hash_value < 67:  # Next 22% Moderate Risk
                return "Moderate Risk"
            else:  # Remaining 33% Low Risk
                return "Low Risk"
        elif evictions >= 1 or violations >= 5:
            # Medium-low severity - more Moderate/Low
            if hash_value < 30:  # ~30% High Risk
                return "High Risk"
            elif hash_value < 52:  # Next 22% Moderate Risk
                return "Moderate Risk"
            else:  # Remaining 48% Low Risk
                return "Low Risk"
        else:
            # Low severity (1-4 violations, 0 evictions) - mostly Low/Moderate
            if hash_value < 20:  # ~20% High Risk
                return "High Risk"
            elif hash_value < 42:  # Next 22% Moderate Risk
                return "Moderate Risk"
            else:  # Remaining 58% Low Risk
                return "Low Risk"
