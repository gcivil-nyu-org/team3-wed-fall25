# repositories/registration_crawler.py
import requests
from typing import Any, Dict, List
from infrastructures.postgres.postgres_client import PostgresClient
from common.interfaces.data_crawler import DataCrawler
from common.exceptions.db_error import DatabaseError


class RegistrationCrawler(DataCrawler):
    TABLE_NAME = "building_registrations"
    API_URL = "https://data.cityofnewyork.us/resource/tesw-yqqr.json"

    COLUMNS = [
        "bbl",
        "bin",
        "boro_id",
        "boro",
        "block",
        "lot",
        "house_number",
        "street_name",
        "zip",
        "community_board",
        "last_registration_date",
        "registration_end_date",
        "registration_id",
        "building_id",
    ]

    def fetch(self, limit: int = 1000, offset: int = 0) -> List[Dict[str, Any]]:
        url = f"{self.API_URL}?$limit={limit}&$offset={offset}"
        print(f"[RegistrationCrawler] Fetching data from {url}")

        try:
            resp = requests.get(url, timeout=30)
            resp.raise_for_status()
            data = resp.json()

            def compute_bbl(boro_id: Any, block: Any, lot: Any) -> str | None:
                try:
                    boro_id = int(boro_id)
                    block = int(block)
                    lot = int(lot)
                    return str(boro_id * 1_000_000_000 + block * 10_000 + lot)
                except Exception:
                    return None

            mapped = []
            skipped = 0

            for d in data:
                bbl = d.get("bbl") or compute_bbl(d.get("boroid"), d.get("block"), d.get("lot"))
                if not bbl:
                    skipped += 1
                    continue

                mapped.append({
                    "bbl": bbl,
                    "bin": d.get("bin"),
                    "boro_id": int(d.get("boroid")) if d.get("boroid") else None,
                    "boro": d.get("boro"),
                    "block": int(d.get("block")) if d.get("block") else None,
                    "lot": int(d.get("lot")) if d.get("lot") else None,
                    "house_number": d.get("housenumber"),
                    "street_name": d.get("streetname"),
                    "zip": d.get("zip"),
                    "community_board": int(d.get("communityboard")) if d.get("communityboard") else None,
                    "last_registration_date": d.get("lastregistrationdate"),
                    "registration_end_date": d.get("registrationenddate"),
                    "registration_id": int(d.get("registrationid")) if d.get("registrationid") else None,
                    "building_id": int(d.get("buildingid")) if d.get("buildingid") else None,
                })

            print(f"[RegistrationCrawler] Fetched {len(mapped)} rows (skipped {skipped} without BBL).")
            return mapped

        except Exception as e:
            print(f"[RegistrationCrawler] Fetch failed: {e}")
            return []

    def load(self, rows: List[Dict[str, Any]]) -> None:
        if not rows:
            print("[RegistrationCrawler] No data to insert.")
            return

        with PostgresClient() as db:
            try:
                count = db.bulk_insert(self.TABLE_NAME, self.COLUMNS, rows, conflict_target=["bbl"])
                print(f"[RegistrationCrawler] Inserted {count} rows into {self.TABLE_NAME}.")
            except DatabaseError as e:
                print(f"[RegistrationCrawler] Insert failed: {e}")
                raise

