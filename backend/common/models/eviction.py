from __future__ import annotations
from dataclasses import dataclass, field
from typing import Optional, List, Dict
from datetime import datetime
from decimal import Decimal

@dataclass
class Eviction:
    docket_number: Optional[str]
    court_index_number: Optional[str]
    bbl: Optional[str]
    bin: Optional[int]
    borough: Optional[str]
    eviction_zip: Optional[str]
    eviction_address: Optional[str]
    eviction_apt_num: Optional[str]
    community_board: Optional[int]
    council_district: Optional[int]
    census_tract: Optional[str]
    nta: Optional[str]
    latitude: Optional[float]
    longitude: Optional[float]
    executed_date: Optional[datetime]
    residential_commercial_ind: Optional[str]
    ejectment: Optional[str]
    eviction_possession: Optional[str]
    marshal_first_name: Optional[str]
    marshal_last_name: Optional[str]