import csv
from typing import Any, Dict, List, Optional

from common.exceptions.db_error import DatabaseError
from common.interfaces.data_crawler import DataCrawler
from infrastructures.postgres.building_repository import BuildingRepository
from infrastructures.postgres.postgres_client import PostgresClient


class PlutoCrawer(DataCrawler):
    TABLE_NAME = "building_pluto"
    CSV_PATH = r"c:\data\pluto_25v3.csv"
    CONFLICT_TARGET = ["bbl"]

    COLUMNS = [
        "bbl",
        "borough",
        "block",
        "lot",
        "borocode",
        "plutomapid",
        "address",
        "zipcode",
        "latitude",
        "longitude",
        "xcoord",
        "ycoord",
        "cd",
        "council",
        "schooldist",
        "policeprct",
        "firecomp",
        "lotarea",
        "bldgarea",
        "comarea",
        "resarea",
        "officearea",
        "retailarea",
        "garagearea",
        "strgearea",
        "factryarea",
        "otherarea",
        "numbldgs",
        "numfloors",
        "unitsres",
        "unitstotal",
        "lotfront",
        "lotdepth",
        "bldgfront",
        "bldgdepth",
        "yearbuilt",
        "yearalter1",
        "yearalter2",
        "ownertype",
        "ownername",
        "assessland",
        "assesstot",
        "exempttot",
    ]

    def __init__(self, csv_path: Optional[str] = None):
        # 필요하면 경로 오버라이드 가능
        if csv_path is not None:
            self.CSV_PATH = csv_path

    # --------- helpers ----------

    @staticmethod
    def _none_if_empty(v: Any) -> Optional[str]:
        if v is None:
            return None
        v = str(v).strip()
        return v if v != "" else None

    @staticmethod
    def _to_int(v: Any) -> Optional[int]:
        v = PlutoCrawer._none_if_empty(v)
        if v is None:
            return None
        try:
            return int(float(v))
        except Exception:
            return None

    @staticmethod
    def _to_float(v: Any) -> Optional[float]:
        v = PlutoCrawer._none_if_empty(v)
        if v is None:
            return None
        try:
            return float(v)
        except Exception:
            return None

    # --------- core interface ----------

    def fetch(self, limit: int = 5000, offset: int = 0) -> List[Dict[str, Any]]:
        rows: List[Dict[str, Any]] = []
        try:
            with open(self.CSV_PATH, newline="", encoding="utf-8") as f:
                reader = csv.DictReader(f)

                # offset 만큼 건너뛰기
                for _ in range(offset):
                    next(reader, None)

                for i, raw in enumerate(reader):
                    if i >= limit:
                        break

                    bbl = self._to_int(raw.get("bbl"))
                    if bbl is None:
                        # bbl 없는 데이터는 스킵
                        continue

                    row: Dict[str, Any] = {
                        "bbl": bbl,
                        "borough": self._none_if_empty(raw.get("borough")),
                        "block": self._to_int(raw.get("block")),
                        "lot": self._to_int(raw.get("lot")),
                        "borocode": self._to_int(raw.get("borocode")),
                        "plutomapid": self._none_if_empty(raw.get("plutomapid")),
                        "address": self._none_if_empty(raw.get("address")),
                        "zipcode": self._none_if_empty(raw.get("zipcode")),
                        "latitude": self._to_float(raw.get("latitude")),
                        "longitude": self._to_float(raw.get("longitude")),
                        "xcoord": self._to_int(raw.get("xcoord")),
                        "ycoord": self._to_int(raw.get("ycoord")),
                        "cd": self._to_int(raw.get("cd")),
                        "council": self._to_int(raw.get("council")),
                        "schooldist": self._to_int(raw.get("schooldist")),
                        "policeprct": self._to_int(raw.get("policeprct")),
                        "firecomp": self._none_if_empty(raw.get("firecomp")),
                        "lotarea": self._to_int(raw.get("lotarea")),
                        "bldgarea": self._to_int(raw.get("bldgarea")),
                        "comarea": self._to_int(raw.get("comarea")),
                        "resarea": self._to_int(raw.get("resarea")),
                        "officearea": self._to_int(raw.get("officearea")),
                        "retailarea": self._to_int(raw.get("retailarea")),
                        "garagearea": self._to_int(raw.get("garagearea")),
                        "strgearea": self._to_int(raw.get("strgearea")),
                        "factryarea": self._to_int(raw.get("factryarea")),
                        "otherarea": self._to_int(raw.get("otherarea")),
                        "numbldgs": self._to_int(raw.get("numbldgs")),
                        "numfloors": self._to_float(raw.get("numfloors")),
                        "unitsres": self._to_int(raw.get("unitsres")),
                        "unitstotal": self._to_int(raw.get("unitstotal")),
                        "lotfront": self._to_float(raw.get("lotfront")),
                        "lotdepth": self._to_float(raw.get("lotdepth")),
                        "bldgfront": self._to_float(raw.get("bldgfront")),
                        "bldgdepth": self._to_float(raw.get("bldgdepth")),
                        "yearbuilt": self._to_int(raw.get("yearbuilt")),
                        "yearalter1": self._to_int(raw.get("yearalter1")),
                        "yearalter2": self._to_int(raw.get("yearalter2")),
                        "ownertype": self._none_if_empty(raw.get("ownertype")),
                        "ownername": self._none_if_empty(raw.get("ownername")),
                        "assessland": self._to_float(raw.get("assessland")),
                        "assesstot": self._to_float(raw.get("assesstot")),
                        "exempttot": self._to_float(raw.get("exempttot")),
                    }

                    rows.append(row)

        except FileNotFoundError:
            print(f"[PlutoCrawer] CSV file not found: {self.CSV_PATH}")
        except Exception as e:
            print(f"[PlutoCrawer] Fetch failed: {e}")

        print(f"[PlutoCrawer] fetched {len(rows)} rows (offset={offset}, limit={limit})")
        return rows

    def load(self, rows: List[Dict[str, Any]]) -> None:
        if not rows:
            print("[PlutoCrawer] No data")
            return

        with PostgresClient() as db:
            try:
                c = db.bulk_insert(
                    self.TABLE_NAME,
                    self.COLUMNS,
                    rows,
                    conflict_target=self.CONFLICT_TARGET,
                )
                print(f"[PlutoCrawer] Inserted/updated {c} rows")
            except DatabaseError as e:
                print(f"[PlutoCrawer] Insert failed: {e}")
                raise

if __name__ == "__main__":
    # crawler = PlutoCrawer()
    #
    # limit = 50000
    # offset = 0
    #
    # while True:
    #     rows = crawler.fetch(limit=limit, offset=offset)
    #     if not rows:
    #         break
    #
    #     crawler.load(rows)
    #     offset += limit
    #     print("offset", offset)

    repository = BuildingRepository()
    pluto = repository.get_pluto_by_bbl("2049410033")
    print(pluto)
