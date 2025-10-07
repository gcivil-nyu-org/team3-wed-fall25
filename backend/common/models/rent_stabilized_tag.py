from __future__ import annotations
from dataclasses import dataclass, field
from typing import Optional, List, Dict

@dataclass
class RentStabilizedTag:
    bbl: str
    borough: Optional[str]
    block: Optional[int]
    lot: Optional[int]
    zip: Optional[str]
    city: Optional[str]
    status: Optional[str]
    source_year: Optional[int]