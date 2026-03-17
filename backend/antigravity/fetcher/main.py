import time
import sys
import schedule

from backend.antigravity.fetcher.sources.acled      import fetch_acled_ethiopia
from backend.antigravity.fetcher.sources.hdx        import fetch_hdx_ethiopia_datasets
from backend.antigravity.fetcher.sources.gdacs      import fetch_gdacs_ethiopia
from backend.antigravity.fetcher.sources.reliefweb  import fetch_reliefweb_ethiopia
from backend.antigravity.fetcher.sources.news       import fetch_ethiopia_news      # was missing
from backend.antigravity.fetcher.sources.gdelt      import fetch_gdelt_vibe         # was missing
from backend.antigravity.fetcher.sources.indicators import fetch_indicators
from backend.antigravity.fetcher.sources.currency   import fetch_currency_rates
from backend.antigravity.fetcher.sources.scraper    import fetch_ground_truth
from backend.antigravity.fetcher.sources.nyt        import fetch_nyt_world_conflict
from backend.antigravity.fetcher.sources.opensky    import fetch_opensky_global_snapshot
from backend.antigravity.fetcher.sources.airlabs    import fetch_airlabs_flights_snapshot
from backend.antigravity.fetcher.sentiment          import process_latest_sentiment
from backend.antigravity.fetcher.briefing           import generate_situational_briefing


def run_all_fetchers():
    print(f"\n{'='*60}")
    print(f"  DATA AGGREGATION PULSE  —  {time.ctime()}")
    print(f"{'='*60}\n")

    # ── Conflict data ─────────────────────────────────────────
    fetch_acled_ethiopia()
    fetch_hdx_ethiopia_datasets()

    # ── Natural hazards ───────────────────────────────────────
    fetch_gdacs_ethiopia()
    fetch_reliefweb_ethiopia()

    # ── News, scrapers & vibe ─────────────────────────────────
    fetch_ethiopia_news()
    fetch_nyt_world_conflict()
    fetch_gdelt_vibe()
    fetch_ground_truth()

    # ── Air activity (flight radar layers: OpenSky + AirLabs) ─
    fetch_opensky_global_snapshot()
    fetch_airlabs_flights_snapshot()

    # ── AI sentiment + briefing ───────────────────────────────
    process_latest_sentiment()
    generate_situational_briefing()

    # ── Macro indicators ──────────────────────────────────────
    fetch_indicators()

    # ── Currency ──────────────────────────────────────────────
    fetch_currency_rates()

    print(f"\n✓ Pulse complete — {time.ctime()}\n")


def main():
    single_run = "--single-run" in sys.argv

    if single_run:
        print("Running in single-run mode...")
        run_all_fetchers()
        return

    # Initial run on startup
    run_all_fetchers()

    # Then every 6 hours
    schedule.every(6).hours.do(run_all_fetchers)
    print("Fetcher service running — next pulse in 6 hours.")

    while True:
        schedule.run_pending()
        time.sleep(60)


if __name__ == "__main__":
    main()
