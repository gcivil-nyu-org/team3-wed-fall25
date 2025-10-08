import time, requests
from typing import Any, Dict, List, Optional, Set
from infrastructures.postgres.postgres_client import PostgresClient
from common.interfaces.data_crawler import DataCrawler
from common.exceptions.db_error import DatabaseError

class AcrisLegalsCrawler(DataCrawler):
    TABLE_NAME = "building_acris_legals"
    API_URL = "https://data.cityofnewyork.us/resource/8h5j-fqxa.json"
    CONFLICT_TARGET = ["document_id","borough","block","lot"]

    COLUMNS = ["document_id","borough","block","lot","bbl"]

    FIELD_CANDIDATES = {
        "document_id": ["document_id","documentid"],
        "borough": ["borough","b"],
        "block": ["block"],
        "lot": ["lot"],
    }
    DEFAULT_SELECT = ["document_id","documentid","borough","block","lot"]

    def __init__(self, timeout:int=30, max_retries:int=3):
        self.timeout,self.max_retries=timeout,max_retries
        self._avail: Optional[Set[str]]=None
        self._res: Optional[Dict[str,Optional[str]]]=None

    def _headers(self): return {"Accept":"application/json","User-Agent":"AcrisLegals/1.0"}
    def _req(self, params:Dict[str,Any])->List[Dict[str,Any]]:
        backoff=1.0
        for i in range(1,self.max_retries+1):
            r=requests.get(self.API_URL,params=params,headers=self._headers(),timeout=self.timeout)
            if r.ok: return r.json()
            if r.status_code in (429,500,502,503,504):
                print(f"[AcrisLegals] attempt {i} {r.status_code} retry {backoff:.1f}s"); time.sleep(backoff); backoff*=2; continue
            raise requests.HTTPError(f"{r.status_code} {r.reason}: {r.text[:300]}")
        return []
    def _discover(self)->Set[str]:
        if self._avail is not None: return self._avail
        d=self._req({"$limit":1}); self._avail=set(d[0].keys()) if d else set()
        print(f"[AcrisLegals] fields: {sorted(self._avail)}"); return self._avail
    def _resolve(self)->Dict[str,Optional[str]]:
        if self._res is not None: return self._res
        a=self._discover(); self._res={k:next((c for c in v if c in a),None) for k,v in self.FIELD_CANDIDATES.items()}
        print(f"[AcrisLegals] map: {self._res}"); return self._res

    @staticmethod
    def _to_int(v):
        try: return int(v) if v not in (None,"") else None
        except: return None
    @staticmethod
    def _make_bbl(borough:Any, block:Any, lot:Any)->Optional[str]:
        if borough in (None,"","0") or block in (None,"","0") or lot in (None,"","0"): return None
        try: return f"{int(borough)}{int(block):05d}{int(lot):04d}"
        except: return None

    def fetch(self, limit:int=5000, offset:int=0)->List[Dict[str,Any]]:
        a=self._discover()
        sel=",".join([c for c in self.DEFAULT_SELECT if c in a]) or None
        params={"$limit":limit,"$offset":offset};
        if sel: params["$select"]=sel
        print(f"[AcrisLegals] params: {params}")
        try: data=self._req(params)
        except Exception as e: print(f"[AcrisLegals] Fetch failed: {e}"); return []
        res=self._resolve(); g=lambda n: (res.get(n) if res.get(n) in a else None)
        out=[]
        for d in data:
            doc_id=d.get(g("document_id"))
            if not doc_id: continue
            borough=self._to_int(d.get(g("borough"))); block=self._to_int(d.get(g("block"))); lot=self._to_int(d.get(g("lot")))
            out.append({
                "document_id": doc_id,
                "borough": borough,
                "block": block,
                "lot": lot,
                "bbl": self._make_bbl(borough, block, lot),
            })
        print(f"[AcrisLegals] fetched {len(out)}")
        return out

    def load(self, rows: List[Dict[str,Any]])->None:
        if not rows: print("[AcrisLegals] No data"); return
        with PostgresClient() as db:
            try:
                c=db.bulk_insert(self.TABLE_NAME,self.COLUMNS,rows,conflict_target=self.CONFLICT_TARGET)
                print(f"[AcrisLegals] Inserted {c}")
            except DatabaseError as e:
                print(f"[AcrisLegals] Insert failed: {e}"); raise