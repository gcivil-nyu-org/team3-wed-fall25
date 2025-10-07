from __future__ import annotations
from dataclasses import dataclass, field
from typing import Optional, List, Dict
from datetime import datetime
from decimal import Decimal

@dataclass
class RegistrationContact:
    registration_contact_id: int
    registration_id: Optional[int]
    type: Optional[str]
    contact_description: Optional[str]
    first_name: Optional[str]
    last_name: Optional[str]
    corporation_name: Optional[str]
    business_house_number: Optional[str]
    business_street_name: Optional[str]
    business_city: Optional[str]
    business_state: Optional[str]
    business_zip: Optional[str]
    business_apartment: Optional[str]