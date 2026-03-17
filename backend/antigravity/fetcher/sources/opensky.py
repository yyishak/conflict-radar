import os
import requests
from backend.antigravity.fetcher.db import store_event
from backend.antigravity.fetcher.processor import calculate_risk_level

OPEN_SKY_BASE_URL = "https://opensky-network.org/api/states/all"


def fetch_opensky_global_snapshot():
    """
    Fetch a snapshot of global air traffic from OpenSky and log high‑level air activity.

    This is NOT a conflict detector – it simply records aircraft activity as context.
    """
    try:
        resp = requests.get(OPEN_SKY_BASE_URL, timeout=12)
        resp.raise_for_status()
        data = resp.json()
    except Exception as e:
        print(f"Error fetching OpenSky data: {e}")
        return

    states = data.get("states") or []
    stored = 0

    for row in states:
        if not isinstance(row, list) or len(row) < 8:
            continue

        icao24 = row[0]
        callsign = (row[1] or "").strip()
        origin_country = row[2] or "Unknown country"
        longitude = row[5]
        latitude = row[6]
        baro_alt = row[7]

        if latitude is None or longitude is None:
            continue

        # Treat busy airspace as a low‑level tension signal
        category = "air_activity"
        risk = calculate_risk_level(category if category in ("kinetic_conflict", "news_tension") else "news_tension")

        location = f"Airspace over {origin_country}"
        title_callsign = f"{callsign} " if callsign else ""

        payload = {
            "source": "OpenSky",
            "type": "Air Activity",
            "location": location,
            "description": f"{title_callsign}aircraft detected by OpenSky over {origin_country}",
            "risk_level": risk,
            "latitude": float(latitude),
            "longitude": float(longitude),
            "metadata": {
                "icao24": icao24,
                "callsign": callsign or None,
                "origin_country": origin_country,
                "baro_altitude_m": baro_alt,
            },
        }

        store_event(payload)
        stored += 1

        # Keep things reasonable: don't flood Supabase
        if stored >= 100:
            break

    print(f"OpenSky: stored {stored} air activity points.")


if __name__ == "__main__":
    fetch_opensky_global_snapshot()

