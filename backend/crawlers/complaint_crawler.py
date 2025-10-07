import os
import time
import requests
from typing import Any, Dict, List, Optional, Set
from infrastructures.postgres.postgres_client import PostgresClient
from common.interfaces.data_crawler import DataCrawler
from common.exceptions.db_error import DatabaseError


class ComplaintCrawler(DataCrawler):
    TABLE_NAME = "building_complaints"

    API_URL = "https://data.cityofnewyork.us/resource/ygpa-z7cr.json"

    COLUMNS = [
        "complaint_id",
        "bbl",
        "borough",
        "block",
        "lot",
        "problem_id",
        "unit_type",
        "space_type",
        "type",
        "major_category",
        "minor_category",
        "complaint_status",
        "complaint_status_date",
        "problem_status",
        "problem_status_date",
        "status_description",
        "house_number",
        "street_name",
        "post_code",
        "apartment",
    ]

    FIELD_CANDIDATES: Dict[str, List[str]] = {
        # 식별/위치
        "complaint_id": ["complaint_id", "complaintid"],
        "bbl": ["bbl"],
        "borough": ["borough"],
        "block": ["block"],
        "lot": ["lot"],

        "problem_id": ["problem_id", "problemid"],
        "unit_type": ["unit_type", "unittype"],
        "space_type": ["space_type", "spacetype"],
        "type": ["type"],
        "major_category": ["major_category", "majorcategory"],
        "minor_category": ["minor_category", "minorcategory"],

        "complaint_status": ["status", "complaint_status", "disposition", "resolution"],
        "complaint_status_date": ["status_date", "statusdate"],
        "problem_status": ["problem_status"],
        "problem_status_date": ["problem_status_date"],
        "status_description": ["status_description"],

        # 주소
        "house_number": ["house_number", "housenumber"],
        "street_name": ["street_name", "streetname"],
        # 우편번호는 뷰에 따라 다름
        "post_code": ["post_code", "zip", "postcode"],
        "apartment": ["apartment"],
    }

    DEFAULT_SELECT_CANDIDATES = [
        "complaint_id", "complaintid",
        "bbl", "borough", "block", "lot",
        "problem_id", "problemid",
        "unit_type", "unittype",
        "space_type", "spacetype",
        "type",
        "major_category", "majorcategory",
        "minor_category", "minorcategory",
        "status", "complaint_status", "disposition", "resolution",
        "status_date", "statusdate",
        "received_date", "receiveddate",
        "closed_date", "closeddate",
        "house_number", "housenumber",
        "street_name", "streetname",
        "post_code", "zip", "postcode",
        "apartment",
        "problem_status", "problem_status_date", "status_description",
        "building_id", "buildingid", "story", "unit", "tract", "communityboard",
    ]

    def __init__(self, timeout: int = 30, max_retries: int = 3):
        self.timeout = timeout
        self.max_retries = max_retries
        self._available_fields: Optional[Set[str]] = None
        self._resolved_map: Optional[Dict[str, Optional[str]]] = None


    def _headers(self) -> Dict[str, str]:
        return {
            "Accept": "application/json",
            "User-Agent": "ComplaintCrawler/1.0",
        }

    def _request(self, params: Dict[str, Any]) -> List[Dict[str, Any]]:
        backoff = 1.0
        for attempt in range(1, self.max_retries + 1):
            resp = requests.get(self.API_URL, params=params, headers=self._headers(), timeout=self.timeout)
            if resp.ok:
                return resp.json()
            if resp.status_code in (429, 500, 502, 503, 504):
                print(f"[ComplaintCrawler] attempt {attempt} -> {resp.status_code}, retry in {backoff:.1f}s")
                time.sleep(backoff)
                backoff *= 2
                continue
            snippet = (resp.text or "")[:400]
            raise requests.HTTPError(f"{resp.status_code} {resp.reason}: {snippet}")
        resp.raise_for_status()
        return []

    def _discover_schema(self) -> Set[str]:
        if self._available_fields is not None:
            return self._available_fields
        data = self._request({"$limit": 1})
        fields: Set[str] = set()
        if data and isinstance(data, list) and isinstance(data[0], dict):
            fields = set(map(str, data[0].keys()))
        self._available_fields = fields
        print(f"[ComplaintCrawler] discovered fields: {sorted(fields)}")
        return fields

    def _resolve_field(self, logical_name: str, available: Set[str]) -> Optional[str]:
        candidates = self.FIELD_CANDIDATES.get(logical_name, [])
        for c in candidates:
            if c in available:
                return c
        return None

    def _build_resolution_map(self) -> Dict[str, Optional[str]]:
        if self._resolved_map is not None:
            return self._resolved_map
        available = self._discover_schema()
        resolved: Dict[str, Optional[str]] = {}
        for logical in self.FIELD_CANDIDATES.keys():
            resolved[logical] = self._resolve_field(logical, available)
        self._resolved_map = resolved
        print(f"[ComplaintCrawler] resolved map: {resolved}")
        return resolved

    def _select_for_available(self, select: Optional[List[str]]) -> Optional[str]:
        available = self._discover_schema()
        if select:
            valid = [c for c in select if c in available]
            return ",".join(valid) if valid else None

        valid = [c for c in self.DEFAULT_SELECT_CANDIDATES if c in available]
        return ",".join(valid) if valid else None

    # ---------- 파라미터 빌드 ----------

    def _build_params(
        self,
        select: Optional[List[str]] = None,
        where: Optional[str] = None,
        order: Optional[str] = None,
        limit: int = 1000,
        offset: int = 0,
        borough: Optional[str] = None,
        bbl: Optional[str] = None,
        status: Optional[str] = None,
        received_from: Optional[str] = None,   # "YYYY-MM-DD"
        received_to: Optional[str] = None,     # "YYYY-MM-DD"
        status_from: Optional[str] = None,     # "YYYY-MM-DD"
        status_to: Optional[str] = None,       # "YYYY-MM-DD"
        extra: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        params: Dict[str, Any] = {}

        sel_str = self._select_for_available(select)
        if sel_str:
            params["$select"] = sel_str

        where_clauses: List[str] = []
        if where:
            where_clauses.append(f"({where})")

        resolved = self._build_resolution_map()

        if borough and "borough" in resolved and resolved["borough"]:
            where_clauses.append(f"{resolved['borough']} = '{borough}'")

        if bbl and "bbl" in resolved and resolved["bbl"]:
            where_clauses.append(f"{resolved['bbl']} = '{bbl}'")

        if status and resolved.get("complaint_status"):
            where_clauses.append(f"{resolved['complaint_status']} = '{status}'")

        rec_col = "received_date" if resolved.get("complaint_status_date") else "received_date"
        available = self._discover_schema()
        rec_actual = "received_date" if "received_date" in available else ("receiveddate" if "receiveddate" in available else None)
        st_actual = resolved.get("complaint_status_date")

        if received_from and rec_actual:
            where_clauses.append(f"{rec_actual} >= '{received_from}T00:00:00.000'")
        if received_to and rec_actual:
            where_clauses.append(f"{rec_actual} < '{received_to}T23:59:59.999'")

        if status_from and st_actual:
            where_clauses.append(f"{st_actual} >= '{status_from}T00:00:00.000'")
        if status_to and st_actual:
            where_clauses.append(f"{st_actual} < '{status_to}T23:59:59.999'")

        if where_clauses:
            params["$where"] = " AND ".join(where_clauses)

        if order:
            params["$order"] = order

        params["$limit"] = limit
        params["$offset"] = offset

        if extra:
            params.update(extra)

        return params


    def fetch(
        self,
        limit: int = 1000,
        offset: int = 0,
        *,
        select: Optional[List[str]] = None,
        where: Optional[str] = None,
        order: Optional[str] = None,
        borough: Optional[str] = None,
        bbl: Optional[str] = None,
        status: Optional[str] = None,
        received_from: Optional[str] = None,
        received_to: Optional[str] = None,
        status_from: Optional[str] = None,
        status_to: Optional[str] = None,
        extra: Optional[Dict[str, Any]] = None,
    ) -> List[Dict[str, Any]]:
        try:
            params = self._build_params(
                select=select, where=where, order=order,
                limit=limit, offset=offset,
                borough=borough, bbl=bbl, status=status,
                received_from=received_from, received_to=received_to,
                status_from=status_from, status_to=status_to,
                extra=extra,
            )
            print(f"[ComplaintCrawler] Fetching with params: {params}")
            data = self._request(params)
        except Exception as e:
            print(f"[ComplaintCrawler] Fetch failed: {e}")
            return []

        available = self._discover_schema()
        resolved = self._build_resolution_map()

        def avail(name: Optional[str]) -> Optional[str]:
            return name if name and name in available else None

        def resolve_post_code(d: Dict[str, Any]) -> Optional[str]:
            for cand in self.FIELD_CANDIDATES["post_code"]:
                if cand in d and d[cand]:
                    return d[cand]
            return None

        def to_int(v):
            try:
                return int(v) if v not in (None, "") else None
            except Exception:
                return None

        mapped: List[Dict[str, Any]] = []
        skipped = 0

        for d in data:
            bbl_key = avail(resolved.get("bbl"))
            bbl_val = d.get(bbl_key) if bbl_key else d.get("bbl")
            if not bbl_val:
                skipped += 1
                continue

            row: Dict[str, Any] = {
                "complaint_id": to_int(d.get(avail(resolved.get("complaint_id")))),
                "bbl": bbl_val,
                "borough": d.get(avail(resolved.get("borough"))),

                "block": to_int(d.get(avail(resolved.get("block")))),
                "lot": to_int(d.get(avail(resolved.get("lot")))),

                "problem_id": to_int(d.get(avail(resolved.get("problem_id")))),

                "unit_type": d.get(avail(resolved.get("unit_type"))),
                "space_type": d.get(avail(resolved.get("space_type"))),
                "type": d.get(avail(resolved.get("type"))),
                "major_category": d.get(avail(resolved.get("major_category"))),
                "minor_category": d.get(avail(resolved.get("minor_category"))),

                "complaint_status": d.get(avail(resolved.get("complaint_status"))),
                "complaint_status_date": d.get(avail(resolved.get("complaint_status_date"))),

                "problem_status": d.get(avail(resolved.get("problem_status"))),
                "problem_status_date": d.get(avail(resolved.get("problem_status_date"))),
                "status_description": d.get(avail(resolved.get("status_description"))),

                "house_number": d.get(avail(resolved.get("house_number"))),
                "street_name": d.get(avail(resolved.get("street_name"))),
                "post_code": resolve_post_code(d),
                "apartment": d.get(avail(resolved.get("apartment"))),
            }

            mapped.append(row)

        print(f"[ComplaintCrawler] Fetched {len(mapped)} rows (skipped {skipped} without BBL).")
        return mapped

    def load(self, rows: List[Dict[str, Any]]) -> None:
        if not rows:
            print("[ComplaintCrawler] No data to insert.")
            return
        with PostgresClient() as db:
            try:
                count = db.bulk_insert(self.TABLE_NAME, self.COLUMNS, rows, conflict_target=["complaint_id"])
                print(f"[ComplaintCrawler] Inserted {count} rows into {self.TABLE_NAME}.")
            except DatabaseError as e:
                print(f"[ComplaintCrawler] Insert failed: {e}")
                raise
