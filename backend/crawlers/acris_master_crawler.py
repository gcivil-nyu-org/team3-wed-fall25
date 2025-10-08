# crawlers/acris_master_crawler.py
import time, requests
from typing import Any, Dict, List, Optional, Set
from infrastructures.postgres.postgres_client import PostgresClient
from common.interfaces.data_crawler import DataCrawler
from common.exceptions.db_error import DatabaseError

class AcrisMasterCrawler(DataCrawler):
    TABLE_NAME = "building_acris_master"
    API_URL = "https://data.cityofnewyork.us/resource/bnx9-e6tj.json"
    CONFLICT_TARGET = ["document_id"]

    COLUMNS = ["document_id","borough","doc_type","doc_date","doc_amount"]

    FIELD_CANDIDATES = {
        "document_id": ["document_id","documentid"],
        "borough": ["borough","b"],
        "doc_type": ["doc_type","doctype","document_type"],
        "doc_date": ["doc_date","document_date","recorded_date","recordeddatetime"],
        "doc_amount": ["doc_amount","document_amount","amount","doc_amt"],
    }
    DEFAULT_SELECT = sum(([x, y] if y else [x] for x,y in [
        ("document_id","documentid"),("borough",None),("doc_type","doctype"),
        ("doc_date","recorded_date"),("doc_amount","amount")]), [])

    def __init__(self, timeout: int = 30, max_retries: int = 3):
        self.timeout, self.max_retries = timeout, max_retries
        self._avail: Optional[Set[str]] = None
        self._res: Optional[Dict[str, Optional[str]]] = None

    def _headers(self): return {"Accept":"application/json","User-Agent":"AcrisMaster/1.0"}

    def _req(self, params: Dict[str,Any]) -> List[Dict[str,Any]]:
        backoff=1.0
        for i in range(1,self.max_retries+1):
            r=requests.get(self.API_URL,params=params,headers=self._headers(),timeout=self.timeout)
            if r.ok: return r.json()
            if r.status_code in (429,500,502,503,504):
                print(f"[AcrisMaster] attempt {i} {r.status_code} retry {backoff:.1f}s"); time.sleep(backoff); backoff*=2; continue
            raise requests.HTTPError(f"{r.status_code} {r.reason}: {r.text[:300]}")
        return []

    def _discover(self)->Set[str]:
        if self._avail is not None: return self._avail
        d=self._req({"$limit":1}); self._avail=set(d[0].keys()) if d else set()
        print(f"[AcrisMaster] fields: {sorted(self._avail)}"); return self._avail

    def _resolve(self)->Dict[str,Optional[str]]:
        if self._res is not None: return self._res
        avail=self._discover(); res={}
        for k,cands in self.FIELD_CANDIDATES.items():
            res[k]=next((c for c in cands if c in avail),None)
        self._res=res; print(f"[AcrisMaster] map: {res}"); return res

    def fetch(self, limit:int=5000, offset:int=0, order:Optional[str]=None)->List[Dict[str,Any]]:
        avail=self._discover()
        sel=",".join([c for c in self.DEFAULT_SELECT if c in avail]) or None
        params={"$limit":limit,"$offset":offset};
        if sel: params["$select"]=sel
        if order: params["$order"]=order
        print(f"[AcrisMaster] params: {params}")
        try: data=self._req(params)
        except Exception as e: print(f"[AcrisMaster] Fetch failed: {e}"); return []
        res=self._resolve()
        def g(n): return res.get(n) if res.get(n) in avail else None
        def to_int(v):
            try: return int(v) if v not in (None,"") else None
            except: return None
        def to_num(v):
            try: return float(v) if v not in (None,"") else None
            except: return None
        out=[]
        for d in data:
            doc_id=d.get(g("document_id"))
            if not doc_id: continue
            out.append({
                "document_id": doc_id,
                "borough": to_int(d.get(g("borough"))),
                "doc_type": d.get(g("doc_type")),
                "doc_date": d.get(g("doc_date")),
                "doc_amount": to_num(d.get(g("doc_amount"))),
            })
        print(f"[AcrisMaster] fetched {len(out)}")
        return out

    def load(self, rows: List[Dict[str,Any]])->None:
        if not rows: print("[AcrisMaster] No data"); return
        with PostgresClient() as db:
            try:
                c=db.bulk_insert(self.TABLE_NAME,self.COLUMNS,rows,conflict_target=self.CONFLICT_TARGET)
                print(f"[AcrisMaster] Inserted {c}")
            except DatabaseError as e:
                print(f"[AcrisMaster] Insert failed: {e}"); raise
