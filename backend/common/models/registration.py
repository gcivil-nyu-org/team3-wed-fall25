from __future__ import annotations
from dataclasses import dataclass, field
from typing import Optional, List, Dict
from datetime import datetime
from decimal import Decimal

@dataclass
class Registration:
    bbl: str
    bin: Optional[int] = None
    boro_id: Optional[int] = None
    boro: Optional[str] = None
    block: Optional[int] = None
    lot: Optional[int] = None
    house_number: Optional[str] = None
    street_name: Optional[str] = None
    zip: Optional[str] = None
    community_board: Optional[int] = None
    last_registration_date: Optional[datetime] = None
    registration_end_date: Optional[datetime] = None
    registration_id: Optional[int] = None
    building_id: Optional[int] = None