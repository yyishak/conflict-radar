"""
USGS Earthquake Hazards Program — real-time earthquake feed.
No API key required.
Fetches M 3.0+ earthquakes in the Horn of Africa bounding box (last 30 days).
API docs: https://earthquake.usgs.gov/fdsnws/event/1/
"""

import requests
from datetime import datetime, timedelta, timezone
from backend.antigravity.fetcher.db import store_event

# Bounding box: Horn of Africa + wider Ethiopia region
# minlat, maxlat, minlon, maxlon
BBOX = {"minlatitude": 3.0, "maxlatitude": 18.0, "minlongitude": 33.0, "maxlongitude": 50.0}

API_URL = "https://earthquake.usgs.gov/fdsnws/event/1/query"


def fetch_usgs_earthquakes():
    print("Fetching USGS earthquake data...")
    try:
        end_time   = datetime.now(timezone.utc)
        start_time = end_time - timedelta(days=30)

        params = {
            "format":       "geojson",
            "starttime":    start_time.strftime("%Y-%m-%dT%H:%M:%S"),
            "endtime":      end_time.strftime("%Y-%m-%dT%H:%M:%S"),
            "minmagnitude": 3.0,
            **BBOX,
            "orderby":      "time",
            "limit":        200,
        }

        resp = requests.get(API_URL, params=params, timeout=15)
        resp.raise_for_status()
        data = resp.json()

        features = data.get("features", [])
        print(f"  USGS returned {len(features)} earthquakes in region.")

        stored = 0
        for feat in features:
            props = feat.get("properties", {})
            coords = feat.get("geometry", {}).get("coordinates", [None, None, None])
            lng, lat, depth = coords

            if lat is None or lng is None:
                continue

            mag  = props.get("mag", 0) or 0
            place = props.get("place", "Unknown location")
            time_ms = props.get("time", 0)
            time_iso = (
                datetime.fromtimestamp(time_ms / 1000, tz=timezone.utc).isoformat()
                if time_ms else None
            )

            # Risk level scales with magnitude
            risk = max(1, min(5, int(mag - 1)))

            payload = {
                "source":      "USGS",
                "type":        "Earthquake",
                "location":    place,
                "description": f"M{mag:.1f} earthquake — {place}. Depth {depth:.0f} km.",
                "risk_level":  risk,
                "latitude":    lat,
                "longitude":   lng,
                "metadata": {
                    "magnitude":  mag,
                    "depth_km":   depth,
                    "usgs_id":    feat.get("id"),
                    "link":       props.get("url", ""),
                    "occurred_at": time_iso,
                },
            }
            store_event(payload)
            stored += 1

        print(f"  Stored {stored} USGS earthquake events.")
    except Exception as exc:
        print(f"  USGS fetch error: {exc}")
