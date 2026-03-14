import time
import schedule
from backend.antigravity.fetcher.sources.acled import fetch_acled_ethiopia
from backend.antigravity.fetcher.sources.hdx import fetch_hdx_ethiopia_datasets
from backend.antigravity.fetcher.sources.gdacs import fetch_gdacs_ethiopia
from backend.antigravity.fetcher.sources.reliefweb import fetch_reliefweb_ethiopia
from backend.antigravity.fetcher.sources.indicators import fetch_indicators
from backend.antigravity.fetcher.sources.currency import fetch_currency_rates
from backend.antigravity.fetcher.sources.scraper import fetch_ground_truth
from backend.antigravity.fetcher.sentiment import process_latest_sentiment
from backend.antigravity.fetcher.briefing import generate_situational_briefing

def run_all_fetchers():
    print(f"--- Starting Data Aggregation Pulse: {time.ctime()} ---")
    
    # Conflict Data
    fetch_acled_ethiopia()
    fetch_hdx_ethiopia_datasets()
    
    # Natural Hazards
    fetch_gdacs_ethiopia()
    fetch_reliefweb_ethiopia()
    
    # News, Scrapers & Sentiment
    fetch_ethiopia_news()
    fetch_gdelt_vibe()
    fetch_ground_truth()
    process_latest_sentiment()
    generate_situational_briefing()
    
    # Social Indicators
    fetch_indicators()
    
    # Currency
    fetch_currency_rates()
    
    print(f"--- Completed Data Aggregation Pulse: {time.ctime()} ---")

import sys

def main():
    # Check for --single-run flag
    single_run = "--single-run" in sys.argv
    
    if single_run:
        print("Running in single-run mode...")
        run_all_fetchers()
        return

    # Initial run
    run_all_fetchers()
    
    # Schedule every 6 hours
    schedule.every(6).hours.do(run_all_fetchers)
    
    print("Fetcher service is running and scheduled every 6 hours.")
    
    while True:
        schedule.run_pending()
        time.sleep(60)

if __name__ == "__main__":
    main()
