# crawlers/registration_contact_crawler.py
import time
from typing import Any, Dict, List, Optional, Set

import requests

from common.exceptions.db_error import DatabaseError
from common.interfaces.data_crawler import DataCrawler
from infrastructures.postgres.postgres_client import PostgresClient


class RegistrationContactCrawler(DataCrawler):

    TABLE_NAME = "building_registration_contacts"
    API_URL = "https://data.cityofnewyork.us/resource/feu5-w2e2.json"

    COLUMNS = [
        "registration_contact_id",
        "registration_id",
        "type",
        "contact_description",
        "first_name",
        "last_name",
        "corporation_name",
        "business_house_number",
        "business_street_name",
        "business_city",
        "business_state",
        "business_zip",
        "business_apartment",
    ]

    CONFLICT_TARGET = ["registration_contact_id"]

    FIELD_CANDIDATES: Dict[str, List[str]] = {
        "registration_contact_id": ["registration_contact_id", "registrationcontactid"],
        "registration_id": ["registration_id", "registrationid"],
        "type": ["type"],
        "contact_description": ["contact_description", "contactdescription"],
        "first_name": ["first_name", "firstname"],
        "last_name": ["last_name", "lastname"],
        "corporation_name": ["corporation_name", "corporationname"],
        "business_house_number": ["business_house_number", "businesshousenumber"],
        "business_street_name": ["business_street_name", "businessstreetname"],
        "business_city": ["business_city", "businesscity"],
        "business_state": ["business_state", "businessstate"],
        "business_zip": ["business_zip", "businesszip"],
        "business_apartment": ["business_apartment", "businessapartment"],
    }

    DEFAULT_SELECT_CANDIDATES = [
        "registration_contact_id",
        "registrationcontactid",
        "registration_id",
        "registrationid",
        "type",
        "contact_description",
        "contactdescription",
        "first_name",
        "firstname",
        "last_name",
        "lastname",
        "corporation_name",
        "corporationname",
        "business_house_number",
        "businesshousenumber",
        "business_street_name",
        "businessstreetname",
        "business_city",
        "businesscity",
        "business_state",
        "businessstate",
        "business_zip",
        "businesszip",
        "business_apartment",
        "businessapartment",
    ]

    def __init__(self, timeout: int = 30, max_retries: int = 3):
        self.timeout = timeout
        self.max_retries = max_retries
        self._available_fields: Optional[Set[str]] = None
        self._resolved_map: Optional[Dict[str, Optional[str]]] = None

    def _headers(self) -> Dict[str, str]:
        return {
            "Accept": "application/json",
            "User-Agent": "RegistrationContactCrawler/1.0",
        }

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
                    f"[RegistrationContactCrawler] attempt {attempt} -> {resp.status_code}, retry in {backoff:.1f}s"
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
        fields: Set[str] = set(data[0].keys()) if data else set()
        self._available_fields = fields
        print(f"[RegistrationContactCrawler] discovered fields: {sorted(fields)}")
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
        print(f"[RegistrationContactCrawler] resolved map: {resolved}")
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
        registration_id: Optional[int] = None,
        contact_type: Optional[str] = None,
        state: Optional[str] = None,
        city: Optional[str] = None,
        zip_code: Optional[str] = None,
        name_like: Optional[str] = None,  # first/last/corporation LIKE 검색
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

        def add_eq(col_logical: str, value: Optional[str]):
            col = resolved.get(col_logical)
            if value is not None and col:
                where_clauses.append(f"{col} = '{value}'")

        if registration_id is not None and resolved.get("registration_id"):
            where_clauses.append(
                f"{resolved['registration_id']} = {int(registration_id)}"
            )

        add_eq("type", contact_type)
        add_eq("business_state", state)
        add_eq("business_city", city)
        add_eq("business_zip", zip_code)

        like_terms = []
        if name_like:
            for logical in ("first_name", "last_name", "corporation_name"):
                col = resolved.get(logical)
                if col:
                    like_terms.append(f"upper({col}) like upper('%{name_like}%')")
        if like_terms:
            where_clauses.append("(" + " OR ".join(like_terms) + ")")

        if where_clauses:
            params["$where"] = " AND ".join(where_clauses)

        if order:
            params["$order"] = order
        else:
            order_col = resolved.get("registration_contact_id") or (
                "registrationcontactid"
                if "registrationcontactid" in available
                else None
            )
            if order_col:
                params["$order"] = f"{order_col} DESC"

        params["$limit"] = limit
        params["$offset"] = offset

        if extra:
            params.update(extra)

        return params

    def fetch(
        self,
        limit: int = 5000,
        offset: int = 0,
        *,
        select: Optional[List[str]] = None,
        where: Optional[str] = None,
        order: Optional[str] = None,
        registration_id: Optional[int] = None,
        contact_type: Optional[str] = None,
        state: Optional[str] = None,
        city: Optional[str] = None,
        zip_code: Optional[str] = None,
        name_like: Optional[str] = None,
        extra: Optional[Dict[str, Any]] = None,
    ) -> List[Dict[str, Any]]:
        try:
            params = self._build_params(
                select=select,
                where=where,
                order=order,
                limit=limit,
                offset=offset,
                registration_id=registration_id,
                contact_type=contact_type,
                state=state,
                city=city,
                zip_code=zip_code,
                name_like=name_like,
                extra=extra,
            )
            print(f"[RegistrationContactCrawler] Fetching with params: {params}")
            data = self._request(params)
        except Exception as e:
            print(f"[RegistrationContactCrawler] Fetch failed: {e}")
            return []

        available = self._discover_schema()
        resolved = self._build_resolution_map()

        def avail(name: Optional[str]) -> Optional[str]:
            return name if name and name in available else None

        mapped: List[Dict[str, Any]] = []

        for d in data:
            row = {
                "registration_contact_id": self._to_int(
                    d.get(avail(resolved.get("registration_contact_id")))
                ),
                "registration_id": self._to_int(
                    d.get(avail(resolved.get("registration_id")))
                ),
                "type": d.get(avail(resolved.get("type"))),
                "contact_description": d.get(
                    avail(resolved.get("contact_description"))
                ),
                "first_name": d.get(avail(resolved.get("first_name"))),
                "last_name": d.get(avail(resolved.get("last_name"))),
                "corporation_name": d.get(avail(resolved.get("corporation_name"))),
                "business_house_number": d.get(
                    avail(resolved.get("business_house_number"))
                ),
                "business_street_name": d.get(
                    avail(resolved.get("business_street_name"))
                ),
                "business_city": d.get(avail(resolved.get("business_city"))),
                "business_state": d.get(avail(resolved.get("business_state"))),
                "business_zip": d.get(avail(resolved.get("business_zip"))),
                "business_apartment": d.get(avail(resolved.get("business_apartment"))),
            }
            mapped.append(row)

        print(f"[RegistrationContactCrawler] Fetched {len(mapped)} rows.")
        return mapped

    def load(self, rows: List[Dict[str, Any]]) -> None:
        if not rows:
            print(f"[{self.__class__.__name__}] No data to insert.")
            return
        with PostgresClient() as db:
            try:
                conflict_target = getattr(self, "CONFLICT_TARGET", None)
                count = db.bulk_insert(
                    self.TABLE_NAME,
                    self.COLUMNS,
                    rows,
                    conflict_target=conflict_target,
                )
                print(
                    f"[{self.__class__.__name__}] Inserted {count} rows into {self.TABLE_NAME}."
                )
            except DatabaseError as e:
                print(f"[{self.__class__.__name__}] Insert failed: {e}")
                raise

    @staticmethod
    def _to_int(v):
        try:
            return int(v) if v not in (None, "") else None
        except Exception:
            return None
