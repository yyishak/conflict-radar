import requests
import os
from backend.antigravity.fetcher.db import store_event
from backend.antigravity.fetcher.processor import calculate_risk_level

ACLED_API_URL = "https://api.acleddata.com/acled/read"
# Note: For free research account, you might need an email and key
ACLED_EMAIL = os.environ.get("ACLED_EMAIL")
ACLED_KEY = os.environ.get("ACLED_KEY")

def fetch_acled_ethiopia():
    """
    Fetch recent conflict events in Ethiopia from ACLED.
    """
    if not ACLED_EMAIL or not ACLED_KEY:
        print("ACLED credentials missing. Skipping...")
        return
    
    params = {
        "email": ACLED_EMAIL,
        "key": ACLED_KEY,
        "limit": 100
    }
    
    try:
        response = requests.get(ACLED_API_URL, params=params)
        response.raise_for_status()
        data = response.json()
        
        events = data.get("data", [])
        for event in events:
            # Normalize and store
            event_type = event.get("event_type")
            risk = calculate_risk_level(event_type)
            
            payload = {
                "source": "ACLED",
                "type": event_type,
                "location": f"{event.get('admin1')}, {event.get('location')}",
                "description": event.get("notes"),
                "risk_level": risk,
                "latitude": float(event.get("latitude")),
                "longitude": float(event.get("longitude")),
                "metadata": event
            }
            store_event(payload)
            
        print(f"Stored {len(events)} ACLED events.")
    except Exception as e:
        print(f"Error fetching ACLED data: {e}")

if __name__ == "__main__":
    fetch_acled_ethiopia()
