from abc import ABC, abstractmethod
from typing import Any, Dict, List


class DataCrawler(ABC):
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/118.0.5993.90 Safari/537.36",
        "Accept": "application/json, text/plain, */*",
        "Accept-Encoding": "gzip, deflate",
        "Connection": "keep-alive",
    }

    @abstractmethod
    def fetch(self) -> List[Dict[str, Any]]:
        pass

    @abstractmethod
    def load(self, rows: List[Dict[str, Any]]) -> None:
        pass
