from typing import List, Dict, Any, Optional, Sequence
from infrastructures.postgres.postgres_client import PostgresClient

from common.models.building import (
    build_building_from_rows,
)

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
            doc_ids = sorted({r["document_id"] for r in acris_legal_rows if r.get("document_id")})

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