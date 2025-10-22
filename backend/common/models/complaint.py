from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Optional


@dataclass
class Complaint:
    complaint_id: int
    bbl: Optional[str]
    borough: Optional[str]
    block: Optional[int]
    lot: Optional[int]
    problem_id: Optional[int]
    unit_type: Optional[str]
    space_type: Optional[str]
    type: Optional[str]
    major_category: Optional[str]
    minor_category: Optional[str]
    complaint_status: Optional[str]
    complaint_status_date: Optional[datetime]
    problem_status: Optional[str]
    problem_status_date: Optional[datetime]
    status_description: Optional[str]
    house_number: Optional[str]
    street_name: Optional[str]
    post_code: Optional[str]
    apartment: Optional[str]
