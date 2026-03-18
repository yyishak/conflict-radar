"""
NASA EONET (Earth Observatory Natural Event Tracker) — active natural events.
No API key required.
Fetches open/recent events and filters to Horn of Africa bounding box.
API docs: https://eonet.gsfc.nasa.gov/docs/v3
"""

import requests
from backend.antigravity.fetcher.db import store_event

API_URL = "https://eonet.gsfc.nasa.gov/api/v3/events"

# Horn of Africa / Ethiopia bounding box
LAT_MIN, LAT_MAX = 3.0,  18.0
LON_MIN, LON_MAX = 33.0, 50.0

# EONET category → our event type string (drives classifyEvent)
CATEGORY_TYPE_MAP = {
    "Wildfires":            "Wildfire",
    "Floods":               "Flood",
    "Severe Storms":        "Severe Storm",
    "Earthquakes":          "Earthquake",
    "Volcanoes":            "Volcano",
    "Drought":              "Drought",
    "Dust and Haze":        "Dust Storm",
    "Landslides":           "Landslide",
    "Sea and Lake Ice":     "Natural Hazard",
    "Snow":                 "Natural Hazard",
    "Temperature Extremes": "Extreme Heat",
    "Water Color":          "Natural Hazard",
    "Manmade":              "Natural Hazard",
}

RISK_MAP = {
    "Wildfire":    4,
    "Flood":       4,
    "Earthquake":  4,
    "Volcano":     5,
    "Severe Storm": 3,
    "Drought":     3,
    "Extreme Heat": 2,
}


def _in_bbox(lat: float, lng: float) -> bool:
    return LAT_MIN <= lat <= LAT_MAX and LON_MIN <= lng <= LON_MAX


def fetch_eonet_events():
    print("Fetching NASA EONET natural events...")
    try:
        params = {
            "status": "open",   # only active events
            "days":   60,       # look back 60 days for slower-moving events
            "limit":  300,
        }
        resp = requests.get(API_URL, params=params, timeout=15)
        resp.raise_for_status()
        data = resp.json()

        events = data.get("events", [])
        print(f"  EONET returned {len(events)} active global events.")

        stored = 0
        for ev in events:
            title       = ev.get("title", "Natural Event")
            categories  = [c.get("title", "") for c in ev.get("categories", [])]
            cat_title   = categories[0] if categories else "Manmade"
            event_type  = CATEGORY_TYPE_MAP.get(cat_title, "Natural Hazard")
            risk        = RISK_MAP.get(event_type, 2)

            # Each event may have multiple geometry points (track over time)
            # We take the most recent coordinate
            geometries = ev.get("geometry", [])
            if not geometries:
                continue

            # Sort by date descending and take latest
            geo = sorted(
                geometries,
                key=lambda g: g.get("date", ""),
                reverse=True,
            )[0]

            coords = geo.get("coordinates")
            if not coords:
                continue

            # Coordinates can be a point [lng, lat] or polygon [[lng,lat],...]
            if isinstance(coords[0], list):
                lng, lat = coords[0][0], coords[0][1]
            else:
                lng, lat = coords[0], coords[1]

            # Filter to Horn of Africa region
            if not _in_bbox(lat, lng):
                continue

            link = ev.get("sources", [{}])[0].get("url", "")
            occurred_at = geo.get("date", "")

            payload = {
                "source":      "NASA EONET",
                "type":        event_type,
                "location":    title,
                "description": f"{cat_title} event: {title}.",
                "risk_level":  risk,
                "latitude":    lat,
                "longitude":   lng,
                "metadata": {
                    "eonet_id":    ev.get("id"),
                    "category":    cat_title,
                    "link":        link,
                    "occurred_at": occurred_at,
                },
            }
            store_event(payload)
            stored += 1

        print(f"  Stored {stored} EONET events in region.")
    except Exception as exc:
        print(f"  NASA EONET fetch error: {exc}")
