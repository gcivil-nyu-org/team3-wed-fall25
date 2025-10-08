from __future__ import annotations
from dataclasses import dataclass, field
from typing import Optional, List, Dict
from decimal import Decimal

from common.models.acris import AcrisLegal, AcrisParty, AcrisMaster
from common.models.affordable_housing_record import AffordableHousingRecord
from common.models.complaint import Complaint
from common.models.eviction import Eviction
from common.models.registration import Registration
from common.models.registration_contact import RegistrationContact
from common.models.rent_stabilized_tag import RentStabilizedTag
from common.models.violation import Violation


@dataclass
class Building:
    bbl: str
    registration: Optional[Registration] = None
    rent_stabilized: Optional[RentStabilizedTag] = None
    contacts: List[RegistrationContact] = field(default_factory=list)
    affordable: List[AffordableHousingRecord] = field(default_factory=list)
    complaints: List[Complaint] = field(default_factory=list)
    violations: List[Violation] = field(default_factory=list)
    acris_master: Dict[str, AcrisMaster] = field(default_factory=dict)
    acris_legals: Dict[str, List[AcrisLegal]] = field(default_factory=dict)
    acris_parties: Dict[str, List[AcrisParty]] = field(default_factory=dict)
    evictions: List[Eviction] = field(default_factory=list)

    def set_registration(self, r: Registration):
        if r and r.bbl == self.bbl:
            self.registration = r

    def set_rent_stabilized(self, tag: RentStabilizedTag):
        if tag and tag.bbl == self.bbl:
            self.rent_stabilized = tag

    def add_contact(self, c: RegistrationContact):
        self.contacts.append(c)

    def add_affordable(self, a: AffordableHousingRecord):
        if a and all(x.project_id != a.project_id for x in self.affordable):
            self.affordable.append(a)

    def add_complaint(self, c: Complaint):
        if c and all(x.complaint_id != c.complaint_id for x in self.complaints):
            self.complaints.append(c)

    def add_violation(self, v: Violation):
        if v and all(x.violation_id != v.violation_id for x in self.violations):
            if v.class_ is None and hasattr(v, "class"):
                v.class_ = getattr(v, "class")
            self.violations.append(v)

    def add_eviction(self, e: Eviction):
        if not e:
            return
        key = (e.docket_number or "", e.court_index_number or "")
        exists = any((x.docket_number or "", x.court_index_number or "") == key for x in self.evictions)
        if not exists:
            self.evictions.append(e)

    def upsert_acris_master(self, m: AcrisMaster):
        if m and m.document_id:
            self.acris_master[m.document_id] = m

    def add_acris_legal(self, l: AcrisLegal):
        if l and l.document_id:
            self.acris_legals.setdefault(l.document_id, []).append(l)

    def add_acris_party(self, p: AcrisParty):
        if p and p.document_id:
            self.acris_parties.setdefault(p.document_id, []).append(p)

def as_registration(row: dict) -> Registration:
    return Registration(**row)

def as_registration_contact(row: dict) -> RegistrationContact:
    return RegistrationContact(**row)

def as_affordable(row: dict) -> AffordableHousingRecord:
    return AffordableHousingRecord(**row)

def as_complaint(row: dict) -> Complaint:
    return Complaint(**row)

def as_violation(row: dict) -> Violation:
    if "class" in row and "class_" not in row:
        row = {**row, "class_": row["class"]}
        row.pop("class")
    return Violation(**row)

def as_eviction(row: dict) -> Eviction:
    return Eviction(**row)

def as_acris_master(row: dict) -> AcrisMaster:
    amt = row.get("doc_amount")
    if isinstance(amt, str):
        try:
            row = {**row, "doc_amount": Decimal(amt)}
        except Exception:
            row = {**row, "doc_amount": None}
    return AcrisMaster(**row)

def as_acris_legal(row: dict) -> AcrisLegal:
    return AcrisLegal(**row)

def as_acris_party(row: dict) -> AcrisParty:
    return AcrisParty(**row)

def as_rent_tag(row: dict) -> RentStabilizedTag:
    return RentStabilizedTag(**row)

def build_building_from_rows(
    bbl: str,
    reg_row: Optional[dict],
    contact_rows: List[dict],
    affordable_rows: List[dict],
    complaint_rows: List[dict],
    violation_rows: List[dict],
    acris_master_rows: List[dict],
    acris_legal_rows: List[dict],
    acris_party_rows: List[dict],
    rent_tag_row: Optional[dict] = None,
    eviction_rows: Optional[List[dict]] = None,
) -> Building:
    b = Building(bbl=bbl)
    if reg_row:
        b.set_registration(as_registration(reg_row))
    if rent_tag_row:
        b.set_rent_stabilized(as_rent_tag(rent_tag_row))
    for r in contact_rows:
        b.add_contact(as_registration_contact(r))
    for a in affordable_rows:
        b.add_affordable(as_affordable(a))
    for c in complaint_rows:
        b.add_complaint(as_complaint(c))
    for v in violation_rows:
        b.add_violation(as_violation(v))
    for m in acris_master_rows:
        b.upsert_acris_master(as_acris_master(m))
    for l in acris_legal_rows:
        b.add_acris_legal(as_acris_legal(l))
    for p in acris_party_rows:
        b.add_acris_party(as_acris_party(p))
    if eviction_rows:
        for e in eviction_rows:
            b.add_eviction(as_eviction(e))
    return b