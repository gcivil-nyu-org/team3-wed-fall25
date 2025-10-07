from __future__ import annotations
from dataclasses import dataclass, field
from typing import Optional, List, Dict
from datetime import datetime
from decimal import Decimal

@dataclass
class Violation:
    violation_id: int
    bbl: Optional[str]
    bin: Optional[int]
    block: Optional[int]
    lot: Optional[int]
    boro: Optional[str]
    nov_description: Optional[str]
    nov_type: Optional[str]
    class_: Optional[str]
    rent_impairing: Optional[bool]
    violation_status: Optional[str]
    current_status: Optional[str]
    current_status_id: Optional[int]
    current_status_date: Optional[datetime]
    inspection_date: Optional[datetime]
    nov_issued_date: Optional[datetime]
    approved_date: Optional[datetime]
    house_number: Optional[str]
    street_name: Optional[str]
    apartment: Optional[str]
    story: Optional[str]
