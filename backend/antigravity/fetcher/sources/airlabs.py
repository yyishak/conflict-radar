import os
import requests
from backend.antigravity.fetcher.db import store_event
from backend.antigravity.fetcher.processor import calculate_risk_level

AIRLABS_API_KEY = os.environ.get("AIRLABS_API_KEY")
AIRLABS_FLIGHTS_URL = "https://airlabs.co/api/v9/flights"


def fetch_airlabs_flights_snapshot():
    """
    Fetch a snapshot of global flights from AirLabs and log air traffic density.

    Uses the free Flight Tracker API as documented at https://airlabs.co/docs/flights.
    """
    if not AIRLABS_API_KEY:
        print("AIRLABS_API_KEY missing — skipping AirLabs fetch.")
        return

    try:
        resp = requests.get(AIRLABS_FLIGHTS_URL, params={"api_key": AIRLABS_API_KEY, "_view": "object"}, timeout=12)
        resp.raise_for_status()
        data = resp.json()
    except Exception as e:
        print(f"Error fetching AirLabs data: {e}")
        return

    flights = data.get("response") or []
    stored = 0

    for fl in flights:
        lat = fl.get("lat")
        lng = fl.get("lng")
        flag = fl.get("flag")
        flight_icao = fl.get("flight_icao")
        flight_iata = fl.get("flight_iata")
        dep_icao = fl.get("dep_icao")
        arr_icao = fl.get("arr_icao")

        if lat is None or lng is None:
            continue

        # Basic location name: airspace over departure/arrival region if available
        if dep_icao and arr_icao:
            location = f"Air corridor {dep_icao} → {arr_icao}"
        elif arr_icao:
            location = f"Approach to {arr_icao}"
        elif dep_icao:
            location = f"Departure from {dep_icao}"
        else:
            location = f"Airspace ({flag or 'Unknown'})"

        callsign = flight_icao or flight_iata or fl.get("reg_number") or "Flight"

        # Treat dense flight activity as a low-level systemic risk factor
        category = "air_activity"
        risk = calculate_risk_level("news_tension")

        payload = {
            "source": "AirLabs",
            "type": "Air Activity",
            "location": location,
            "description": f"{callsign} in flight via AirLabs snapshot",
            "risk_level": risk,
            "latitude": float(lat),
            "longitude": float(lng),
            "metadata": {
                "hex": fl.get("hex"),
                "reg_number": fl.get("reg_number"),
                "flag": flag,
                "flight_icao": flight_icao,
                "flight_iata": flight_iata,
                "flight_number": fl.get("flight_number"),
                "dep_icao": dep_icao,
                "arr_icao": arr_icao,
                "airline_icao": fl.get("airline_icao"),
                "airline_iata": fl.get("airline_iata"),
                "alt": fl.get("alt"),
                "dir": fl.get("dir"),
                "speed": fl.get("speed"),
                "status": fl.get("status"),
                "updated": fl.get("updated"),
            },
        }

        store_event(payload)
        stored += 1

        # Avoid flooding the map: cap per pulse
        if stored >= 100:
            break

    print(f"AirLabs: stored {stored} flight activity points.")


if __name__ == "__main__":
    fetch_airlabs_flights_snapshot()

