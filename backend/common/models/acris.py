from __future__ import annotations
from dataclasses import dataclass, field
from typing import Optional, List, Dict
from datetime import datetime
from decimal import Decimal

@dataclass
class AcrisMaster:
    document_id: str
    borough: Optional[int]
    doc_type: Optional[str]
    doc_date: Optional[datetime]
    doc_amount: Optional[Decimal]

@dataclass
class AcrisLegal:
    document_id: str
    bbl: Optional[str]
    borough: Optional[int]
    block: Optional[int]
    lot: Optional[int]

@dataclass
class AcrisParty:
    document_id: str
    party_type: Optional[str]
    name: Optional[str]
    address1: Optional[str]
    city: Optional[str]
    state: Optional[str]
    zip: Optional[str]

