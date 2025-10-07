from __future__ import annotations
from dataclasses import dataclass, field
from typing import Optional, List, Dict
from datetime import datetime
from decimal import Decimal


@dataclass
class AffordableHousingRecord:
    project_id: int
    bbl: Optional[str]
    project_name: Optional[str]
    project_start_date: Optional[datetime]
    reporting_construction_type: Optional[str]
    extended_affordability_status: Optional[str]
    prevailing_wage_status: Optional[str]
    extremely_low_income_units: Optional[int]
    very_low_income_units: Optional[int]
    low_income_units: Optional[int]
    counted_rental_units: Optional[int]
    all_counted_units: Optional[int]
    total_units: Optional[int]
