"""
ACLED conflict data fetcher — updated for September 2025 auth system.

ACLED phased out static API keys. Authentication is now cookie-based:
  1. POST to /user/login?_format=json  → get session cookie
  2. GET  /api/acled/read              → pass that cookie with request

Required env vars:
  ACLED_EMAIL     — your myACLED account email
  ACLED_PASSWORD  — your myACLED account password
"""

import os
import requests
from backend.antigravity.fetcher.db import store_event
from backend.antigravity.fetcher.processor import calculate_risk_level

LOGIN_URL    = "https://acleddata.com/user/login?_format=json"
API_URL      = "https://acleddata.com/api/acled/read"

ACLED_EMAIL    = os.environ.get("ACLED_EMAIL")
ACLED_PASSWORD = os.environ.get("ACLED_PASSWORD")


def _get_session() -> requests.Session | None:
    """
    Log in to myACLED and return an authenticated session.
    Returns None on failure.
    """
    if not ACLED_EMAIL or not ACLED_PASSWORD:
        print("  ACLED_EMAIL / ACLED_PASSWORD missing — skipping ACLED fetch.")
        return None

    session = requests.Session()
    session.headers.update({
        "Content-Type": "application/json",
        "User-Agent":   "ConflictRadar/1.0",
    })

    try:
        resp = session.post(
            LOGIN_URL,
            json={"name": ACLED_EMAIL, "pass": ACLED_PASSWORD},
            timeout=20,
        )
        if resp.status_code == 200:
            print("  ACLED login successful.")
            return session
        else:
            print(f"  ACLED login failed ({resp.status_code}): {resp.text[:200]}")
            return None
    except Exception as exc:
        print(f"  ACLED login error: {exc}")
        return None


def fetch_acled_ethiopia():
    """Fetch latest conflict events in Ethiopia and store to Supabase."""
    print("Fetching ACLED Ethiopia conflict events...")

    session = _get_session()
    if session is None:
        return

    params = {
        "country": "Ethiopia",
        "limit":   200,
        "fields":  (
            "event_type|sub_event_type|actor1|location"
            "|admin1|admin2|latitude|longitude|notes|fatalities|event_date"
        ),
        "order":   "event_date",
        "sort":    "desc",
    }

    try:
        resp = session.get(API_URL, params=params, timeout=30)
        resp.raise_for_status()
        data = resp.json()
    except Exception as exc:
        print(f"  ACLED data fetch error: {exc}")
        return

    events = data.get("data", [])
    print(f"  ACLED returned {len(events)} events.")
    stored = 0

    for event in events:
        event_type = event.get("event_type", "Unknown")
        risk = calculate_risk_level(event_type.lower().replace(" ", "_"))

        try:
            lat = float(event.get("latitude") or 0)
            lng = float(event.get("longitude") or 0)
        except (TypeError, ValueError):
            lat, lng = 9.145, 40.489  # Ethiopia centroid fallback

        # Build a readable location string
        admin = event.get("admin1") or ""
        loc   = event.get("location") or "Ethiopia"
        full_loc = f"{admin}, {loc}".strip(", ") or "Ethiopia"

        payload = {
            "source":      "ACLED",
            "type":        event_type,
            "location":    full_loc,
            "description": (event.get("notes") or "")[:500],
            "risk_level":  risk,
            "latitude":    lat,
            "longitude":   lng,
            "metadata": {
                "actor1":      event.get("actor1"),
                "sub_event":   event.get("sub_event_type"),
                "fatalities":  event.get("fatalities"),
                "admin2":      event.get("admin2"),
                "event_date":  event.get("event_date"),
            },
        }
        store_event(payload)
        stored += 1

    print(f"  ACLED: stored {stored} Ethiopia events.")


if __name__ == "__main__":
    fetch_acled_ethiopia()
