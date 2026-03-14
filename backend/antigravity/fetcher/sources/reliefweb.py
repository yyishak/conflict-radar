import requests
from backend.antigravity.fetcher.db import store_event
from backend.antigravity.fetcher.processor import calculate_risk_level

RELIEFWEB_API_URL = "https://api.reliefweb.int/v1/reports"

def fetch_reliefweb_ethiopia():
    """
    Fetch official reports on droughts, floods, and displacement from ReliefWeb.
    """
    params = {
        "appname": "Antigravity",
        "limit": 20,
        "profile": "full"
    }
    
    try:
        response = requests.get(RELIEFWEB_API_URL, params=params)
        response.raise_for_status()
        data = response.json()
        
        reports = data.get("data", [])
        for report in reports:
            fields = report.get("fields", {})
            title = fields.get("title")
            
            # Simple keyword matching for risk categorization
            category = "news_tension"
            if "flood" in title.lower(): category = "hazard_flood"
            elif "drought" in title.lower(): category = "hazard_drought"
            elif "displacement" in title.lower() or "idp" in title.lower(): category = "displacement"
            
            risk = calculate_risk_level(category)
            
            payload = {
                "source": "ReliefWeb",
                "type": "Humanitarian Report",
                "location": "Ethiopia",
                "description": title,
                "risk_level": risk,
                "latitude": 9.145, # Default to Addis Ababa center if no specific loc
                "longitude": 40.489,
                "metadata": fields
            }
            store_event(payload)
            
        print(f"Stored {len(reports)} ReliefWeb reports.")
    except Exception as e:
        print(f"Error fetching ReliefWeb data: {e}")

if __name__ == "__main__":
    fetch_reliefweb_ethiopia()
