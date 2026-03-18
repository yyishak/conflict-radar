"""
Sentinel Hub – Satellite Earth Observation Fetcher
===================================================
Queries Sentinel-2 data over Ethiopia via the Sentinel Hub Process API (OAuth2).

Detects:
  • Burn scars   — Normalised Burn Ratio (NBR) < -0.25
  • Active fires — SWIR reflectance spike (B12 > 0.25, B8A low)
  • Flooding     — Modified NDWI > 0.3 in unexpected areas

Each confirmed anomaly is stored as a Supabase event with:
  source   = "Sentinel Hub"
  type     = "Satellite Detection"
  category = "Satellite"

Credentials required (backend/antigravity/.env):
  SENTINEL_HUB_CLIENT_ID
  SENTINEL_HUB_CLIENT_SECRET
"""

import os
import requests
from datetime import datetime, timedelta

from backend.antigravity.fetcher.db import store_event

# ── Config ────────────────────────────────────────────────────────────────────
CLIENT_ID     = os.environ.get("SENTINEL_HUB_CLIENT_ID")
CLIENT_SECRET = os.environ.get("SENTINEL_HUB_CLIENT_SECRET")

TOKEN_URL   = "https://services.sentinel-hub.com/oauth/token"
PROCESS_URL = "https://services.sentinel-hub.com/api/v1/statistics"

# Ethiopia bounding box [W, S, E, N]
ETHIOPIA_BBOX = [33.0, 3.4, 47.9, 14.9]

# Sub-regions to query individually so we get rough location names
REGIONS = [
    {"name": "Tigray",        "bbox": [36.5, 12.5, 40.5, 14.9]},
    {"name": "Afar",          "bbox": [39.5, 9.5, 42.5, 13.5]},
    {"name": "Amhara",        "bbox": [36.0, 10.0, 40.5, 13.0]},
    {"name": "Oromia (North)","bbox": [36.5,  7.5, 40.5, 10.5]},
    {"name": "Oromia (South)","bbox": [37.0,  4.0, 42.0,  8.0]},
    {"name": "Somali Region", "bbox": [42.0,  4.5, 47.9, 10.0]},
    {"name": "SNNP",          "bbox": [34.5,  4.5, 38.5,  8.0]},
    {"name": "Benishangul",   "bbox": [33.5,  9.0, 37.0, 12.5]},
]

# Evalscript: returns per-pixel stats for fire / burn / flood signals
EVALSCRIPT = """
//VERSION=3
function setup() {
  return {
    input: [{
      bands: ["B04", "B08", "B8A", "B11", "B12", "SCL"],
      units: "REFLECTANCE"
    }],
    output: [
      { id: "fire_score",  bands: 1, sampleType: "FLOAT32" },
      { id: "burn_score",  bands: 1, sampleType: "FLOAT32" },
      { id: "flood_score", bands: 1, sampleType: "FLOAT32" }
    ]
  };
}
function evaluatePixel(s) {
  // Skip cloud/shadow pixels (SCL classes 3,8,9,10)
  if ([3,8,9,10].includes(s.SCL)) return [0, 0, 0];

  let nbr   = (s.B08 - s.B12) / (s.B08 + s.B12 + 1e-6);
  let mndwi = (s.B04 - s.B11) / (s.B04 + s.B11 + 1e-6);

  let fire  = (s.B12 > 0.20 && s.B8A < 0.10) ? 1.0 : 0.0;
  let burn  = (nbr < -0.25) ? Math.min(1.0, Math.abs(nbr + 0.25) * 4) : 0.0;
  let flood = (mndwi > 0.30) ? Math.min(1.0, (mndwi - 0.30) * 5) : 0.0;

  return [fire, burn, flood];
}
"""


def _get_token() -> str | None:
    """Fetch OAuth2 bearer token from Sentinel Hub."""
    if not CLIENT_ID or not CLIENT_SECRET:
        return None
    try:
        resp = requests.post(
            TOKEN_URL,
            data={
                "grant_type":    "client_credentials",
                "client_id":     CLIENT_ID,
                "client_secret": CLIENT_SECRET,
            },
            timeout=15,
        )
        resp.raise_for_status()
        return resp.json().get("access_token")
    except Exception as e:
        print(f"Sentinel Hub auth error: {e}")
        return None


def _query_region(token: str, region: dict, start: str, end: str) -> dict | None:
    """
    Run statistical aggregation for a single region.
    Returns mean values for fire / burn / flood scores.
    """
    w, s, e, n = region["bbox"]
    payload = {
        "input": {
            "bounds": {
                "bbox": [w, s, e, n],
                "properties": {"crs": "http://www.opengis.net/def/crs/EPSG/0/4326"},
            },
            "data": [{
                "type": "sentinel-2-l2a",
                "dataFilter": {
                    "timeRange": {"from": f"{start}T00:00:00Z", "to": f"{end}T23:59:59Z"},
                    "maxCloudCoverage": 40,
                },
            }],
        },
        "aggregation": {
            "timeRange": {"from": f"{start}T00:00:00Z", "to": f"{end}T23:59:59Z"},
            "aggregationInterval": {"of": "P7D"},
            "evalscript": EVALSCRIPT,
            "resx": 0.01,
            "resy": 0.01,
        },
        "calculations": {
            "fire":  {"histograms": {}, "statistics": {"default": {"percentiles": {}}}},
            "burn":  {"histograms": {}, "statistics": {"default": {"percentiles": {}}}},
            "flood": {"histograms": {}, "statistics": {"default": {"percentiles": {}}}},
        },
    }

    try:
        resp = requests.post(
            PROCESS_URL,
            json=payload,
            headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
            timeout=30,
        )
        if resp.status_code == 429:
            print(f"Sentinel Hub rate limited for region {region['name']}")
            return None
        resp.raise_for_status()
        return resp.json()
    except Exception as e:
        print(f"Sentinel Hub query error ({region['name']}): {e}")
        return None


