# crawlers/rent_stabilized_loader.py
import json
import csv
import os
from typing import Any, Dict, List
from pathlib import Path

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from infrastructures.postgres.postgres_client import PostgresClient
from common.interfaces.data_crawler import DataCrawler
from common.exceptions.db_error import DatabaseError


class RentStabilizedLoader(DataCrawler):
    """
    Loader for rent-stabilized building data from local CSV/JSON files.
    Follows the same pattern as existing crawlers but loads from local files.
    """
    
    TABLE_NAME = "building_rent_stabilized_list"
    CONFLICT_TARGET = ["source_year", "bbl"]  # Composite primary key
    
    COLUMNS = [
        "bbl",
        "borough", 
        "block",
        "lot",
        "zip",
        "city",
        "status",
        "source_year"
    ]
    
    def __init__(self, data_file_path: str = None):
        """
        Initialize the loader with path to data file.
        
        Args:
            data_file_path: Path to CSV or JSON file. If None, uses default path.
        """
        if data_file_path is None:
            # Default path relative to project root
            project_root = Path(__file__).resolve().parent.parent.parent
            self.data_file_path = project_root / "data" / "rent_stabilized_all_boroughs.json"
        else:
            self.data_file_path = Path(data_file_path)
            
        if not self.data_file_path.exists():
            raise FileNotFoundError(f"Data file not found: {self.data_file_path}")
    
    def fetch(self, limit: int = None, offset: int = 0) -> List[Dict[str, Any]]:
        """
        Load data from local file (CSV or JSON).
        
        Args:
            limit: Maximum number of records to load (None = all)
            offset: Number of records to skip (for pagination)
            
        Returns:
            List of dictionaries containing rent-stabilized building data
        """
        print(f"[RentStabilizedLoader] Loading data from: {self.data_file_path}")
        
        if self.data_file_path.suffix.lower() == '.json':
            return self._load_from_json(limit, offset)
        elif self.data_file_path.suffix.lower() == '.csv':
            return self._load_from_csv(limit, offset)
        else:
            raise ValueError(f"Unsupported file format: {self.data_file_path.suffix}")
    
    def _load_from_json(self, limit: int = None, offset: int = 0) -> List[Dict[str, Any]]:
        """Load data from JSON file."""
        with open(self.data_file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        # Apply offset and limit
        if offset > 0:
            data = data[offset:]
        if limit is not None:
            data = data[:limit]
            
        # Ensure all required fields are present and properly typed
        processed_data = []
        for record in data:
            processed_record = self._process_record(record)
            if processed_record:
                processed_data.append(processed_record)
        
        print(f"[RentStabilizedLoader] Loaded {len(processed_data)} records from JSON")
        return processed_data
    
    def _load_from_csv(self, limit: int = None, offset: int = 0) -> List[Dict[str, Any]]:
        """Load data from CSV file."""
        processed_data = []
        current_offset = 0
        
        with open(self.data_file_path, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            
            for record in reader:
                # Apply offset
                if current_offset < offset:
                    current_offset += 1
                    continue
                
                # Apply limit
                if limit is not None and len(processed_data) >= limit:
                    break
                
                processed_record = self._process_record(record)
                if processed_record:
                    processed_data.append(processed_record)
        
        print(f"[RentStabilizedLoader] Loaded {len(processed_data)} records from CSV")
        return processed_data
    
    def _process_record(self, record: Dict[str, Any]) -> Dict[str, Any]:
        """
        Process and validate a single record.
        
        Args:
            record: Raw record from file
            
        Returns:
            Processed record with proper types, or None if invalid
        """
        try:
            processed = {}
            
            # BBL is required
            bbl = str(record.get('bbl', '')).strip()
            if not bbl or len(bbl) != 10:
                print(f"[RentStabilizedLoader] Invalid BBL: {bbl}")
                return None
            processed['bbl'] = bbl
            
            # Borough (optional)
            borough = record.get('borough', '').strip().upper()
            processed['borough'] = borough if borough else None
            
            # Block (optional, convert to int)
            block = record.get('block', '')
            if block and str(block).strip():
                try:
                    processed['block'] = int(block)
                except (ValueError, TypeError):
                    processed['block'] = None
            else:
                processed['block'] = None
            
            # Lot (optional, convert to int)
            lot = record.get('lot', '')
            if lot and str(lot).strip():
                try:
                    processed['lot'] = int(lot)
                except (ValueError, TypeError):
                    processed['lot'] = None
            else:
                processed['lot'] = None
            
            # ZIP (optional)
            zip_code = str(record.get('zip', '')).strip()
            processed['zip'] = zip_code if zip_code else None
            
            # City (optional)
            city = record.get('city', '').strip().upper()
            processed['city'] = city if city else None
            
            # Status (optional)
            status = record.get('status', '').strip().upper()
            processed['status'] = status if status else None
            
            # Source year (optional, convert to int)
            source_year = record.get('source_year', '')
            if source_year and str(source_year).strip():
                try:
                    processed['source_year'] = int(source_year)
                except (ValueError, TypeError):
                    processed['source_year'] = None
            else:
                processed['source_year'] = None
            
            return processed
            
        except Exception as e:
            print(f"[RentStabilizedLoader] Error processing record {record}: {e}")
            return None
    
    def load(self, rows: List[Dict[str, Any]]) -> None:
        """
        Load processed data into the database.
        
        Args:
            rows: List of processed records to insert
        """
        if not rows:
            print(f"[{self.__class__.__name__}] No data to insert.")
            return
        
        # Remove duplicates within the batch (keep last occurrence)
        # Use composite key (source_year, bbl) for deduplication
        seen_keys = set()
        deduplicated_rows = []
        for row in rows:
            bbl = row.get('bbl')
            source_year = row.get('source_year')
            key = (source_year, bbl) if bbl and source_year else None
            
            if key and key not in seen_keys:
                seen_keys.add(key)
                deduplicated_rows.append(row)
        
        if len(deduplicated_rows) != len(rows):
            print(f"[{self.__class__.__name__}] Removed {len(rows) - len(deduplicated_rows)} duplicate (year, bbl) combinations from batch")
            
        with PostgresClient() as db:
            try:
                conflict_target = getattr(self, "CONFLICT_TARGET", None)
                count = db.bulk_insert(
                    self.TABLE_NAME, 
                    self.COLUMNS, 
                    deduplicated_rows, 
                    conflict_target=conflict_target,
                    do_update=True  # Update existing records
                )
                print(f"[{self.__class__.__name__}] Inserted {count} rows into {self.TABLE_NAME}.")
            except DatabaseError as e:
                print(f"[{self.__class__.__name__}] Insert failed: {e}")
                raise
    
    def load_all(self, batch_size: int = 1000) -> int:
        """
        Load all data from the file in batches.
        
        Args:
            batch_size: Number of records to process in each batch
            
        Returns:
            Total number of records loaded
        """
        print(f"[RentStabilizedLoader] Starting to load all data from {self.data_file_path}")
        print(f"[RentStabilizedLoader] Batch size: {batch_size}")
        
        total_loaded = 0
        offset = 0
        
        while True:
            # Fetch a batch
            batch = self.fetch(limit=batch_size, offset=offset)
            if not batch:
                print(f"[RentStabilizedLoader] No more data. Stopping.")
                break
            
            # Load the batch
            self.load(batch)
            total_loaded += len(batch)
            offset += batch_size
            
            print(f"[RentStabilizedLoader] Progress: {total_loaded} records loaded")
        
        print(f"[RentStabilizedLoader] Completed. Total loaded: {total_loaded} records.")
        return total_loaded


def main():
    """Main function to run the rent-stabilized data loader."""
    print("=== [RentStabilizedLoader] Starting data load ===")
    
    try:
        # Initialize loader
        loader = RentStabilizedLoader()
        
        # Load all data
        total_loaded = loader.load_all(batch_size=1000)
        
        print(f"\n=== [RentStabilizedLoader] Successfully loaded {total_loaded} records ===")
        
    except Exception as e:
        print(f"[RentStabilizedLoader] Failed: {e}")
        raise


if __name__ == "__main__":
    main()
