import time
from typing import Any, Dict, List, Optional, Set

import requests

from common.exceptions.db_error import DatabaseError
from common.interfaces.data_crawler import DataCrawler
from infrastructures.postgres.postgres_client import PostgresClient


class EvictionCrawler(DataCrawler):
    TABLE_NAME = "building_evictions"
    API_URL = "https://data.cityofnewyork.us/resource/6z8x-wfk4.json"
    CONFLICT_TARGET = ["docket_number", "court_index_number"]

    # DB 컬럼 순서 (PRIMARY KEY 제외)
    COLUMNS = [
        "docket_number",
        "court_index_number",
        "bbl",
        "bin",
        "borough",
        "eviction_zip",
        "eviction_address",
        "eviction_apt_num",
        "community_board",
        "council_district",
        "census_tract",
        "nta",
        "latitude",
        "longitude",
        "executed_date",
        "residential_commercial_ind",
        "ejectment",
        "eviction_possession",
        "marshal_first_name",
        "marshal_last_name",
    ]

    # 논리명 -> API 필드명 후보 (스키마 자동 해석용)
    FIELD_CANDIDATES: Dict[str, List[str]] = {
        "docket_number": ["docket_number"],
        "court_index_number": ["court_index_number"],
        "bbl": ["bbl"],
        "bin": ["bin"],
        "borough": ["borough", "BOROUGH"],
        "eviction_zip": ["eviction_zip", "zip", "zipcode", "eviction_postcode"],
        "eviction_address": ["eviction_address", "address"],
        "eviction_apt_num": ["eviction_apt_num", "apartment", "apt"],
        "community_board": ["community_board"],
        "council_district": ["council_district"],
        "census_tract": ["census_tract"],
        "nta": ["nta"],
        "latitude": ["latitude"],
        "longitude": ["longitude"],
        "executed_date": ["executed_date"],
        "residential_commercial_ind": ["residential_commercial_ind"],
        "ejectment": ["ejectment"],
        "eviction_possession": ["eviction_possession"],
        "marshal_first_name": ["marshal_first_name"],
        "marshal_last_name": ["marshal_last_name"],
    }

    # 성능을 위해 SELECT에 넣을 기본 후보 (실제 API 스키마에 존재하는 것만 선택됨)
    DEFAULT_SELECT_CANDIDATES = [
        "docket_number",
        "court_index_number",
        "bbl",
        "bin",
        "borough",
        "eviction_zip",
        "eviction_address",
        "eviction_apt_num",
        "community_board",
        "council_district",
        "census_tract",
        "nta",
        "latitude",
        "longitude",
        "executed_date",
        "residential_commercial_ind",
        "ejectment",
        "eviction_possession",
        "marshal_first_name",
        "marshal_last_name",
    ]

    def __init__(self, timeout: int = 30, max_retries: int = 3):
        self.timeout = timeout
        self.max_retries = max_retries
        self._available_fields: Optional[Set[str]] = None
        self._resolved_map: Optional[Dict[str, Optional[str]]] = None

    def _headers(self) -> Dict[str, str]:
        # 원본 코드 스타일 유지
        return {"Accept": "application/json", "User-Agent": "EvictionCrawler/1.0"}

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
                    f"[EvictionCrawler] attempt {attempt} -> {resp.status_code}, retry in {backoff:.1f}s"
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

        # 여러 행을 스캔해서 키 합집합을 모은다 (널 컬럼 키 누락 문제 방지)
        sample_limit = 50  # 필요 시 100~200까지 늘려도 OK (성능/정확도 트레이드오프)
        try:
            sample = self._request({"$limit": sample_limit})
        except Exception as e:
            print(f"[{self.__class__.__name__}] Schema discovery failed: {e}")
            sample = []

        fields: Set[str] = set()
        for row in sample or []:
            # Socrata는 널 컬럼 키를 생략하므로, 여러 행의 키를 합친다
            fields.update(row.keys())

        # 최소 안정장치: FIELD_CANDIDATES 중 API가 실제로 줄 수 있는 키가
        # 하나도 감지되지 않았다면, 후보명을 그대로 추가(보수적으로)
        if not fields:
            for cands in self.FIELD_CANDIDATES.values():
                fields.update(cands)

        self._available_fields = fields
        print(f"[{self.__class__.__name__}] discovered fields: {sorted(fields)}")
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
        print(f"[EvictionCrawler] resolved map: {resolved}")
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
        self._discover_schema()

        date_col = resolved.get("executed_date")
        if start_from and date_col:
            where_clauses.append(f"{date_col} >= '{start_from}T00:00:00.000'")
        if start_to and date_col:
            where_clauses.append(f"{date_col} < '{start_to}T23:59:59.999'")

        if where_clauses:
            params["$where"] = " AND ".join(where_clauses)

        # 정렬 기본값
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
    def _to_float(v):
        try:
            return float(v) if v not in (None, "") else None
        except Exception:
            return None

    # 1) fetch 시그니처에 debug 파라미터 추가
    def fetch(
        self,
        limit: int = 5000,
        offset: int = 0,
        select: Optional[List[str]] = None,
        where: Optional[str] = None,
        order: str = "executed_date DESC",
        start_from: str = "2010-01-01",
        start_to: Optional[str] = None,
        extra: Optional[Dict[str, Any]] = None,
        *,
        debug: bool = False,  # <= 추가
    ) -> List[Dict[str, Any]]:
        try:
            # 2) 디버그: 샘플 5건을 풀 필드로 찍어보기 (select를 의도적으로 생략)
            debug = False
            if debug:
                sample_params: Dict[str, Any] = {"$limit": 5, "$offset": 0}
                # 기간 필터는 동일하게 적용(정렬/선택은 생략)
                resolved_dbg = self._build_resolution_map()
                date_col_dbg = resolved_dbg.get("executed_date")
                where_clauses_dbg: List[str] = []
                if start_from and date_col_dbg:
                    where_clauses_dbg.append(
                        f"{date_col_dbg} >= '{start_from}T00:00:00.000'"
                    )
                if start_to and date_col_dbg:
                    where_clauses_dbg.append(
                        f"{date_col_dbg} < '{start_to}T23:59:59.999'"
                    )
                if where_clauses_dbg:
                    sample_params["$where"] = " AND ".join(where_clauses_dbg)

                print(
                    "[EvictionCrawler][DEBUG] Sampling 5 rows with ALL fields (no $select)…"
                )
                sample = self._request(sample_params)
                if not sample:
                    print("[EvictionCrawler][DEBUG] Sample returned 0 rows.")
                else:
                    # 키 집합과 BBL 존재 여부 요약
                    all_keys = set()
                    for r in sample:
                        all_keys.update(r.keys())
                    print(
                        f"[EvictionCrawler][DEBUG] Keys in sample: {sorted(all_keys)}"
                    )

                    # 샘플 3건만 이쁘게 출력
                    from pprint import pformat

                    for i, r in enumerate(sample[:3]):
                        print(f"[EvictionCrawler][DEBUG] Row[{i}]: {pformat(r)}")

                    # BBL 존재 비율
                    bbl_present = sum(1 for r in sample if r.get("bbl"))
                    print(
                        f"[EvictionCrawler][DEBUG] bbl present {bbl_present}/{len(sample)} rows in sample."
                    )

            # 기존 파라미터 구성 및 페치
            params = self._build_params(
                select=select,
                where=where,
                order=order,
                limit=limit,
                offset=offset,
                start_from=start_from,
                start_to=start_to,
                extra=extra,
            )
            print(f"[EvictionCrawler] Fetching with params: {params}")
            data = self._request(params)
        except Exception as e:
            print(f"[EvictionCrawler] Fetch failed: {e}")
            return []

        available = self._discover_schema()
        resolved = self._build_resolution_map()

        def avail(name: Optional[str]) -> Optional[str]:
            return name if name and name in available else None

        # 디버그: 이번 배치에서 해석된 bbl 컬럼명 기준 존재 비율
        if debug:
            bbl_col = avail(resolved.get("bbl"))
            if bbl_col is None:
                print(
                    "[EvictionCrawler][DEBUG] Resolved bbl column is None (dataset doesn’t expose bbl)."
                )
            else:
                bbl_present_batch = sum(1 for r in data if r.get(bbl_col))
                print(
                    f"[EvictionCrawler][DEBUG] bbl present in fetched batch: {bbl_present_batch}/{len(data)}"
                )

        mapped: List[Dict[str, Any]] = []
        for d in data:
            row = {
                "docket_number": d.get(avail(resolved.get("docket_number"))),
                "court_index_number": d.get(avail(resolved.get("court_index_number"))),
                "bbl": d.get(avail(resolved.get("bbl"))),
                "bin": self._to_int(d.get(avail(resolved.get("bin")))),
                "borough": d.get(avail(resolved.get("borough"))),
                "eviction_zip": d.get(avail(resolved.get("eviction_zip"))),
                "eviction_address": d.get(avail(resolved.get("eviction_address"))),
                "eviction_apt_num": d.get(avail(resolved.get("eviction_apt_num"))),
                "community_board": self._to_int(
                    d.get(avail(resolved.get("community_board")))
                ),
                "council_district": self._to_int(
                    d.get(avail(resolved.get("council_district")))
                ),
                "census_tract": d.get(avail(resolved.get("census_tract"))),
                "nta": d.get(avail(resolved.get("nta"))),
                "latitude": self._to_float(d.get(avail(resolved.get("latitude")))),
                "longitude": self._to_float(d.get(avail(resolved.get("longitude")))),
                "executed_date": d.get(avail(resolved.get("executed_date"))),
                "residential_commercial_ind": d.get(
                    avail(resolved.get("residential_commercial_ind"))
                ),
                "ejectment": d.get(avail(resolved.get("ejectment"))),
                "eviction_possession": d.get(
                    avail(resolved.get("eviction_possession"))
                ),
                "marshal_first_name": d.get(avail(resolved.get("marshal_first_name"))),
                "marshal_last_name": d.get(avail(resolved.get("marshal_last_name"))),
            }
            mapped.append(row)

        print(f"[EvictionCrawler] Fetched {len(mapped)} rows.")
        return mapped

    def load(self, rows: List[Dict[str, Any]]) -> None:
        if not rows:
            print(f"[{self.__class__.__name__}] No data to insert.")
            return

        filtered = [r for r in rows if r.get("bbl")]
        skipped = len(rows) - len(filtered)
        if skipped > 0:
            print(
                f"[{self.__class__.__name__}] Skipped {skipped} rows with NULL/empty bbl."
            )

        if not filtered:
            print(f"[{self.__class__.__name__}] No rows left after filtering by bbl.")
            return

        with PostgresClient() as db:
            try:
                count = db.bulk_insert(
                    self.TABLE_NAME,
                    self.COLUMNS,
                    filtered,
                    conflict_target=self.CONFLICT_TARGET,
                )
                print(
                    f"[{self.__class__.__name__}] Inserted {count} rows into {self.TABLE_NAME}."
                )
            except DatabaseError as e:
                print(f"[{self.__class__.__name__}] Insert failed: {e}")
                raise
