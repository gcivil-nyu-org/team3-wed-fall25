# crawlers/acris_parties_crawler.py
import time, requests
from typing import Any, Dict, List, Optional, Set
from infrastructures.postgres.postgres_client import PostgresClient
from common.interfaces.data_crawler import DataCrawler
from common.exceptions.db_error import DatabaseError

class AcrisPartiesCrawler(DataCrawler):
    TABLE_NAME = "building_acris_parties"
    API_URL = "https://data.cityofnewyork.us/resource/636b-3b5g.json"
    CONFLICT_TARGET = ["document_id","party_type","name","address1"]

    COLUMNS = ["document_id","party_type","name","address1","city","state","zip"]

    FIELD_CANDIDATES = {
        "document_id": ["document_id","documentid"],
        "party_type": ["party_type","partytype"],
        "name": ["name"],
        "address1": ["address1","address_1"],
        "city": ["city"],
        "state": ["state"],
        "zip": ["zip","zipcode"],
    }
    DEFAULT_SELECT = ["document_id","documentid","party_type","partytype","name","address1","city","state","zip","zipcode"]

    def __init__(self, timeout:int=30, max_retries:int=3):
        self.timeout,self.max_retries=timeout,max_retries
        self._avail: Optional[Set[str]]=None
        self._res: Optional[Dict[str,Optional[str]]]=None

    def _headers(self): return {"Accept":"application/json","User-Agent":"AcrisParties/1.0"}
    def _req(self, params:Dict[str,Any])->List[Dict[str,Any]]:
        backoff=1.0
        for i in range(1,self.max_retries+1):
            r=requests.get(self.API_URL,params=params,headers=self._headers(),timeout=self.timeout)
            if r.ok: return r.json()
            if r.status_code in (429,500,502,503,504):
                print(f"[AcrisParties] attempt {i} {r.status_code} retry {backoff:.1f}s"); time.sleep(backoff); backoff*=2; continue
            raise requests.HTTPError(f"{r.status_code} {r.reason}: {r.text[:300]}")
        return []
    def _discover(self)->Set[str]:
        if self._avail is not None: return self._avail
        d=self._req({"$limit":1}); self._avail=set(d[0].keys()) if d else set()
        print(f"[AcrisParties] fields: {sorted(self._avail)}"); return self._avail
    def _resolve(self)->Dict[str,Optional[str]]:
        if self._res is not None: return self._res
        a=self._discover(); self._res={k:next((c for c in v if c in a),None) for k,v in self.FIELD_CANDIDATES.items()}
        print(f"[AcrisParties] map: {self._res}"); return self._res

    def fetch(self, limit:int=5000, offset:int=0)->List[Dict[str,Any]]:
        a=self._discover()
        sel=",".join([c for c in self.DEFAULT_SELECT if c in a]) or None
        params={"$limit":limit,"$offset":offset};
        if sel: params["$select"]=sel
        print(f"[AcrisParties] params: {params}")
        try: data=self._req(params)
        except Exception as e: print(f"[AcrisParties] Fetch failed: {e}"); return []
        res=self._resolve(); g=lambda n: (res.get(n) if res.get(n) in a else None)
        out=[]
        for d in data:
            doc=d.get(g("document_id"));
            if not doc: continue
            out.append({
                "document_id": doc,
                "party_type": d.get(g("party_type")),
                "name": d.get(g("name")),
                "address1": d.get(g("address1")),
                "city": d.get(g("city")),
                "state": d.get(g("state")),
                "zip": d.get(g("zip")),
            })
        print(f"[AcrisParties] fetched {len(out)}")
        return out

    def load(self, rows: List[Dict[str,Any]])->None:
        if not rows: print("[AcrisParties] No data"); return
        with PostgresClient() as db:
            try:
                c=db.bulk_insert(self.TABLE_NAME,self.COLUMNS,rows,conflict_target=self.CONFLICT_TARGET)
                print(f"[AcrisParties] Inserted {c}")
            except DatabaseError as e:
                print(f"[AcrisParties] Insert failed: {e}"); raise
