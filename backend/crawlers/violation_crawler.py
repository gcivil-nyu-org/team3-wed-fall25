# crawlers/violation_crawler.py
import time
from typing import Any, Dict, List, Optional, Set

import requests

from common.exceptions.db_error import DatabaseError
from common.interfaces.data_crawler import DataCrawler
from infrastructures.postgres.postgres_client import PostgresClient


class ViolationCrawler(DataCrawler):
    TABLE_NAME = "building_violations"
    API_URL = "https://data.cityofnewyork.us/resource/wvxf-dwi5.json"
    CONFLICT_TARGET = ["violation_id"]

    COLUMNS = [
        "violation_id",
        "bbl",
        "bin",
        "block",
        "lot",
        "boro",
        "nov_description",
        "nov_type",
        "class",
        "rent_impairing",
        "violation_status",
        "current_status",
        "current_status_id",
        "current_status_date",
        "inspection_date",
        "nov_issued_date",
        "approved_date",
        "house_number",
        "street_name",
        "apartment",
        "story",
    ]

    FIELD_CANDIDATES = {
        "violation_id": ["violation_id", "violationid"],
        "bbl": ["bbl"],
        "bin": ["bin"],
        "block": ["block"],
        "lot": ["lot"],
        "boro": ["boro", "borough"],
        "nov_description": ["nov_description", "novdescription"],
        "nov_type": ["nov_type", "novtype"],
        "class": ["class"],
        "rent_impairing": ["rent_impairing", "rentimpairing"],
        "violation_status": ["violation_status", "violationstatus"],
        "current_status": ["current_status", "currentstatus"],
        "current_status_id": ["current_status_id", "currentstatusid"],
        "current_status_date": ["current_status_date", "currentstatusdate"],
        "inspection_date": ["inspection_date", "inspectiondate"],
        "nov_issued_date": ["nov_issued_date", "novissueddate"],
        "approved_date": ["approved_date", "approveddate"],
        "house_number": ["house_number", "housenumber"],
        "street_name": ["street_name", "streetname"],
        "apartment": ["apartment"],
        "story": ["story"],
    }

    DEFAULT_SELECT_CANDIDATES = [
        "violation_id",
        "violationid",
        "block",
        "lot",
        "boro",
        "borough",
        "nov_description",
        "novdescription",
        "nov_type",
        "novtype",
        "class",
        "rent_impairing",
        "rentimpairing",
        "violation_status",
        "violationstatus",
        "current_status",
        "currentstatus",
        "current_status_id",
        "currentstatusid",
        "current_status_date",
        "currentstatusdate",
        "inspection_date",
        "inspectiondate",
        "nov_issued_date",
        "novissueddate",
        "approved_date",
        "approveddate",
        "house_number",
        "housenumber",
        "street_name",
        "streetname",
        "apartment",
        "story",
    ]

    def __init__(self, timeout: int = 30, max_retries: int = 3):
        self.timeout = timeout
        self.max_retries = max_retries
        self._available_fields: Optional[Set[str]] = None
        self._resolved_map: Optional[Dict[str, Optional[str]]] = None

    def _headers(self):
        return {"Accept": "application/json", "User-Agent": "ViolationCrawler/1.0"}

    def _request(self, params: Dict[str, Any]) -> List[Dict[str, Any]]:
        backoff = 1.0
        for attempt in range(1, self.max_retries + 1):
            resp = requests.get(
                self.API_URL,
                params=params,
                headers=self._headers(),
                timeout=self.timeout,
            )
            if resp.ok:
                return resp.json()
            if resp.status_code in (429, 500, 502, 503, 504):
                print(
                    f"[ViolationCrawler] attempt {attempt} -> {resp.status_code}, retry in {backoff:.1f}s"
                )
                time.sleep(backoff)
                backoff *= 2
                continue
            raise requests.HTTPError(
                f"{resp.status_code} {resp.reason}: {resp.text[:400]}"
            )
        resp.raise_for_status()
        return []

    def _discover_schema(self) -> Set[str]:
        if self._available_fields is not None:
            return self._available_fields
        data = self._request({"$limit": 1})
        fields = set(data[0].keys()) if data else set()
        self._available_fields = fields
        print(f"[ViolationCrawler] discovered fields: {sorted(fields)}")
        return fields

    def _resolve_field(self, logical_name: str, available: Set[str]) -> Optional[str]:
        for cand in self.FIELD_CANDIDATES.get(logical_name, []):
            if cand in available:
                return cand
        return None

    def _build_resolution_map(self) -> Dict[str, Optional[str]]:
        if self._resolved_map is not None:
            return self._resolved_map
        available = self._discover_schema()
        resolved = {
            logical: self._resolve_field(logical, available)
            for logical in self.FIELD_CANDIDATES
        }
        self._resolved_map = resolved
        print(f"[ViolationCrawler] resolved map: {resolved}")
        return resolved

    def _select_for_available(self, select: Optional[List[str]]) -> Optional[str]:
        available = self._discover_schema()
        if select:
            valid = [c for c in select if c in available]
            return ",".join(valid) if valid else None
        valid = [c for c in self.DEFAULT_SELECT_CANDIDATES if c in available]
        return ",".join(valid) if valid else None

    def fetch(self, limit: int = 1000, offset: int = 0) -> List[Dict[str, Any]]:
        params = {"$limit": limit, "$offset": offset}
        select = self._select_for_available(None)
        if select:
            params["$select"] = select

        print(f"[ViolationCrawler] Fetching with params: {params}")
        try:
            data = self._request(params)
        except Exception as e:
            print(f"[ViolationCrawler] Fetch failed: {e}")
            return []

        available = self._discover_schema()
        resolved = self._build_resolution_map()

        def avail(name: Optional[str]):
            return name if name and name in available else None

        def to_int(v):
            try:
                return int(v) if v not in (None, "") else None
            except Exception:
                return None

        def to_bool(v):
            if v is None:
                return None
            s = str(v).strip().lower()
            return (
                True
                if s in ("y", "yes", "true", "1")
                else False if s in ("n", "no", "false", "0") else None
            )

        def make_bbl(boro: str, block: Any, lot: Any) -> Optional[str]:
            if not (boro and block and lot):
                return None
            boro_map = {
                "MANHATTAN": "1",
                "BRONX": "2",
                "BROOKLYN": "3",
                "QUEENS": "4",
                "STATEN ISLAND": "5",
            }
            code = boro_map.get(str(boro).upper(), "0")
            try:
                return f"{code}{int(block):05d}{int(lot):04d}"
            except Exception:
                return None

        mapped = []
        for d in data:
            boro_val = d.get(avail(resolved.get("boro")))
            block_val = d.get(avail(resolved.get("block")))
            lot_val = d.get(avail(resolved.get("lot")))
            bbl_val = make_bbl(boro_val, block_val, lot_val)

            mapped.append(
                {
                    "violation_id": to_int(d.get(avail(resolved.get("violation_id")))),
                    "bbl": bbl_val,
                    "bin": to_int(d.get(avail(resolved.get("bin")))),
                    "block": to_int(block_val),
                    "lot": to_int(lot_val),
                    "boro": boro_val,
                    "nov_description": d.get(avail(resolved.get("nov_description"))),
                    "nov_type": d.get(avail(resolved.get("nov_type"))),
                    "class": d.get(avail(resolved.get("class"))),
                    "rent_impairing": to_bool(
                        d.get(avail(resolved.get("rent_impairing")))
                    ),
                    "violation_status": d.get(avail(resolved.get("violation_status"))),
                    "current_status": d.get(avail(resolved.get("current_status"))),
                    "current_status_id": to_int(
                        d.get(avail(resolved.get("current_status_id")))
                    ),
                    "current_status_date": d.get(
                        avail(resolved.get("current_status_date"))
                    ),
                    "inspection_date": d.get(avail(resolved.get("inspection_date"))),
                    "nov_issued_date": d.get(avail(resolved.get("nov_issued_date"))),
                    "approved_date": d.get(avail(resolved.get("approved_date"))),
                    "house_number": d.get(avail(resolved.get("house_number"))),
                    "street_name": d.get(avail(resolved.get("street_name"))),
                    "apartment": d.get(avail(resolved.get("apartment"))),
                    "story": d.get(avail(resolved.get("story"))),
                }
            )

        print(f"[ViolationCrawler] Fetched {len(mapped)} rows.")
        return mapped

    def load(self, rows: List[Dict[str, Any]]) -> None:
        if not rows:
            print(f"[{self.__class__.__name__}] No data to insert.")
            return
        with PostgresClient() as db:
            try:
                conflict_target = getattr(self, "CONFLICT_TARGET", None)
                count = db.bulk_insert(
                    self.TABLE_NAME, self.COLUMNS, rows, conflict_target=conflict_target
                )
                print(
                    f"[{self.__class__.__name__}] Inserted {count} rows into {self.TABLE_NAME}."
                )
            except DatabaseError as e:
                print(f"[{self.__class__.__name__}] Insert failed: {e}")
                raise