def _mean_score(result: dict, output_id: str) -> float:
    """Extract mean score from the statistical response."""
    try:
        data = result.get("data", [])
        if not data:
            return 0.0
        outputs = data[0].get("outputs", {})
        bands   = outputs.get(output_id, {}).get("bands", {})
        band0   = bands.get("B0", {})
        stats   = band0.get("stats", {})
        return float(stats.get("mean", 0.0))
    except Exception:
        return 0.0


def _region_center(bbox: list) -> tuple[float, float]:
    """Return (lat, lng) centre of a bounding box."""
    w, s, e, n = bbox
    return (s + n) / 2, (w + e) / 2


def fetch_sentinel_ethiopia_observations():
    """
    Main entry point — detects burn scars, active fires and flooding
    across Ethiopian administrative regions using Sentinel-2 data.
    """
    if not CLIENT_ID or not CLIENT_SECRET:
        print("Sentinel Hub: SENTINEL_HUB_CLIENT_ID / SENTINEL_HUB_CLIENT_SECRET not set — skipping.")
        return

    token = _get_token()
    if not token:
        print("Sentinel Hub: could not obtain access token — skipping.")
        return

    end_date   = datetime.utcnow()
    start_date = end_date - timedelta(days=7)
    start_str  = start_date.strftime("%Y-%m-%d")
    end_str    = end_date.strftime("%Y-%m-%d")

    stored = 0

    for region in REGIONS:
        result = _query_region(token, region, start_str, end_str)
        if not result:
            continue

        fire_score  = _mean_score(result, "fire")
        burn_score  = _mean_score(result, "burn")
        flood_score = _mean_score(result, "flood")

        lat, lng = _region_center(region["bbox"])
        name     = region["name"]

        # Fire detection threshold
        if fire_score > 0.02:
            severity = "CRITICAL" if fire_score > 0.10 else "HIGH" if fire_score > 0.05 else "ELEVATED"
            store_event({
                "source":      "Sentinel Hub",
                "type":        "Satellite Detection – Active Fire",
                "location":    name,
                "description": (
                    f"Sentinel-2 detected active fire signature in {name}, Ethiopia "
                    f"(fire index: {fire_score:.3f}, {start_str} – {end_str}). "
                    f"Severity: {severity}."
                ),
                "risk_level":  5 if fire_score > 0.10 else 4,
                "latitude":    lat,
                "longitude":   lng,
                "metadata": {
                    "fire_score":  fire_score,
                    "burn_score":  burn_score,
                    "flood_score": flood_score,
                    "region":      name,
                    "period":      f"{start_str}/{end_str}",
                    "sentinel_product": "S2L2A",
                },
            })
            stored += 1

        # Burn scar detection threshold
        if burn_score > 0.03:
            severity = "HIGH" if burn_score > 0.10 else "ELEVATED"
            store_event({
                "source":      "Sentinel Hub",
                "type":        "Satellite Detection – Burn Scar",
                "location":    name,
                "description": (
                    f"Sentinel-2 identified burn scars in {name}, Ethiopia "
                    f"(NBR anomaly index: {burn_score:.3f}, {start_str} – {end_str}). "
                    f"May indicate post-fire or post-conflict land damage. Severity: {severity}."
                ),
                "risk_level":  4 if burn_score > 0.10 else 3,
                "latitude":    lat,
                "longitude":   lng,
                "metadata": {
                    "fire_score":  fire_score,
                    "burn_score":  burn_score,
                    "flood_score": flood_score,
                    "region":      name,
                    "period":      f"{start_str}/{end_str}",
                    "sentinel_product": "S2L2A",
                },
            })
            stored += 1

        # Flooding detection threshold
        if flood_score > 0.04:
            store_event({
                "source":      "Sentinel Hub",
                "type":        "Satellite Detection – Flooding",
                "location":    name,
                "description": (
                    f"Sentinel-2 flood signal detected in {name}, Ethiopia "
                    f"(MNDWI index: {flood_score:.3f}, {start_str} – {end_str}). "
                    f"Potential displacement risk."
                ),
                "risk_level":  4,
                "latitude":    lat,
                "longitude":   lng,
                "metadata": {
                    "fire_score":  fire_score,
                    "burn_score":  burn_score,
                    "flood_score": flood_score,
                    "region":      name,
                    "period":      f"{start_str}/{end_str}",
                    "sentinel_product": "S2L2A",
                },
            })
            stored += 1

    print(f"Sentinel Hub: stored {stored} satellite observation event(s) over Ethiopia.")


if __name__ == "__main__":
    fetch_sentinel_ethiopia_observations()
