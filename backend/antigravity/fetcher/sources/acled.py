import os
import requests
from backend.antigravity.fetcher.db import store_event
from backend.antigravity.fetcher.processor import calculate_risk_level

ACLED_API_URL = "https://api.acleddata.com/acled/read"
ACLED_EMAIL   = os.environ.get("ACLED_EMAIL")
ACLED_KEY     = os.environ.get("ACLED_KEY")


def fetch_acled_ethiopia():
    """
    Fetch the latest conflict events in Ethiopia from ACLED.
    Requires a free ACLED research account.
    """
    if not ACLED_EMAIL or not ACLED_KEY:
        print("ACLED_EMAIL / ACLED_KEY missing — skipping ACLED fetch.")
        return

    params = {
        "email":   ACLED_EMAIL,
        "key":     ACLED_KEY,
        "country": "Ethiopia",   # ← was missing — previously fetched ALL countries
        "limit":   100,
        "fields":  "event_type|sub_event_type|actor1|location|admin1|admin2|latitude|longitude|notes|fatalities",
    }

    try:
        response = requests.get(ACLED_API_URL, params=params, timeout=30)
        response.raise_for_status()
        data = response.json()

        events = data.get("data", [])
        stored = 0

        for event in events:
            event_type = event.get("event_type", "Unknown")
            risk = calculate_risk_level(event_type.lower().replace(" ", "_"))

            lat_raw = event.get("latitude")
            lng_raw = event.get("longitude")

            try:
                lat = float(lat_raw)
                lng = float(lng_raw)
            except (TypeError, ValueError):
                lat, lng = 9.145, 40.489  # Default: Ethiopia centroid

            admin = event.get("admin1") or ""
            loc   = event.get("location") or "Ethiopia"
            full_loc = f"{admin}, {loc}".strip(", ") or "Ethiopia"

            payload = {
                "source":      "ACLED",
                "type":        event_type,
                "location":    full_loc,
                "description": event.get("notes", "")[:500],
                "risk_level":  risk,
                "latitude":    lat,
                "longitude":   lng,
                "metadata": {
                    "actor1":      event.get("actor1"),
                    "sub_event":   event.get("sub_event_type"),
                    "fatalities":  event.get("fatalities"),
                    "admin2":      event.get("admin2"),
                },
            }
            store_event(payload)
            stored += 1

        print(f"ACLED: stored {stored} Ethiopia events.")

    except Exception as e:
        print(f"Error fetching ACLED data: {e}")


if __name__ == "__main__":
    fetch_acled_ethiopia()
