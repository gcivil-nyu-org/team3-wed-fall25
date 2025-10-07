from dataclasses import asdict
from decimal import Decimal
from datetime import datetime
import json

from infrastructures.postgres.building_repository import BuildingRepository  # 경로는 프로젝트 구조에 맞게 조정

def default_serializer(o):
    if isinstance(o, datetime):
        return o.isoformat()
    if isinstance(o, Decimal):
        return float(o)
    return str(o)

def main():
    repo = BuildingRepository()
    bbl = "1013510030"

    building = repo.get_by_bbl(bbl)

    print(f"BBL: {building.bbl}")
    if building.registration:
        print(f"Address: {building.registration.house_number} {building.registration.street_name}, ZIP={building.registration.zip}")
    if building.rent_stabilized:
        print(f"Rent-Stabilized: {building.rent_stabilized.status} (year={building.rent_stabilized.source_year})")

    print(f"Contacts: {len(building.contacts)}")
    print(f"Affordable records: {len(building.affordable)}")
    print(f"Complaints: {len(building.complaints)}")
    print(f"Violations: {len(building.violations)}")
    print(f"Evictions: {len(building.evictions)}")
    print(f"ACRIS docs: {len(building.acris_master)} "
          f"(legals={sum(len(v) for v in building.acris_legals.values())}, "
          f"parties={sum(len(v) for v in building.acris_parties.values())})")

    print("\n=== Full JSON ===")
    print(json.dumps(asdict(building), indent=2, default=default_serializer, ensure_ascii=False))

if __name__ == "__main__":
    main()
