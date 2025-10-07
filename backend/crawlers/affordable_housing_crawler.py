import time
import requests
from typing import Any, Dict, List, Optional, Set
from infrastructures.postgres.postgres_client import PostgresClient
from common.interfaces.data_crawler import DataCrawler
from common.exceptions.db_error import DatabaseError

class AffordableHousingCrawler(DataCrawler):
    TABLE_NAME = "building_affordable_housing"
    API_URL = "https://data.cityofnewyork.us/resource/hg8x-zxpr.json"
    CONFLICT_TARGET = ["project_id"]

    COLUMNS = [
        "project_id",
        "bbl",
        "project_name",
        "project_start_date",
        "reporting_construction_type",
        "extended_affordability_status",
        "prevailing_wage_status",
        "extremely_low_income_units",
        "very_low_income_units",
        "low_income_units",
        "counted_rental_units",
        "all_counted_units",
        "total_units",
    ]

    FIELD_CANDIDATES: Dict[str, List[str]] = {
        "project_id": ["project_id"],
        "project_name": ["project_name"],
        "project_start_date": ["project_start_date"],
        "reporting_construction_type": ["reporting_construction_type"],
        "extended_affordability_status": ["extended_affordability_status"],
        "prevailing_wage_status": ["prevailing_wage_status"],
        "extremely_low_income_units": ["extremely_low_income_units"],
        "very_low_income_units": ["very_low_income_units"],
        "low_income_units": ["low_income_units"],
        "counted_rental_units": ["counted_rental_units"],
        "all_counted_units": ["all_counted_units"],
        "total_units": ["total_units"],
        "bbl": ["bbl"],
        "boroid": ["boroid", "borough_id", "boroughid"],
        "block": ["block"],
        "lot": ["lot"],
    }

    DEFAULT_SELECT_CANDIDATES = [
        "project_id", "project_name", "project_start_date",
        "reporting_construction_type", "extended_affordability_status", "prevailing_wage_status",
        "extremely_low_income_units", "very_low_income_units", "low_income_units",
        "counted_rental_units", "all_counted_units", "total_units",
        "bbl", "boroid", "block", "lot",
    ]

    def __init__(self, timeout: int = 30, max_retries: int = 3):
        self.timeout = timeout
        self.max_retries = max_retries
        self._available_fields: Optional[Set[str]] = None
        self._resolved_map: Optional[Dict[str, Optional[str]]] = None

    def _headers(self) -> Dict[str, str]:
        return {"Accept": "application/json", "User-Agent": "AffordableHousingCrawler/1.0"}

    def _request(self, params: Dict[str, Any]) -> List[Dict[str, Any]]:
        backoff = 1.0
        for attempt in range(1, self.max_retries + 1):
            resp = requests.get(self.API_URL, params=params, headers=self._headers(), timeout=self.timeout)
            if resp.ok:
                return resp.json()
            if resp.status_code in (429, 500, 502, 503, 504):
                print(f"[AffordableHousingCrawler] attempt {attempt} -> {resp.status_code}, retry in {backoff:.1f}s")
                time.sleep(backoff)
                backoff *= 2
                continue
            raise requests.HTTPError(f"{resp.status_code} {resp.reason}: {resp.text[:400]}")
        resp.raise_for_status()
        return []

    def _discover_schema(self) -> Set[str]:
        if self._available_fields is not None:
            return self._available_fields
        data = self._request({"$limit": 1})
        fields: Set[str] = set(data[0].keys()) if data else set()
        self._available_fields = fields
        print(f"[AffordableHousingCrawler] discovered fields: {sorted(fields)}")
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
        resolved = {logical: self._resolve_field(logical, available) for logical in self.FIELD_CANDIDATES}
        self._resolved_map = resolved
        print(f"[AffordableHousingCrawler] resolved map: {resolved}")
        return resolved

    def _select_for_available(self, select: Optional[List[str]]) -> Optional[str]:
        available = self._discover_schema()
        if select:
            valid = [c for c in select if c in available]
            return ",".join(valid) if valid else None
        valid = [c for c in self.DEFAULT_SELECT_CANDIDATES if c in available]
        return ",".join(valid) if valid else None

    def _build_params(
            self,
            select: Optional[List[str]] = None,
            where: Optional[str] = None,
            order: Optional[str] = None,
            limit: int = 5000,
            offset: int = 0,
            *,
            start_from: Optional[str] = None,
            start_to: Optional[str] = None,
            construction_type: Optional[str] = None,
            extra: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        params: Dict[str, Any] = {}

        sel_str = self._select_for_available(select)
        if sel_str:
            params["$select"] = sel_str

        where_clauses: List[str] = []
        if where:
            where_clauses.append(f"({where})")

        resolved = self._build_resolution_map()
        available = self._discover_schema()

        date_col = resolved.get("project_start_date")
        if start_from and date_col:
            where_clauses.append(f"{date_col} >= '{start_from}T00:00:00.000'")
        if start_to and date_col:
            where_clauses.append(f"{date_col} < '{start_to}T23:59:59.999'")

        if construction_type and resolved.get("reporting_construction_type"):
            where_clauses.append(f"{resolved['reporting_construction_type']} = '{construction_type}'")

        if where_clauses:
            params["$where"] = " AND ".join(where_clauses)

        if order:
            params["$order"] = order
        else:
            if date_col:
                params["$order"] = f"{date_col} DESC"

        params["$limit"] = limit
        params["$offset"] = offset

        if extra:
            params.update(extra)

        return params

    @staticmethod
    def _to_int(v):
        try:
            return int(v) if v not in (None, "") else None
        except Exception:
            return None

    @staticmethod
    def _make_bbl_from_parts(boroid: Any, block: Any, lot: Any) -> Optional[str]:
        if boroid in (None, "", "0") or block in (None, "", "0") or lot in (None, "", "0"):
            return None
        try:
            return f"{int(boroid)}{int(block):05d}{int(lot):04d}"
        except Exception:
            return None

    def fetch(
            self,
            limit: int = 5000,
            offset: int = 0,
            select: Optional[List[str]] = None,
            where: Optional[str] = None,
            order: str = "project_start_date DESC",
            start_from: str = "2010-01-01",
            start_to: Optional[str] = None,
            construction_type: Optional[str] = None,
            extra: Optional[Dict[str, Any]] = None,
    ) -> List[Dict[str, Any]]:
        try:
            params = self._build_params(
                select=select, where=where, order=order,
                limit=limit, offset=offset,
                start_from=start_from, start_to=start_to,
                construction_type=construction_type,
                extra=extra,
            )
            print(f"[AffordableHousingCrawler] Fetching with params: {params}")
            data = self._request(params)
        except Exception as e:
            print(f"[AffordableHousingCrawler] Fetch failed: {e}")
            return []

        available = self._discover_schema()
        resolved = self._build_resolution_map()

        def avail(name: Optional[str]) -> Optional[str]:
            return name if name and name in available else None

        mapped: List[Dict[str, Any]] = []

        for d in data:
            bbl = d.get(avail(resolved.get("bbl")))
            if not bbl:
                bbl = self._make_bbl_from_parts(
                    d.get(avail(resolved.get("boroid"))),
                    d.get(avail(resolved.get("block"))),
                    d.get(avail(resolved.get("lot"))),
                )

            row = {
                "project_id": self._to_int(d.get(avail(resolved.get("project_id")))),
                "bbl": bbl,
                "project_name": d.get(avail(resolved.get("project_name"))),
                "project_start_date": d.get(avail(resolved.get("project_start_date"))),
                "reporting_construction_type": d.get(avail(resolved.get("reporting_construction_type"))),
                "extended_affordability_status": d.get(avail(resolved.get("extended_affordability_status"))),
                "prevailing_wage_status": d.get(avail(resolved.get("prevailing_wage_status"))),
                "extremely_low_income_units": self._to_int(d.get(avail(resolved.get("extremely_low_income_units")))),
                "very_low_income_units": self._to_int(d.get(avail(resolved.get("very_low_income_units")))),
                "low_income_units": self._to_int(d.get(avail(resolved.get("low_income_units")))),
                "counted_rental_units": self._to_int(d.get(avail(resolved.get("counted_rental_units")))),
                "all_counted_units": self._to_int(d.get(avail(resolved.get("all_counted_units")))),
                "total_units": self._to_int(d.get(avail(resolved.get("total_units")))),
            }
            mapped.append(row)

        print(f"[AffordableHousingCrawler] Fetched {len(mapped)} rows.")
        return mapped

    def load(self, rows: List[Dict[str, Any]]) -> None:
        if not rows:
            print(f"[{self.__class__.__name__}] No data to insert.")
            return
        with PostgresClient() as db:
            try:
                count = db.bulk_insert(
                    self.TABLE_NAME,
                    self.COLUMNS,
                    rows,
                    conflict_target=self.CONFLICT_TARGET,
                )
                print(f"[{self.__class__.__name__}] Inserted {count} rows into {self.TABLE_NAME}.")
            except DatabaseError as e:
                print(f"[{self.__class__.__name__}] Insert failed: {e}")
                raise