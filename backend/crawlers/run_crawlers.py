# crawlers/run_crawlers.py
import time
from crawlers.registration_crawler import RegistrationCrawler
from crawlers.complaint_crawler import ComplaintCrawler
from crawlers.violation_crawler import ViolationCrawler
from crawlers.registration_contact_crawler import RegistrationContactCrawler
from crawlers.affordable_housing_crawler import AffordableHousingCrawler
from crawlers.acris_master_crawler import AcrisMasterCrawler
from crawlers.acris_legals_crawler import AcrisLegalsCrawler
from crawlers.acris_parties_crawler import AcrisPartiesCrawler
from crawlers.eviction_crawler import EvictionCrawler


def run_crawler(crawler, limit=5000):
    offset = 0
    total = 0
    name = crawler.__class__.__name__

    while True:
        print(f"\n[{name}] Fetching batch offset={offset} ...")
        rows = crawler.fetch(limit=limit, offset=offset)
        if not rows:
            print(f"[{name}] No more data. Stopping.")
            break

        crawler.load(rows)
        total += len(rows)
        offset += limit
        time.sleep(1)

    print(f"[{name}] Completed. Total inserted: {total} rows.")


def main():
    print("=== [Runner] Starting all crawlers ===")

    crawlers = [
        RegistrationCrawler(),
        RegistrationContactCrawler(),
        EvictionCrawler(),
        AffordableHousingCrawler(),
        AcrisMasterCrawler(),
        AcrisLegalsCrawler(),
        AcrisPartiesCrawler(),
        ComplaintCrawler(),
        ViolationCrawler(),
    ]

    for crawler in crawlers:
        try:
            run_crawler(crawler)
        except Exception as e:
            print(f"[Runner] {crawler.__class__.__name__} failed: {e}")

    print("\n=== [Runner] All crawlers completed ===")


if __name__ == "__main__":
    main()
